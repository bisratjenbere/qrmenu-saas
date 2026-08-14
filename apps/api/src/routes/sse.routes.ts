import { FastifyInstance } from 'fastify';
import { sseService } from '../services/sse.service.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { assertBranchAccess } from '../utils/tenant-scope.js';

export async function sseRoutes(fastify: FastifyInstance) {
  fastify.get('/:branchId/orders/stream', async (request: any, reply) => {
    const { branchId } = request.params;
    const { token } = request.query;

    if (!token) {
      return reply.status(401).send({ error: 'Missing token' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (e) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    await assertBranchAccess(fastify.prisma, decoded, branchId, 'Branch not found');

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    sseService.subscribe(branchId, reply.raw);

    reply.raw.write(`event: connected\ndata: {}\n\n`);

    request.raw.on('close', () => {
      sseService.unsubscribe(branchId, reply.raw);
    });
  });
}
