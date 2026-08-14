import { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { formatPublicMenu } from '../services/menu-formatter.service.js';

export async function menuRoutes(fastify: FastifyInstance) {
  fastify.get('/:slug/menu', async (request: any, reply) => {
    const { slug } = request.params;

    const branch = await fastify.prisma.branch.findFirst({
      where: { slug },
    });

    if (!branch) {
      return reply.status(404).send({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' },
      });
    }

    const menu = await fastify.prisma.menu.findFirst({
      where: { branchId: branch.id, status: 'PUBLISHED' },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                upsellSources: true,
                modifierGroups: {
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    options: { orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!menu) {
      return reply.status(404).send({
        error: { code: 'NO_PUBLISHED_MENU', message: 'Menu not found' },
      });
    }

    return reply.status(200).send(formatPublicMenu(branch, menu));
  });

  /** Resolve signed table token — locks table context for PER_TABLE_QR */
  fastify.get('/:slug/table/:token', async (request: any, reply) => {
    const { slug, token } = request.params;

    const branch = await fastify.prisma.branch.findFirst({ where: { slug } });
    if (!branch) throw new NotFoundError('Branch not found');

    const table = await fastify.prisma.table.findFirst({
      where: {
        branchId: branch.id,
        qrToken: token,
        qrTokenRevokedAt: null,
      },
    });

    if (!table) throw new ValidationError('Invalid or revoked table token');

    return reply.status(200).send({
      tableId: table.id,
      label: table.label,
      branchSlug: branch.slug,
      locked: true,
      serviceMode: branch.serviceMode,
      enableTakeaway: branch.enableTakeaway,
    });
  });
}
