import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import {
  APPLICATION_STATUSES,
  CATEGORIES,
  COUNTRIES,
  LOCATIONS,
  WORK_RIGHTS,
  WORK_TYPES,
  WORKPLACES,
} from './lib/constants.js';
import { errorHandler } from './lib/http.js';
import { optionalAuth, requireRole } from './middleware/auth.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { employerRouter } from './routes/employer.js';
import { jobsRouter } from './routes/jobs.js';
import { seekerRouter } from './routes/seeker.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  // Single source of truth for dropdown options shared with the client
  app.get('/api/meta', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      categories: CATEGORIES,
      countries: COUNTRIES,
      locations: LOCATIONS,
      workTypes: WORK_TYPES,
      workplaces: WORKPLACES,
      workRights: WORK_RIGHTS,
      applicationStatuses: APPLICATION_STATUSES,
    });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/jobs', optionalAuth, jobsRouter);
  app.use('/api/seeker', requireRole('SEEKER'), seekerRouter);
  app.use('/api/employer', requireRole('EMPLOYER'), employerRouter);
  app.use('/api/admin', requireRole('ADMIN'), adminRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // In production the API also serves the built React app (single deployable unit)
  const clientDist = env.CLIENT_DIST ?? path.resolve(here, '../../client/dist');
  if (env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
