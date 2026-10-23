import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { jobSearchSchema } from '../schemas.js';

export type JobSearch = z.infer<typeof jobSearchSchema>;

/** Translates public search filters into a Prisma where clause (open jobs only). */
export function buildJobWhere(f: JobSearch): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [];

  if (f.q) {
    // Backed by pg_trgm GIN indexes, so ILIKE '%term%' stays fast as data grows
    const contains = { contains: f.q, mode: 'insensitive' as const };
    and.push({ OR: [{ title: contains }, { description: contains }, { company: { name: contains } }] });
  }
  if (f.minSalary !== undefined) {
    // A job qualifies if its range reaches the requested salary
    and.push({
      OR: [{ salaryMax: { gte: f.minSalary } }, { salaryMax: null, salaryMin: { gte: f.minSalary } }],
    });
  }

  return {
    status: 'OPEN',
    country: f.country,
    region: f.region,
    category: f.category,
    workType: f.workType,
    workplace: f.workplace,
    sponsorship: f.sponsorship ? true : undefined,
    AND: and.length ? and : undefined,
  };
}

export function buildJobOrder(sort: JobSearch['sort']): Prisma.JobOrderByWithRelationInput[] {
  return sort === 'salary'
    ? [{ salaryMax: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
    : [{ createdAt: 'desc' }];
}
