import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db.js';
import { HttpError, pageOf } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';
import { adminJobQuerySchema, adminUserQuerySchema, jobStatusSchema, suspendSchema } from '../schemas.js';

// Mounted behind requireRole('ADMIN')
export const adminRouter = Router();

const ADMIN_PAGE_SIZE = 20;

function tally<K extends string>(rows: { key: K; count: number }[]) {
  return Object.fromEntries(rows.map((r) => [r.key, r.count])) as Partial<Record<K, number>>;
}

adminRouter.get('/stats', async (_req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [users, jobs, applications, newUsers, newApplications] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.job.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.application.count({ where: { createdAt: { gte: weekAgo } } }),
  ]);
  res.json({
    usersByRole: tally(users.map((u) => ({ key: u.role, count: u._count._all }))),
    jobsByStatus: tally(jobs.map((j) => ({ key: j.status, count: j._count._all }))),
    applicationsByStatus: tally(applications.map((a) => ({ key: a.status, count: a._count._all }))),
    last7Days: { newUsers, newApplications },
  });
});

adminRouter.get('/users', async (req, res) => {
  const { search, role, page } = adminUserQuerySchema.parse(req.query);
  const where: Prisma.UserWhereInput = {
    role,
    OR: search
      ? [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }]
      : undefined,
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...pageOf(page, ADMIN_PAGE_SIZE),
      select: { id: true, name: true, email: true, role: true, suspended: true, createdAt: true, company: { select: { name: true } } },
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ items, total, page, pageSize: ADMIN_PAGE_SIZE });
});

adminRouter.patch('/users/:id', async (req, res) => {
  const { suspended } = suspendSchema.parse(req.body);
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, 'User not found');
  if (target.id === currentUser(req).id || target.role === 'ADMIN') {
    throw new HttpError(400, 'Admin accounts cannot be suspended');
  }
  const user = await prisma.user.update({
    where: { id: target.id },
    data: { suspended },
    select: { id: true, suspended: true },
  });
  res.json(user);
});

adminRouter.get('/jobs', async (req, res) => {
  const { search, status, page } = adminJobQuerySchema.parse(req.query);
  const where: Prisma.JobWhereInput = {
    status,
    OR: search
      ? [{ title: { contains: search, mode: 'insensitive' } }, { company: { name: { contains: search, mode: 'insensitive' } } }]
      : undefined,
  };
  const [items, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...pageOf(page, ADMIN_PAGE_SIZE),
      omit: { description: true },
      include: { company: { select: { name: true } }, _count: { select: { applications: true } } },
    }),
    prisma.job.count({ where }),
  ]);
  res.json({ items, total, page, pageSize: ADMIN_PAGE_SIZE });
});

adminRouter.patch('/jobs/:id', async (req, res) => {
  const { status } = jobStatusSchema.parse(req.body);
  const job = await prisma.job.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!job) throw new HttpError(404, 'Job not found');
  res.json(await prisma.job.update({ where: { id: job.id }, data: { status }, omit: { description: true } }));
});
