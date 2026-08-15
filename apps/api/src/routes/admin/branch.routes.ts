import { FastifyInstance } from 'fastify';
import {
  createBranchSchema,
  updateBranchSchema,
  qrModeToServiceMode,
  serviceModeToQrMode,
} from '@qrmenu/shared';
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

  fastify.get('/:id/onboarding', async (request: any, reply) => {
    const { id } = request.params;
    const whereClause: any = { id };
    if (request.staff.role !== 'SUPER_ADMIN') {
      whereClause.companyId = request.staff.companyId;
    }

    const branch = await fastify.prisma.branch.findFirst({
      where: whereClause,
      include: {
        tables: { select: { id: true } },
        menus: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: {
            sections: {
              where: { isVisible: true },
              include: { items: true },
            },
          },
        },
      },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const menu = branch.menus[0];
    const sellableItemCount = menu
      ? menu.sections.flatMap(section => section.items).filter(item => item.isAvailable && Number(item.price) > 0).length
      : 0;
    const basicsComplete = Boolean(branch.name.trim() && branch.restaurantType);
    const modeComplete = branch.setupStep >= 2;
    const menuComplete = sellableItemCount > 0;
    const profileComplete = Boolean(
      branch.phone || branch.address || branch.logoUrl || branch.description || branch.tagline
    );
    const qrComplete = branch.setupStep >= 6;
    const published = menu?.status === 'PUBLISHED' && sellableItemCount > 0;
    const completedSteps = [
      ...(basicsComplete ? [1] : []),
      ...(modeComplete ? [2] : []),
      ...(menuComplete ? [3, 4] : []),
      ...(profileComplete ? [5] : []),
      ...(qrComplete ? [6] : []),
      ...(published ? [7] : []),
    ];
    const blockingIssues: string[] = [];
    if (!basicsComplete) blockingIssues.push('Complete restaurant basics');
    if (!modeComplete) blockingIssues.push('Choose how guests will use your QR menu');
    if (!menuComplete) blockingIssues.push('Add at least one sellable menu item');
    if (branch.serviceMode === 'PER_TABLE_QR' && branch.tables.length === 0) {
      blockingIssues.push('Generate at least one table QR code');
    }

    const currentStep = published ? 7 : Math.max(0, branch.setupStep);
    const nextAction = [
      'Complete restaurant basics',
      'Choose how guests will use your QR menu',
      'Choose a menu starter',
      'Review dishes, prices, and translations',
      'Complete public restaurant details',
      'Generate QR materials',
      'Review and publish your menu',
      'Your restaurant menu is live',
    ][currentStep] || 'Continue restaurant setup';

    return reply.status(200).send({
      branchId: branch.id,
      currentStep,
      completedSteps,
      nextAction,
      blockingIssues,
      warnings: [],
      hasMenu: !!menu,
      sellableItemCount,
      tableCount: branch.tables.length,
      isPublished: published,
    });
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

    const serviceMode = data.serviceMode ?? qrModeToServiceMode(data.qrMode);
    const branch = await fastify.prisma.branch.create({
      data: {
        ...data,
        companyId,
        serviceMode,
        qrMode: serviceModeToQrMode(serviceMode),
        setupStep: 0,
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

    const patch: Record<string, unknown> = { ...data };
    if (data.serviceMode) {
      patch.qrMode = serviceModeToQrMode(data.serviceMode);
    } else if (data.qrMode) {
      patch.serviceMode = qrModeToServiceMode(data.qrMode);
    }
    if (data.setupStep !== undefined) {
      // Setup milestones are cumulative. A later profile edit must not send a
      // branch back to an earlier onboarding state.
      const setupStep = Math.max(existing.setupStep, data.setupStep);
      patch.setupStep = setupStep;
      if (setupStep > 0 && !existing.setupStartedAt) {
        patch.setupStartedAt = new Date();
      }
      if (setupStep === 7 && !existing.setupCompletedAt) {
        patch.setupCompletedAt = new Date();
      }
    }

    const branch = await fastify.prisma.branch.update({
      where: { id },
      data: patch,
    });
    return reply.status(200).send(branch);
  });
}
