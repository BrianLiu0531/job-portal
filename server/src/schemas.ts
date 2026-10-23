import { ApplicationStatus, Country, JobStatus, Role, WorkRights, WorkType, Workplace } from '@prisma/client';
import { z } from 'zod';
import { CATEGORIES, LOCATIONS } from './lib/constants.js';

const email = z.string().trim().toLowerCase().email().max(254);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((s) => s || null);
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .nullish()
  .transform((s) => s || null)
  .refine((s) => s === null || /^https?:\/\//.test(s), 'Must start with http:// or https://');
const page = z.coerce.number().int().min(1).default(1);
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const baseRegister = z.object({
  name: z.string().trim().min(1).max(80),
  email,
  // bcrypt only uses the first 72 bytes
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export const registerSchema = z.discriminatedUnion('role', [
  baseRegister.extend({ role: z.literal(Role.SEEKER) }),
  baseRegister.extend({ role: z.literal(Role.EMPLOYER), companyName: z.string().trim().min(2).max(100) }),
]);

export const loginSchema = z.object({ email, password: z.string().min(1) });

export const seekerProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  headline: optionalText(120),
  location: optionalText(80),
  about: optionalText(2000),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  workRights: z.nativeEnum(WorkRights).nullish().transform((v) => v ?? null),
  resumeUrl: optionalUrl,
});

export const companySchema = z.object({
  name: z.string().trim().min(2).max(100),
  website: optionalUrl,
  location: optionalText(80),
  description: optionalText(3000),
});

const salary = z.number().int().min(0).max(10_000_000).nullish().transform((v) => v ?? null);

export const jobSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(30, 'Description must be at least 30 characters').max(10_000),
    category: z.enum(CATEGORIES),
    country: z.nativeEnum(Country),
    region: z.string(),
    city: z.string().trim().min(1).max(80),
    workType: z.nativeEnum(WorkType),
    workplace: z.nativeEnum(Workplace),
    salaryMin: salary,
    salaryMax: salary,
    sponsorship: z.boolean().default(false),
  })
  .superRefine((job, ctx) => {
    if (!(job.region in LOCATIONS[job.country])) {
      ctx.addIssue({ code: 'custom', path: ['region'], message: 'Region does not belong to the selected country' });
    }
    if (job.salaryMin !== null && job.salaryMax !== null && job.salaryMin > job.salaryMax) {
      ctx.addIssue({ code: 'custom', path: ['salaryMax'], message: 'Maximum salary must be at least the minimum' });
    }
  });

export const jobStatusSchema = z.object({ status: z.nativeEnum(JobStatus) });

export const jobSearchSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  country: z.preprocess(emptyToUndefined, z.nativeEnum(Country).optional()),
  region: z.preprocess(emptyToUndefined, z.string().max(10).optional()),
  category: z.preprocess(emptyToUndefined, z.string().max(60).optional()),
  workType: z.preprocess(emptyToUndefined, z.nativeEnum(WorkType).optional()),
  workplace: z.preprocess(emptyToUndefined, z.nativeEnum(Workplace).optional()),
  minSalary: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  sponsorship: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).transform((v) => v === 'true').optional()),
  sort: z.enum(['newest', 'salary']).default('newest'),
  page,
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const applySchema = z.object({ coverLetter: optionalText(5000) });

export const applicationStatusSchema = z.object({ status: z.nativeEnum(ApplicationStatus) });

export const applicationFilterSchema = z.object({
  status: z.preprocess(emptyToUndefined, z.nativeEnum(ApplicationStatus).optional()),
});

export const adminUserQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  role: z.preprocess(emptyToUndefined, z.nativeEnum(Role).optional()),
  page,
});

export const adminJobQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  status: z.preprocess(emptyToUndefined, z.nativeEnum(JobStatus).optional()),
  page,
});

export const suspendSchema = z.object({ suspended: z.boolean() });
