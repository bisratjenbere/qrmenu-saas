import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

export async function adminStaffRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  fastify.get('/', async (request: any, reply) => {
    const staff = await fastify.prisma.staff.findMany({
      where: { companyId: request.staff.companyId },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        name: true,
        email: true,
        role: true,
      }
    });
    return reply.status(200).send(staff);
  });

  fastify.post('/', async (request: any, reply) => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
      branchId: z.string().optional().nullable(),
    });
    const data = schema.parse(request.body);

    const existing = await fastify.prisma.staff.findFirst({
      where: { email: data.email },
    });
    if (existing) throw new ConflictError('Email already in use');

    if (data.branchId) {
      const branch = await fastify.prisma.branch.findFirst({
        where: { id: data.branchId, companyId: request.staff.companyId },
      });
      if (!branch) throw new NotFoundError('Branch not found');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const staff = await fastify.prisma.staff.create({
      data: {
        companyId: request.staff.companyId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        branchId: data.branchId,
      },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        name: true,
        email: true,
        role: true,
      }
    });

    return reply.status(201).send(staff);
  });

  fastify.delete('/:id', async (request: any, reply) => {
    const { id } = request.params;
    
    if (id === request.staff.id) {
      throw new ConflictError('Cannot delete yourself');
    }
    
    const staff = await fastify.prisma.staff.findFirst({
      where: { id, companyId: request.staff.companyId },
    });
    if (!staff) throw new NotFoundError('Staff not found');

    await fastify.prisma.staff.delete({ where: { id } });
    return reply.status(204).send();
  });
}
