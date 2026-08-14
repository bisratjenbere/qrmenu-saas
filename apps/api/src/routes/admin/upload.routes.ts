import { FastifyInstance } from 'fastify';
import { presignedUrlSchema } from '@qrmenu/shared';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export async function adminUploadRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  fastify.post('/presigned-url', async (request: any, reply) => {
    const data = presignedUrlSchema.parse(request.body);
    const { filename, contentType } = data;
    
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
      return reply.status(500).send({
        error: { code: 'UPLOAD_ERROR', message: 'R2 credentials not configured' }
      });
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    const extMatch = filename.match(/\.([^.]+)$/);
    const ext = extMatch ? extMatch[1] : 'bin';
    const key = `menu-photos/${request.staff.companyId}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    try {
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      const publicUrl = `${R2_PUBLIC_URL}/${key}`;

      return reply.status(200).send({
        uploadUrl,
        publicUrl,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: { code: 'UPLOAD_ERROR', message: 'Failed to generate presigned URL' }
      });
    }
  });
}
