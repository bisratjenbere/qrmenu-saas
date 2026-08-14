import { FastifyInstance } from 'fastify';
import { createBranchSchema, updateBranchSchema } from '@qrmenu/shared';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { NotFoundError } from '../../utils/errors.js';

import { assertTenantBranchQuota } from '../../utils/tenant-quotas.js';

export async function adminBranchRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  fastify.get('/', async (request: any, reply) => {
    const whereClause: any = {};
    if (request.staff.role !== 'SUPER_ADMIN') {
      whereClause.companyId = request.staff.companyId;
    }
    const branches = await fastify.prisma.branch.findMany({
      where: whereClause,
    });
    return reply.status(200).send(branches);
  });

  fastify.get('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const whereClause: any = { id };
    if (request.staff.role !== 'SUPER_ADMIN') {
      whereClause.companyId = request.staff.companyId;
    }
    const branch = await fastify.prisma.branch.findFirst({
      where: whereClause,
    });
    if (!branch) throw new NotFoundError('Branch not found');
    return reply.status(200).send(branch);
  });

  fastify.post('/', async (request: any, reply) => {
    const data = createBranchSchema.parse(request.body);

    const companyId = request.staff.companyId || request.body.companyId;

    if (companyId) {
      await assertTenantBranchQuota(fastify.prisma, companyId);
    }

    const branch = await fastify.prisma.branch.create({
      data: {
        ...data,
        companyId,
      },
    });
    return reply.status(201).send(branch);
  });

  fastify.patch('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const data = updateBranchSchema.parse(request.body);

    const whereClause: any = { id };
    if (request.staff.role !== 'SUPER_ADMIN') {
      whereClause.companyId = request.staff.companyId;
    }

    const existing = await fastify.prisma.branch.findFirst({
      where: whereClause,
    });
    if (!existing) throw new NotFoundError('Branch not found');

    const branch = await fastify.prisma.branch.update({
      where: { id },
      data,
    });
    return reply.status(200).send(branch);
  });
}
