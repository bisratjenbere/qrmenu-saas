import { FastifyInstance } from 'fastify';
import { createBillRequestSchema } from '@qrmenu/shared';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { requireStaff } from '../middleware/auth.middleware.js';
import { assertBranchAccess } from '../utils/tenant-scope.js';
import { sseService } from '../services/sse.service.js';

function formatRequest(request: any) {
  return {
    id: request.id,
    branchId: request.branchId,
    tableNumber: request.tableNumber,
    tableId: request.tableId,
    type: request.type,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    acknowledgedAt: request.acknowledgedAt?.toISOString() ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
    guestAccessToken: request.guestAccessToken,
  };
}

export async function serviceRequestRoutes(fastify: FastifyInstance) {
  fastify.get('/:id/status', async (request: any, reply) => {
    const { token } = request.query;
    if (!token) throw new ValidationError('Tracking token is required');
    const serviceRequest = await fastify.prisma.serviceRequest.findFirst({ where: { id: request.params.id, guestAccessToken: token } });
    if (!serviceRequest) throw new NotFoundError('Service request not found');
    return reply.status(200).send({ id: serviceRequest.id, status: serviceRequest.status });
  });

  const createRequest = async (request: any, reply: any, type: 'BILL' | 'WAITER') => {
    const data = createBillRequestSchema.parse(request.body);
    const branch = await fastify.prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) throw new NotFoundError('Branch not found');
    if (type === 'BILL' && !branch.requestBillEnabled) throw new ValidationError('Bill requests are not enabled for this branch');
    if (type === 'WAITER' && !branch.callWaiterEnabled) throw new ValidationError('Waiter requests are not enabled for this branch');

    let tableNumber = data.tableNumber?.trim();
    let tableId: string | null = null;
    if (data.tableToken) {
      const table = await fastify.prisma.table.findFirst({
        where: { branchId: branch.id, qrToken: data.tableToken, qrTokenRevokedAt: null },
      });
      if (!table) throw new ValidationError('Invalid or revoked table token');
      tableNumber = table.label;
      tableId = table.id;
    } else if (!tableNumber) {
      throw new ValidationError('Table number is required to request the bill');
    } else if (branch.tableInputMode === 'VALIDATED') {
      const table = await fastify.prisma.table.findFirst({ where: { branchId: branch.id, label: tableNumber } });
      if (!table) throw new ValidationError('Invalid table number');
      tableId = table.id;
    }

    const active = await fastify.prisma.serviceRequest.findFirst({
      where: { branchId: branch.id, tableNumber, type, status: { in: ['REQUESTED', 'ACKNOWLEDGED'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (active) return reply.status(200).send(formatRequest(active));

    try {
      const created = await fastify.prisma.serviceRequest.create({
        data: { branchId: branch.id, tableNumber, tableId, type, idempotencyKey: data.idempotencyKey },
      });
      const formatted = formatRequest(created);
      sseService.emitEvent(branch.id, 'service-request', formatted);
      return reply.status(201).send(formatted);
    } catch (error: any) {
      if (error.code === 'P2002') {
        const existing = await fastify.prisma.serviceRequest.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
        if (existing) return reply.status(200).send(formatRequest(existing));
      }
      throw error;
    }
  };

  fastify.post('/bill', async (request: any, reply) => createRequest(request, reply, 'BILL'));
  fastify.post('/waiter', async (request: any, reply) => createRequest(request, reply, 'WAITER'));

  fastify.get('/', { preHandler: [requireStaff] }, async (request: any) => {
    const { branchId } = request.query;
    if (!branchId) throw new ValidationError('branchId query param is required');
    await assertBranchAccess(fastify.prisma, request.staff, branchId, 'Branch not found');
    const requests = await fastify.prisma.serviceRequest.findMany({
      where: { branchId, status: 'REQUESTED' }, orderBy: { createdAt: 'desc' },
    });
    return requests.map(formatRequest);
  });

  fastify.patch('/:id/acknowledge', { preHandler: [requireStaff] }, async (request: any) => {
    const existing = await fastify.prisma.serviceRequest.findUnique({ where: { id: request.params.id } });
    if (!existing) throw new NotFoundError('Service request not found');
    await assertBranchAccess(fastify.prisma, request.staff, existing.branchId, 'Service request not found');
    if (existing.status === 'ACKNOWLEDGED') return formatRequest(existing);
    const updated = await fastify.prisma.serviceRequest.update({
      where: { id: existing.id }, data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
    });
    const formatted = formatRequest(updated);
    sseService.emitEvent(updated.branchId, 'service-request', formatted);
    return formatted;
  });

  fastify.patch('/:id/complete', { preHandler: [requireStaff] }, async (request: any) => {
    const existing = await fastify.prisma.serviceRequest.findUnique({ where: { id: request.params.id } });
    if (!existing) throw new NotFoundError('Service request not found');
    await assertBranchAccess(fastify.prisma, request.staff, existing.branchId, 'Service request not found');
    if (existing.status === 'COMPLETED') return formatRequest(existing);
    const updated = await fastify.prisma.serviceRequest.update({
      where: { id: existing.id }, data: { status: 'COMPLETED', completedAt: new Date() },
    });
    const formatted = formatRequest(updated);
    sseService.emitEvent(updated.branchId, 'service-request', formatted);
    return formatted;
  });
}
