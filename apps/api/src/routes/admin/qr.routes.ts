import { FastifyInstance } from 'fastify';
import { generateQrSchema, ServiceMode } from '@qrmenu/shared';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { NotFoundError } from '../../utils/errors.js';
import QRCode from 'qrcode';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { randomUUID } from 'crypto';

export async function adminQrRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  const APP_URL = process.env.APP_URL || 'http://localhost:3000';

  function menuUrl(slug: string) {
    return `${APP_URL}/${slug}`;
  }

  function tableUrl(slug: string, token: string) {
    return `${APP_URL}/${slug}/t/${token}`;
  }

  fastify.post('/:branchId/qr', async (request: any, reply) => {
    const { branchId } = request.params;

    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const data = generateQrSchema.parse(request.body || {});
    const format = data.format || 'png';

    const isPerTable =
      branch.serviceMode === ServiceMode.PER_TABLE_QR ||
      branch.qrMode === 'PER_TABLE';

    if (!isPerTable) {
      const url = menuUrl(branch.slug);
      let buffer: Buffer;
      if (format === 'svg') {
        buffer = Buffer.from(await QRCode.toString(url, { type: 'svg' }));
      } else {
        buffer = await QRCode.toBuffer(url, { type: 'png' });
      }

      reply.header('Content-Type', format === 'svg' ? 'image/svg+xml' : 'image/png');
      reply.header(
        'Content-Disposition',
        `attachment; filename="qr-${branch.slug}.${format}"`
      );
      return reply.send(buffer);
    }

    const tables = await fastify.prisma.table.findMany({ where: { branchId } });
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();

    reply.header('Content-Type', 'application/zip');
    reply.header(
      'Content-Disposition',
      `attachment; filename="qr-${branch.slug}-tables.zip"`
    );

    archive.pipe(stream);

    for (const table of tables) {
      const url = tableUrl(branch.slug, table.qrToken);
      let buffer: Buffer;
      let filename: string;
      if (format === 'svg') {
        buffer = Buffer.from(await QRCode.toString(url, { type: 'svg' }));
        filename = `table-${table.label}.svg`;
      } else {
        buffer = await QRCode.toBuffer(url, { type: 'png' });
        filename = `table-${table.label}.png`;
      }
      archive.append(buffer, { name: filename });
    }

    await archive.finalize();
    return reply.send(stream);
  });

  fastify.get('/:branchId/qr/table/:tableId', async (request: any, reply) => {
    const { branchId, tableId } = request.params;
    const isDownload = request.query.download === 'true';

    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const table = await fastify.prisma.table.findFirst({
      where: { id: tableId, branchId },
    });
    if (!table) throw new NotFoundError('Table not found');

    const url = tableUrl(branch.slug, table.qrToken);
    let buffer: Buffer;

    if (isDownload) {
      buffer = await QRCode.toBuffer(url, { type: 'png' });
      reply.header('Content-Type', 'image/png');
      reply.header(
        'Content-Disposition',
        `attachment; filename="qr-table-${table.label}.png"`
      );
    } else {
      buffer = Buffer.from(await QRCode.toString(url, { type: 'svg' }));
      reply.header('Content-Type', 'image/svg+xml');
      reply.header('Content-Disposition', 'inline');
    }
    return reply.send(buffer);
  });

  fastify.post('/:branchId/qr/table/:tableId/revoke', async (request: any, reply) => {
    const { branchId, tableId } = request.params;

    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const table = await fastify.prisma.table.findFirst({
      where: { id: tableId, branchId },
    });
    if (!table) throw new NotFoundError('Table not found');

    const updated = await fastify.prisma.table.update({
      where: { id: tableId },
      data: {
        qrToken: randomUUID(),
        qrTokenRevokedAt: new Date(),
      },
    });

    return reply.status(200).send({
      id: updated.id,
      label: updated.label,
      qrToken: updated.qrToken,
    });
  });

  fastify.get('/:branchId/qr/single', async (request: any, reply) => {
    const { branchId } = request.params;
    const isDownload = request.query.download === 'true';

    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const url = menuUrl(branch.slug);
    let buffer: Buffer;

    if (isDownload) {
      buffer = await QRCode.toBuffer(url, { type: 'png' });
      reply.header('Content-Type', 'image/png');
      reply.header(
        'Content-Disposition',
        `attachment; filename="qr-${branch.slug}.png"`
      );
    } else {
      buffer = Buffer.from(await QRCode.toString(url, { type: 'svg' }));
      reply.header('Content-Type', 'image/svg+xml');
      reply.header('Content-Disposition', 'inline');
    }
    return reply.send(buffer);
  });
}
