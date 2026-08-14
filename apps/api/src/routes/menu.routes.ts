import { FastifyInstance } from 'fastify';
import { NotFoundError } from '../utils/errors.js';

export async function menuRoutes(fastify: FastifyInstance) {
  fastify.get('/:slug/menu', async (request: any, reply) => {
    const { slug } = request.params;
    
    const branch = await fastify.prisma.branch.findFirst({
      where: { slug },
    });
    
    if (!branch) {
      return reply.status(404).send({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }

    const menu = await fastify.prisma.menu.findFirst({
      where: { branchId: branch.id, status: 'PUBLISHED' },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              include: { upsellSources: true }
            },
          },
        },
      },
    });

    if (!menu) {
      return reply.status(404).send({
        error: { code: 'NO_PUBLISHED_MENU', message: 'Menu not found' }
      });
    }

    const formattedMenu = {
      id: menu.id,
      name: menu.name,
      status: menu.status,
      branch: {
        id: branch.id,
        name: branch.name,
        slug: branch.slug,
        qrMode: branch.qrMode,
        coverImageUrl: branch.coverImageUrl,
        tagline: branch.tagline,
        currency: branch.currency || 'ETB',
        serviceChargePercent: branch.serviceChargePercent || 0,
        vatPercent: branch.vatPercent || 0,
      },
      sections: menu.sections.map(s => ({
        id: s.id,
        name: s.name,
        nameAmharic: s.nameAmharic,
        sortOrder: s.sortOrder,
        timeSlot: s.timeSlot || 'ALL_DAY',
        items: s.items.map(i => ({
          id: i.id,
          name: i.name,
          nameAmharic: i.nameAmharic,
          description: i.description,
          price: Number(i.price),
          photoUrl: i.photoUrl,
          isAvailable: i.isAvailable,
          sortOrder: i.sortOrder,
          popularityScore: i.popularityScore,
          dietaryLabels: i.dietaryLabels || [],
          allergens: i.allergens || [],
          spiceLevel: i.spiceLevel || 0,
          prepTimeMin: i.prepTimeMin,
          calories: i.calories,
          servingSize: i.servingSize,
          isCombo: i.isCombo || false,
          comboItemCount: i.comboItemCount,
          comboPrice: i.comboPrice ? Number(i.comboPrice) : null,
          upsellIds: i.upsellSources.map(us => us.targetItemId)
        }))
      }))
    };

    return reply.status(200).send(formattedMenu);
  });
}
