import type { PrismaClient } from '@qrmenu/db';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
  interface FastifyRequest {
    /** Populated by auth middleware */
    staff?: {
      id: string;
      role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
      companyId: string | null;
      branchId: string | null;
    };
  }
}
