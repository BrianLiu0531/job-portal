import { Router, type Request } from 'express';
import { prisma } from '../db.js';
import { HttpError, pageOf } from '../lib/http.js';
import { buildJobOrder, buildJobWhere } from '../lib/search.js';
import { currentUser } from '../middleware/auth.js';
import { applySchema, jobSearchSchema } from '../schemas.js';

// Mounted behind optionalAuth, so req.user is set when a valid session exists
export const jobsRouter = Router();

function seekerId(req: Request): string {
  const user = currentUser(req);
  if (user.role !== 'SEEKER') throw new HttpError(403, 'Only job seekers can do this');
  return user.id;
}

const companySummary = { select: { id: true, name: true, location: true } } as const;

/** Looks up which of the given jobs the seeker has saved or applied to. */
async function seekerFlags(userId: string | undefined, jobIds: string[]) {
  if (!userId || jobIds.length === 0) return { saved: new Set<string>(), applied: new Map<string, string>() };
  const [saved, applications] = await Promise.all([
    prisma.savedJob.findMany({ where: { userId, jobId: { in: jobIds } }, select: { jobId: true } }),
    prisma.application.findMany({
      where: { seekerId: userId, jobId: { in: jobIds } },
      select: { jobId: true, status: true },
    }),
  ]);
  return {
    saved: new Set(saved.map((s) => s.jobId)),
    applied: new Map(applications.map((a) => [a.jobId, a.status as string])),
  };
}

jobsRouter.get('/', async (req, res) => {
  const filters = jobSearchSchema.parse(req.query);
  const where = buildJobWhere(filters);
  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      orderBy: buildJobOrder(filters.sort),
      ...pageOf(filters.page, filters.pageSize),
      // The list view only needs a short preview of the description
      omit: { description: true },
      include: { company: companySummary },
    }),
    prisma.job.count({ where }),
  ]);

  const seekerId = req.user?.role === 'SEEKER' ? req.user.id : undefined;
  const flags = await seekerFlags(seekerId, jobs.map((j) => j.id));
  res.json({
    items: jobs.map((j) => ({ ...j, saved: flags.saved.has(j.id), applicationStatus: flags.applied.get(j.id) ?? null })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  });
});

jobsRouter.get('/:id', async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: { company: { select: { id: true, name: true, website: true, location: true, description: true, ownerId: true } } },
  });
  const user = req.user;
  const isOwner = !!user && job?.company.ownerId === user.id;
  // Closed jobs stay visible to their employer and admins only
  if (!job || (job.status === 'CLOSED' && !isOwner && user?.role !== 'ADMIN')) {
    throw new HttpError(404, 'Job not found');
  }

  const flags = await seekerFlags(user?.role === 'SEEKER' ? user.id : undefined, [job.id]);
  const { ownerId: _ownerId, ...company } = job.company;
  res.json({
    ...job,
    company,
    isOwner,
    saved: flags.saved.has(job.id),
    applicationStatus: flags.applied.get(job.id) ?? null,
  });
});

jobsRouter.post('/:id/apply', async (req, res) => {
  const applicantId = seekerId(req);
  const { coverLetter } = applySchema.parse(req.body);
  const job = await prisma.job.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
  if (!job) throw new HttpError(404, 'Job not found');
  if (job.status !== 'OPEN') throw new HttpError(409, 'This job is no longer accepting applications');

  const existing = await prisma.application.findUnique({ where: { jobId_seekerId: { jobId: job.id, seekerId: applicantId } } });
  if (existing) throw new HttpError(409, 'You have already applied for this job');

  const application = await prisma.application.create({ data: { jobId: job.id, seekerId: applicantId, coverLetter } });
  res.status(201).json(application);
});

jobsRouter.put('/:id/save', async (req, res) => {
  const userId = seekerId(req);
  const job = await prisma.job.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!job) throw new HttpError(404, 'Job not found');
  await prisma.savedJob.upsert({
    where: { userId_jobId: { userId, jobId: job.id } },
    create: { userId, jobId: job.id },
    update: {},
  });
  res.status(204).end();
});

jobsRouter.delete('/:id/save', async (req, res) => {
  await prisma.savedJob.deleteMany({ where: { userId: seekerId(req), jobId: req.params.id } });
  res.status(204).end();
});
