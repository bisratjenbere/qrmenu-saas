import { FastifyInstance } from 'fastify';
import { generateQrSchema } from '@qrmenu/shared';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { NotFoundError } from '../../utils/errors.js';
import QRCode from 'qrcode';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export async function adminQrRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  fastify.post('/:branchId/qr', async (request: any, reply) => {
    const { branchId } = request.params;
    
    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const data = generateQrSchema.parse(request.body || {});
    const format = data.format || 'png';
    const APP_URL = process.env.APP_URL || 'http://localhost:3000';
    
    if (branch.qrMode === 'SINGLE') {
      const url = `${APP_URL}/${branch.slug}`;
      let buffer: Buffer;
      if (format === 'svg') {
        const svgString = await QRCode.toString(url, { type: 'svg' });
        buffer = Buffer.from(svgString);
      } else {
        buffer = await QRCode.toBuffer(url, { type: 'png' });
      }

      reply.header('Content-Type', format === 'svg' ? 'image/svg+xml' : 'image/png');
      reply.header('Content-Disposition', `attachment; filename="qr-${branch.slug}.${format}"`);
      return reply.send(buffer);
    } else {
      // PER_TABLE
      const tables = await fastify.prisma.table.findMany({
        where: { branchId },
      });

      const archive = archiver('zip', { zlib: { level: 9 } });
      const stream = new PassThrough();

      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', `attachment; filename="qr-${branch.slug}-tables.zip"`);
      
      archive.pipe(stream);

      for (const table of tables) {
        const url = `${APP_URL}/${branch.slug}?table=${encodeURIComponent(table.label)}`;
        let buffer: Buffer;
        let filename: string;
        if (format === 'svg') {
          const svgString = await QRCode.toString(url, { type: 'svg' });
          buffer = Buffer.from(svgString);
          filename = `table-${table.label}.svg`;
        } else {
          buffer = await QRCode.toBuffer(url, { type: 'png' });
          filename = `table-${table.label}.png`;
        }
        archive.append(buffer, { name: filename });
      }

      await archive.finalize();
      return reply.send(stream);
    }
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

    const APP_URL = process.env.APP_URL || 'http://localhost:3000';
    const url = `${APP_URL}/${branch.slug}?table=${encodeURIComponent(table.label)}`;

    let buffer: Buffer;
    if (isDownload) {
      buffer = await QRCode.toBuffer(url, { type: 'png' });
      reply.header('Content-Type', 'image/png');
      reply.header('Content-Disposition', `attachment; filename="qr-table-${table.label}.png"`);
    } else {
      const svgString = await QRCode.toString(url, { type: 'svg' });
      buffer = Buffer.from(svgString);
      reply.header('Content-Type', 'image/svg+xml');
      reply.header('Content-Disposition', 'inline');
    }
    return reply.send(buffer);
  });

  fastify.get('/:branchId/qr/single', async (request: any, reply) => {
    const { branchId } = request.params;
    const isDownload = request.query.download === 'true';

    const branch = await fastify.prisma.branch.findFirst({
      where: { id: branchId, companyId: request.staff.companyId },
    });
    if (!branch) throw new NotFoundError('Branch not found');

    const APP_URL = process.env.APP_URL || 'http://localhost:3000';
    const url = `${APP_URL}/${branch.slug}`;

    let buffer: Buffer;
    if (isDownload) {
      buffer = await QRCode.toBuffer(url, { type: 'png' });
      reply.header('Content-Type', 'image/png');
      reply.header('Content-Disposition', `attachment; filename="qr-${branch.slug}.png"`);
    } else {
      const svgString = await QRCode.toString(url, { type: 'svg' });
      buffer = Buffer.from(svgString);
      reply.header('Content-Type', 'image/svg+xml');
      reply.header('Content-Disposition', 'inline');
    }
    return reply.send(buffer);
  });
}
