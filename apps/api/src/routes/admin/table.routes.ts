import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

export async function adminTableRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  fastify.get('/:branchId/tables', async (request: any, reply) => {
    const { branchId } = request.params;
    
    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const tables = await fastify.prisma.table.findMany({
      where: { branchId },
      orderBy: { label: 'asc' },
    });
    return reply.status(200).send(tables);
  });

  fastify.post('/:branchId/tables', async (request: any, reply) => {
    const { branchId } = request.params;
    
    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const schema = z.object({
      label: z.string()
    });
    const { label } = schema.parse(request.body);

    const existing = await fastify.prisma.table.findFirst({
      where: { branchId, label },
    });
    if (existing) throw new ConflictError('Table already exists');

    const table = await fastify.prisma.table.create({
      data: { branchId, label },
    });
    return reply.status(201).send(table);
  });

  fastify.post('/:branchId/tables/generate', async (request: any, reply) => {
    const { branchId } = request.params;
    
    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const schema = z.object({
      count: z.number().min(1).max(500)
    });
    const { count } = schema.parse(request.body);

    const existingTables = await fastify.prisma.table.findMany({
      where: { branchId },
    });
    const existingLabels = new Set(existingTables.map(t => t.label));

    const newTables = [];
    for (let i = 1; i <= count; i++) {
      const label = i.toString();
      if (!existingLabels.has(label)) {
        newTables.push({ branchId, label });
      }
    }

    if (newTables.length > 0) {
      await fastify.prisma.table.createMany({ data: newTables });
    }
    
    return reply.status(201).send({ created: newTables.length });
  });

  fastify.delete('/:branchId/tables/:tableId', async (request: any, reply) => {
    const { branchId, tableId } = request.params;
    
    const table = await fastify.prisma.table.findFirst({
      where: { id: tableId, branchId, branch: { companyId: request.staff.companyId } },
    });
    if (!table) throw new NotFoundError('Table not found');

    await fastify.prisma.table.delete({ where: { id: tableId } });
    return reply.status(204).send();
  });
}
