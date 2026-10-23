import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { HttpError } from '../lib/http.js';
import { clearAuthCookie, currentUser, requireAuth, setAuthCookie } from '../middleware/auth.js';
import { loginSchema, registerSchema } from '../schemas.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { error: 'Too many attempts, please try again later' },
});

async function loadPublicUser(id: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { id: true, name: true, email: true, role: true, company: { select: { id: true, name: true } } },
  });
  return user;
}

authRouter.post('/register', authLimiter, async (req, res) => {
  const data = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, 12),
      seekerProfile: data.role === 'SEEKER' ? { create: {} } : undefined,
      company: data.role === 'EMPLOYER' ? { create: { name: data.companyName } } : undefined,
    },
  });
  setAuthCookie(res, user.id);
  res.status(201).json({ user: await loadPublicUser(user.id) });
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password to avoid account enumeration
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (user.suspended) throw new HttpError(403, 'This account has been suspended');
  setAuthCookie(res, user.id);
  res.json({ user: await loadPublicUser(user.id) });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: await loadPublicUser(currentUser(req).id) });
});
