import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { HttpError } from '../lib/http.js';
import {
  AnalysisUnavailableError,
  eligibility,
  getAnalyzer,
  inputHash,
  keywordMatch,
  type MatchAnalysis,
  type MatchInput,
  type MatchResult,
} from '../lib/match.js';
import { canWithdraw } from '../lib/workflow.js';
import { currentUser } from '../middleware/auth.js';
import { seekerProfileSchema } from '../schemas.js';

// Mounted behind requireRole('SEEKER')
export const seekerRouter = Router();

const jobSummary = {
  select: {
    id: true,
    title: true,
    city: true,
    region: true,
    country: true,
    status: true,
    workType: true,
    company: { select: { id: true, name: true } },
  },
} as const;

seekerRouter.get('/profile', async (req, res) => {
  const userId = currentUser(req).id;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, seekerProfile: true },
  });
  res.json({ name: user.name, email: user.email, ...user.seekerProfile });
});

seekerRouter.put('/profile', async (req, res) => {
  const userId = currentUser(req).id;
  const { name, ...profile } = seekerProfileSchema.parse(req.body);
  const [user, saved] = await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { name }, select: { name: true, email: true } }),
    prisma.seekerProfile.upsert({ where: { userId }, create: { userId, ...profile }, update: profile }),
  ]);
  res.json({ ...user, ...saved });
});

seekerRouter.get('/applications', async (req, res) => {
  const applications = await prisma.application.findMany({
    where: { seekerId: currentUser(req).id },
    orderBy: { createdAt: 'desc' },
    include: { job: jobSummary },
  });
  res.json(applications);
});

seekerRouter.post('/applications/:id/withdraw', async (req, res) => {
  const application = await prisma.application.findFirst({
    where: { id: req.params.id, seekerId: currentUser(req).id },
  });
  if (!application) throw new HttpError(404, 'Application not found');
  if (!canWithdraw(application.status)) throw new HttpError(409, 'This application can no longer be withdrawn');

  const updated = await prisma.application.update({ where: { id: application.id }, data: { status: 'WITHDRAWN' } });
  res.json(updated);
});

seekerRouter.get('/saved', async (req, res) => {
  const saved = await prisma.savedJob.findMany({
    where: { userId: currentUser(req).id },
    orderBy: { createdAt: 'desc' },
    include: { job: jobSummary },
  });
  res.json(saved.map((s) => ({ savedAt: s.createdAt, ...s.job })));
});

const DAY_MS = 24 * 60 * 60 * 1000;
/** Analyses in progress by input hash, so a double click shares one API call */
const inFlight = new Map<string, Promise<MatchAnalysis>>();

/**
 * Fit analysis for one job. Identical input (profile, job and model) returns the cached
 * analysis for free; otherwise Claude is called within the per-seeker and site-wide daily
 * limits, and the keyword matcher answers when it can't be.
 */
seekerRouter.post('/jobs/:id/match', async (req, res) => {
  const userId = currentUser(req).id;
  const [job, profile] = await Promise.all([
    prisma.job.findFirst({ where: { id: req.params.id, status: 'OPEN' } }),
    prisma.seekerProfile.findUnique({ where: { userId } }),
  ]);
  if (!job) throw new HttpError(404, 'Job not found');
  if (!profile || (!profile.skills.length && !profile.resumeText && !profile.about && !profile.headline)) {
    throw new HttpError(400, 'Add your skills or paste your résumé on your profile first');
  }

  const input: MatchInput = {
    profile: {
      headline: profile.headline,
      location: profile.location,
      about: profile.about,
      skills: profile.skills,
      workRights: profile.workRights,
      resumeText: profile.resumeText,
    },
    job: {
      title: job.title,
      description: job.description,
      category: job.category,
      city: job.city,
      region: job.region,
      country: job.country,
      workType: job.workType,
      workplace: job.workplace,
      sponsorship: job.sponsorship,
    },
  };
  const checks = eligibility(input);
  const fallback = (notice: string): MatchResult => ({ ...keywordMatch(input), source: 'keyword', model: null, eligibility: checks, notice });

  const analyzer = getAnalyzer(env.ANTHROPIC_API_KEY, env.MATCH_MODEL);
  if (!analyzer) {
    res.json({ ...fallback('AI matching isn’t configured on this server, so this is a keyword match.'), cached: false });
    return;
  }

  const hash = inputHash(input, analyzer.model);
  const existing = await prisma.jobMatch.findUnique({ where: { userId_jobId_inputHash: { userId, jobId: job.id, inputHash: hash } } });
  if (existing) {
    res.json({ ...(existing.result as unknown as MatchAnalysis), source: 'ai', model: existing.model, eligibility: checks, cached: true });
    return;
  }

  const since = new Date(Date.now() - DAY_MS);
  const [mine, site] = await Promise.all([
    prisma.jobMatch.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.jobMatch.count({ where: { createdAt: { gte: since } } }),
  ]);
  if (mine >= env.MATCH_USER_DAILY_LIMIT) {
    res.json({ ...fallback(`You’ve used today’s ${env.MATCH_USER_DAILY_LIMIT} AI analyses, so this is a keyword match. Results you already have stay available.`), cached: false });
    return;
  }
  if (site >= env.MATCH_SITE_DAILY_LIMIT) {
    res.json({ ...fallback('The demo’s daily AI budget is used up, so this is a keyword match.'), cached: false });
    return;
  }

  let analysis: MatchAnalysis;
  const key = `${userId}:${job.id}:${hash}`;
  let pending = inFlight.get(key);
  if (!pending) {
    pending = analyzer.analyze(input).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  try {
    analysis = await pending;
  } catch (err) {
    if (!(err instanceof AnalysisUnavailableError)) throw err;
    console.warn('job match unavailable:', err.message);
    res.json({ ...fallback('AI analysis is unavailable right now, so this is a keyword match.'), cached: false });
    return;
  }

  try {
    await prisma.jobMatch.create({
      data: { userId, jobId: job.id, inputHash: hash, model: analyzer.model, result: analysis as unknown as Prisma.InputJsonValue },
    });
  } catch (err) {
    // A concurrent request for the same input stored it first; both answers are equally valid
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
  }
  res.json({
    ...analysis,
    source: 'ai',
    model: analyzer.model,
    eligibility: checks,
    cached: false,
    remainingToday: Math.max(0, env.MATCH_USER_DAILY_LIMIT - mine - 1),
  });
});
