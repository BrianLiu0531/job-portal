import { Router } from 'express';
import { prisma } from '../db.js';
import { HttpError } from '../lib/http.js';
import { canEmployerMove, employerNextStatuses } from '../lib/workflow.js';
import { currentUser } from '../middleware/auth.js';
import { applicationFilterSchema, applicationStatusSchema, companySchema, jobSchema, jobStatusSchema } from '../schemas.js';

// Mounted behind requireRole('EMPLOYER')
export const employerRouter = Router();

async function companyIdOf(userId: string) {
  const company = await prisma.company.findUnique({ where: { ownerId: userId }, select: { id: true } });
  if (!company) throw new HttpError(404, 'Company profile not found');
  return company.id;
}

/** Fetches a job only if it belongs to the employer's company — 404 otherwise. */
async function ownedJob(userId: string, jobId: string) {
  const companyId = await companyIdOf(userId);
  const job = await prisma.job.findFirst({ where: { id: jobId, companyId } });
  if (!job) throw new HttpError(404, 'Job not found');
  return job;
}

employerRouter.get('/company', async (req, res) => {
  const company = await prisma.company.findUniqueOrThrow({ where: { ownerId: currentUser(req).id } });
  res.json(company);
});

employerRouter.put('/company', async (req, res) => {
  const data = companySchema.parse(req.body);
  const company = await prisma.company.update({ where: { ownerId: currentUser(req).id }, data });
  res.json(company);
});

employerRouter.get('/jobs', async (req, res) => {
  const companyId = await companyIdOf(currentUser(req).id);
  const jobs = await prisma.job.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    omit: { description: true },
  });
  const counts = await prisma.application.groupBy({
    by: ['jobId', 'status'],
    where: { job: { companyId } },
    _count: { _all: true },
  });

  const stats = new Map<string, { total: number; new: number }>();
  for (const c of counts) {
    const s = stats.get(c.jobId) ?? { total: 0, new: 0 };
    if (c.status !== 'WITHDRAWN') s.total += c._count._all;
    if (c.status === 'APPLIED') s.new += c._count._all;
    stats.set(c.jobId, s);
  }
  res.json(jobs.map((j) => ({ ...j, applicants: stats.get(j.id) ?? { total: 0, new: 0 } })));
});

employerRouter.post('/jobs', async (req, res) => {
  const companyId = await companyIdOf(currentUser(req).id);
  const job = await prisma.job.create({ data: { ...jobSchema.parse(req.body), companyId } });
  res.status(201).json(job);
});

employerRouter.get('/jobs/:id', async (req, res) => {
  res.json(await ownedJob(currentUser(req).id, req.params.id));
});

employerRouter.put('/jobs/:id', async (req, res) => {
  const data = jobSchema.parse(req.body);
  const job = await ownedJob(currentUser(req).id, req.params.id);
  res.json(await prisma.job.update({ where: { id: job.id }, data }));
});

employerRouter.patch('/jobs/:id/status', async (req, res) => {
  const { status } = jobStatusSchema.parse(req.body);
  const job = await ownedJob(currentUser(req).id, req.params.id);
  res.json(await prisma.job.update({ where: { id: job.id }, data: { status } }));
});

employerRouter.get('/jobs/:id/applications', async (req, res) => {
  const job = await ownedJob(currentUser(req).id, req.params.id);
  const { status } = applicationFilterSchema.parse(req.query);
  const applications = await prisma.application.findMany({
    where: { jobId: job.id, status },
    orderBy: { createdAt: 'asc' },
    include: {
      seeker: { select: { id: true, name: true, email: true, seekerProfile: { omit: { userId: true } } } },
    },
  });
  res.json({
    job: { id: job.id, title: job.title, status: job.status },
    applications: applications.map((a) => ({ ...a, nextStatuses: employerNextStatuses(a.status) })),
  });
});

employerRouter.patch('/applications/:id', async (req, res) => {
  const { status } = applicationStatusSchema.parse(req.body);
  const companyId = await companyIdOf(currentUser(req).id);
  const application = await prisma.application.findFirst({ where: { id: req.params.id, job: { companyId } } });
  if (!application) throw new HttpError(404, 'Application not found');
  if (!canEmployerMove(application.status, status)) {
    throw new HttpError(409, `Cannot move an application from ${application.status} to ${status}`);
  }

  const updated = await prisma.application.update({ where: { id: application.id }, data: { status } });
  res.json({ ...updated, nextStatuses: employerNextStatuses(updated.status) });
});
