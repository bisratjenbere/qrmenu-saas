import { FastifyInstance } from 'fastify';
import { requireStaff } from '../middleware/auth.middleware.js';
import { loginSchema } from '@qrmenu/shared';
import bcrypt from 'bcryptjs';
import { signToken } from '../middleware/auth.middleware.js';
import { UnauthorizedError } from '../utils/errors.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/operations-mode', { preHandler: [requireStaff] }, async (request: any) => {
    if (!request.staff.branchId) return { operationsMode: 'SIMPLE_SERVICE' };
    const branch = await fastify.prisma.branch.findUnique({ where: { id: request.staff.branchId }, select: { operationsMode: true } });
    return { operationsMode: branch?.operationsMode || 'SIMPLE_SERVICE' };
  });
  fastify.post('/login', async (request, reply) => {
    const data = loginSchema.parse(request.body);
    const staff = await fastify.prisma.staff.findUnique({
      where: { email: data.email },
    });

    if (!staff) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await bcrypt.compare(data.password, staff.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = signToken({
      sub: staff.id,
      role: staff.role,
      branchId: staff.branchId,
      companyId: staff.companyId,
    });

    return reply.status(200).send({
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        branchId: staff.branchId,
        companyId: staff.companyId,
      }
    });
  });
}
