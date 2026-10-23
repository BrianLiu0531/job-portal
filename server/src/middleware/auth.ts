import type { Role } from '@prisma/client';
import type { Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { HttpError } from '../lib/http.js';

export const AUTH_COOKIE = 'token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthUser {
  id: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function setAuthCookie(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, { httpOnly: true, sameSite: 'lax' });
}

/**
 * Role and suspension are read from the database on every request (not trusted
 * from the token) so that suspending a user or changing a role takes effect immediately.
 */
async function resolveUser(req: Request): Promise<AuthUser | null> {
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  if (typeof token !== 'string') return null;

  let userId: string;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string' || !payload.sub) return null;
    userId = payload.sub;
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, suspended: true },
  });
  if (!user) return null;
  if (user.suspended) throw new HttpError(403, 'This account has been suspended');
  return { id: user.id, role: user.role };
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const user = await resolveUser(req);
  if (!user) throw new HttpError(401, 'Not authenticated');
  req.user = user;
  next();
};

/** Attaches the user if a valid session exists, but never rejects the request. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  req.user = (await resolveUser(req).catch(() => null)) ?? undefined;
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return async (req, _res, next) => {
    const user = await resolveUser(req);
    if (!user) throw new HttpError(401, 'Not authenticated');
    if (!roles.includes(user.role)) throw new HttpError(403, 'You do not have access to this resource');
    req.user = user;
    next();
  };
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new HttpError(401, 'Not authenticated');
  return req.user;
}
