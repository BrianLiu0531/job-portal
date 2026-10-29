import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  PORT: z.coerce.number().int().positive().default(4100),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_DIST: z.string().optional(),
  // Job matching: without a key the app falls back to keyword matching
  ANTHROPIC_API_KEY: z.string().optional(),
  MATCH_MODEL: z.string().default('claude-opus-5-5'),
  /** AI analyses per seeker per 24 hours, and for the whole site; cached repeats are free */
  MATCH_USER_DAILY_LIMIT: z.coerce.number().int().min(0).default(10),
  MATCH_SITE_DAILY_LIMIT: z.coerce.number().int().min(0).default(200),
});

export const env = envSchema.parse(process.env);
