import { Router } from 'express';
import { prisma } from '../db.js';
import { HttpError } from '../lib/http.js';
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
