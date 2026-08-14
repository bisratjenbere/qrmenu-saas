import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface JwtPayload {
  sub: string; // staff id
  role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
  companyId: string | null;
  branchId: string | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.NODE_ENV === 'production' ? '15m' : '24h',
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/** Middleware: requires a valid JWT. Populates request.staff. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // Also check query param for SSE (EventSource doesn't support custom headers)
  if (!token && typeof (request.query as Record<string, string>).token === 'string') {
    token = (request.query as Record<string, string>).token;
  }

  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  const payload = verifyToken(token);
  request.staff = {
    id: payload.sub,
    role: payload.role,
    companyId: payload.companyId,
    branchId: payload.branchId,
  };
}

/** Middleware: requires SUPER_ADMIN role. Must be used after requireAuth. */
export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (request.staff?.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Super Admin access required');
  }
}

/** Middleware: requires ADMIN role. Must be used after requireAuth. */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (request.staff?.role !== 'ADMIN' && request.staff?.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Admin access required');
  }
}

/** Middleware: requires STAFF or ADMIN role. Must be used after requireAuth. */
export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  // SUPER_ADMIN, ADMIN and STAFF can access staff-level routes
}
