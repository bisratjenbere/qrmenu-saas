import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@qrmenu/db';
import { authRoutes } from './routes/auth.routes.js';
import { adminBranchRoutes } from './routes/admin/branch.routes.js';
import { adminMenuRoutes } from './routes/admin/menu.routes.js';
import { adminSectionRoutes } from './routes/admin/section.routes.js';
import { adminItemRoutes } from './routes/admin/item.routes.js';
import { adminTableRoutes } from './routes/admin/table.routes.js';
import { adminQrRoutes } from './routes/admin/qr.routes.js';
import { adminStaffRoutes } from './routes/admin/staff.routes.js';
import { adminUploadRoutes } from './routes/admin/upload.routes.js';
import { menuRoutes } from './routes/menu.routes.js';
import { orderRoutes } from './routes/order.routes.js';
import { sseRoutes } from './routes/sse.routes.js';
import { sseService } from './services/sse.service.js';
import { serviceRequestRoutes } from './routes/service-request.routes.js';
import { kitchenRoutes } from './routes/kitchen.routes.js';
import { adminUpsellRoutes } from './routes/admin/upsell.routes.js';
import { superAdminRoutes } from './routes/super-admin.routes.js';

// ─── Prisma Client ──────────────────────────────────

const prisma = new PrismaClient();

// ─── Fastify Instance ───────────────────────────────

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// ─── Decorate with Prisma ───────────────────────────

fastify.decorate('prisma', prisma);

// ─── Global Error Handler ───────────────────────────

fastify.setErrorHandler((error: any, request, reply) => {
  let statusCode = error.statusCode || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message;

  // Handle Zod Validation Errors
  if (error.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = error.issues ? error.issues.map((i: any) => i.message).join(', ') : error.message;
  }

  if (statusCode >= 500) {
    request.log.error(error);
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: {
          url: request.url,
          method: request.method,
          body: request.body,
          params: request.params,
          query: request.query,
          staff: request.staff,
        },
      });
    }
  }

  reply.status(statusCode).send({
    error: {
      code,
      message: statusCode >= 500 ? 'Internal server error' : message,
      ...(process.env.NODE_ENV !== 'production' && statusCode >= 500
        ? { stack: error.stack }
        : {}),
    },
  });
});

// ─── Plugins ────────────────────────────────────────

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

await fastify.register(helmet, {
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// ─── Health check ───────────────────────────────────

fastify.get('/health', async () => {
  return { status: 'ok', uptime: process.uptime() };
});

fastify.get('/health/ready', async (request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ready', db: 'connected' };
  } catch (err) {
    reply.status(503);
    return { status: 'not_ready', db: 'disconnected' };
  }
});

// ─── Routes ─────────────────────────────────────────

await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(adminBranchRoutes, { prefix: '/api/admin/branches' });
await fastify.register(adminMenuRoutes, { prefix: '/api/admin' });
await fastify.register(adminSectionRoutes, { prefix: '/api/admin' });
await fastify.register(adminItemRoutes, { prefix: '/api/admin' });
await fastify.register(adminTableRoutes, { prefix: '/api/admin/branches' });
await fastify.register(adminQrRoutes, { prefix: '/api/admin/branches' });
await fastify.register(adminStaffRoutes, { prefix: '/api/admin/staff' });
await fastify.register(adminUploadRoutes, { prefix: '/api/admin/upload' });
await fastify.register(menuRoutes, { prefix: '/api/branches' });
await fastify.register(orderRoutes, { prefix: '/api/orders' });
await fastify.register(serviceRequestRoutes, { prefix: '/api/service-requests' });
await fastify.register(sseRoutes, { prefix: '/api/branches' });
await fastify.register(kitchenRoutes, { prefix: '/api/kitchen' });
await fastify.register(adminUpsellRoutes, { prefix: '/api/admin' });
await fastify.register(superAdminRoutes, { prefix: '/api/super-admin' });

// ─── Graceful Shutdown ──────────────────────────────

const shutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}. Shutting down gracefully...`);
  try {
    sseService.closeAll();
  } catch (err) {
    fastify.log.error(err, 'Error closing SSE connections');
  }
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Start Server ───────────────────────────────────

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET ||
    process.env.JWT_SECRET === 'dev-secret-change-in-production-minimum-32-chars-long' ||
    process.env.JWT_SECRET === 'dev-secret')
) {
  fastify.log.error('CRITICAL ERROR: Insecure JWT_SECRET in production');
  process.exit(1);
}

export { fastify, prisma };

if (process.env.NODE_ENV !== 'test') {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    const port = parseInt(process.env.PORT || '3001', 10);
    const address = await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 API Server running on port ${port} (${address})`);
  } catch (err) {
    console.error('❌ Server startup error:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}
