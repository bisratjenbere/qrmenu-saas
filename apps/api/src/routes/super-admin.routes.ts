import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { createTenantSchema, updateTenantSchema, menuTemplateSectionsSchema } from '@qrmenu/shared';
import { requireSuperAdmin, signToken } from '../middleware/auth.middleware.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

export async function superAdminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireSuperAdmin);

  // ─── GET /tenants ──────────────────────────────────
  fastify.get('/tenants', async (request, reply) => {
    const companies = await fastify.prisma.company.findMany({
      include: {
        _count: {
          select: {
            branches: true,
            staff: true,
          },
        },
        branches: {
          select: {
            _count: {
              select: { orders: true },
            },
          },
        },
        staff: {
          where: { role: 'ADMIN' },
          select: { email: true, name: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = companies.map(c => {
      const totalOrders = c.branches.reduce((acc, b) => acc + b._count.orders, 0);
      const admin = c.staff[0];

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        planTier: c.planTier,
        createdAt: c.createdAt.toISOString(),
        branchesCount: c._count.branches,
        staffCount: c._count.staff,
        ordersCount: totalOrders,
        adminEmail: admin?.email || 'N/A',
        adminName: admin?.name || 'N/A',
      };
    });

    return reply.status(200).send(formatted);
  });

  // ─── POST /tenants (Provisioning) ──────────────────
  fastify.post('/tenants', async (request, reply) => {
    const data = createTenantSchema.parse(request.body);

    const existingSlug = await fastify.prisma.company.findUnique({
      where: { slug: data.companySlug },
    });
    if (existingSlug) {
      throw new ConflictError('Company slug already exists');
    }

    const existingEmail = await fastify.prisma.staff.findUnique({
      where: { email: data.adminEmail },
    });
    if (existingEmail) {
      throw new ConflictError('Admin email already exists');
    }

    const passwordHash = await bcrypt.hash(data.adminPassword, 12);

    const result = await fastify.prisma.$transaction(async tx => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          slug: data.companySlug,
          status: 'ACTIVE',
          planTier: data.planTier || 'SCALE',
        },
      });

      // 2. Create Default Branch
      const branch = await tx.branch.create({
        data: {
          companyId: company.id,
          name: `${data.companyName} Main Branch`,
          slug: data.companySlug,
          qrMode: 'SINGLE',
        },
      });

      // 3. Create Admin Staff
      const admin = await tx.staff.create({
        data: {
          companyId: company.id,
          branchId: branch.id,
          name: data.adminName,
          email: data.adminEmail,
          passwordHash,
          role: 'ADMIN',
        },
      });

      // 4. Create Initial Default Menu
      await tx.menu.create({
        data: {
          branchId: branch.id,
          name: 'Main Menu',
          status: 'PUBLISHED',
        },
      });

      return { company, branch, admin };
    });

    return reply.status(201).send({
      id: result.company.id,
      name: result.company.name,
      slug: result.company.slug,
      status: result.company.status,
      planTier: result.company.planTier,
      createdAt: result.company.createdAt.toISOString(),
      branchesCount: 1,
      staffCount: 1,
      ordersCount: 0,
      adminEmail: result.admin.email,
      adminName: result.admin.name,
    });
  });

  // ─── PATCH /tenants/:id ────────────────────────────
  fastify.patch('/tenants/:id', async (request: any, reply) => {
    const { id } = request.params;
    const data = updateTenantSchema.parse(request.body);

    const existing = await fastify.prisma.company.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundError('Tenant company not found');
    }

    const updated = await fastify.prisma.company.update({
      where: { id },
      data,
    });

    return reply.status(200).send(updated);
  });

  // ─── DELETE /tenants/:id ───────────────────────────
  fastify.delete('/tenants/:id', async (request: any, reply) => {
    const { id } = request.params;

    const existing = await fastify.prisma.company.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundError('Tenant company not found');
    }

    await fastify.prisma.company.delete({
      where: { id },
    });

    return reply.status(204).send();
  });

  // ─── POST /tenants/:id/reset-password ──────────────
  fastify.post('/tenants/:id/reset-password', async (request: any, reply) => {
    const { id } = request.params;
    const { newPassword } = request.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    const adminStaff = await fastify.prisma.staff.findFirst({
      where: { companyId: id, role: 'ADMIN' },
    });

    if (!adminStaff) {
      throw new NotFoundError('No admin account found for this tenant');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await fastify.prisma.staff.update({
      where: { id: adminStaff.id },
      data: { passwordHash },
    });

    return reply.status(200).send({ success: true, message: 'Password reset successfully' });
  });

  // ─── GET /analytics ────────────────────────────────
  fastify.get('/analytics', async (request, reply) => {
    const totalTenants = await fastify.prisma.company.count();
    const activeTenants = await fastify.prisma.company.count({
      where: { status: 'ACTIVE' },
    });
    const totalBranches = await fastify.prisma.branch.count();
    const totalOrders = await fastify.prisma.order.count();

    const orderItems = await fastify.prisma.orderItem.findMany({
      select: {
        priceSnapshot: true,
        quantity: true,
      },
    });

    const totalSystemRevenue = orderItems.reduce(
      (acc, item) => acc + Number(item.priceSnapshot) * item.quantity,
      0
    );

    return reply.status(200).send({
      totalTenants,
      activeTenants,
      totalBranches,
      totalOrders,
      totalSystemRevenue,
    });
  });

  // ─── POST /impersonate/:companyId ──────────────────
  fastify.post('/impersonate/:companyId', async (request: any, reply) => {
    const { companyId } = request.params;

    const adminStaff = await fastify.prisma.staff.findFirst({
      where: { companyId, role: 'ADMIN' },
    });

    if (!adminStaff) {
      throw new NotFoundError('No admin account found for this tenant');
    }

    const token = signToken({
      sub: adminStaff.id,
      role: adminStaff.role as any,
      companyId: adminStaff.companyId,
      branchId: adminStaff.branchId,
    });

    return reply.status(200).send({
      token,
      staff: {
        id: adminStaff.id,
        name: adminStaff.name,
        email: adminStaff.email,
        role: adminStaff.role,
        branchId: adminStaff.branchId,
        companyId: adminStaff.companyId,
      },
    });
  });

  // ─── DOMAINS ENDPOINTS ────────────────────────────────
  fastify.get('/domains', async (request, reply) => {
    const domains = await fastify.prisma.customDomain.findMany({
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return reply.status(200).send(
      domains.map(d => ({
        id: d.id,
        companyId: d.companyId,
        companyName: d.company.name,
        domain: d.domain,
        status: d.status,
        sslActive: d.sslActive,
        createdAt: d.createdAt.toISOString(),
      }))
    );
  });

  fastify.post('/domains', async (request: any, reply) => {
    const { companyId, domain } = request.body || {};
    if (!companyId || !domain) {
      throw new Error('companyId and domain are required');
    }
    const created = await fastify.prisma.customDomain.create({
      data: { companyId, domain, status: 'PENDING', sslActive: false },
      include: { company: { select: { name: true } } },
    });
    return reply.status(201).send({
      id: created.id,
      companyId: created.companyId,
      companyName: created.company.name,
      domain: created.domain,
      status: created.status,
      sslActive: created.sslActive,
      createdAt: created.createdAt.toISOString(),
    });
  });

  fastify.post('/domains/:id/verify', async (request: any, reply) => {
    const { id } = request.params;
    const domain = await fastify.prisma.customDomain.findUnique({ where: { id } });
    if (!domain) throw new NotFoundError('Custom domain not found');

    const updated = await fastify.prisma.customDomain.update({
      where: { id },
      data: { status: 'VERIFIED', sslActive: true },
      include: { company: { select: { name: true } } },
    });

    return reply.status(200).send({
      id: updated.id,
      companyId: updated.companyId,
      companyName: updated.company.name,
      domain: updated.domain,
      status: updated.status,
      sslActive: updated.sslActive,
      createdAt: updated.createdAt.toISOString(),
    });
  });

  fastify.delete('/domains/:id', async (request: any, reply) => {
    const { id } = request.params;
    await fastify.prisma.customDomain.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ─── STARTER PRESET TEMPLATES ENDPOINTS ─────────────────
  fastify.get('/templates', async (request, reply) => {
    const templates = await fastify.prisma.menuPresetTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return reply.status(200).send(
      templates.map(t => ({
        id: t.id,
        name: t.name,
        nameAmharic: t.nameAmharic,
        description: t.description,
        category: t.category,
        sectionsJson: t.sectionsJson,
        createdAt: t.createdAt.toISOString(),
      }))
    );
  });

  fastify.post('/templates', async (request: any, reply) => {
    const { name, nameAmharic, description, category, sectionsJson } = request.body || {};
    if (!name || !sectionsJson) {
      throw new ValidationError('Name and menu sections are required');
    }
    let validSections;
    try {
      const rawSections = typeof sectionsJson === 'string' ? JSON.parse(sectionsJson) : sectionsJson;
      validSections = menuTemplateSectionsSchema.parse(rawSections);
    } catch {
      throw new ValidationError('Template must include at least one section with one priced item');
    }
    const created = await fastify.prisma.menuPresetTemplate.create({
      data: {
        name,
        nameAmharic: nameAmharic || null,
        description: description || null,
        category: category || 'General',
        sectionsJson: JSON.stringify(validSections)
      },
    });
    return reply.status(201).send({
      id: created.id,
      name: created.name,
      nameAmharic: created.nameAmharic,
      description: created.description,
      category: created.category,
      sectionsJson: created.sectionsJson,
      createdAt: created.createdAt.toISOString(),
    });
  });

  fastify.patch('/templates/:id', async (request: any, reply) => {
    const { id } = request.params;
    const { name, nameAmharic, description, category, sectionsJson } = request.body || {};
    let normalizedSectionsJson: string | undefined;
    if (sectionsJson !== undefined) {
      try {
        const rawSections = typeof sectionsJson === 'string' ? JSON.parse(sectionsJson) : sectionsJson;
        normalizedSectionsJson = JSON.stringify(menuTemplateSectionsSchema.parse(rawSections));
      } catch {
        throw new ValidationError('Template must include at least one section with one priced item');
      }
    }
    const updated = await fastify.prisma.menuPresetTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(nameAmharic !== undefined && { nameAmharic }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(normalizedSectionsJson !== undefined && { sectionsJson: normalizedSectionsJson }),
      }
    });
    return reply.status(200).send({
      id: updated.id,
      name: updated.name,
      nameAmharic: updated.nameAmharic,
      description: updated.description,
      category: updated.category,
      sectionsJson: updated.sectionsJson,
      createdAt: updated.createdAt.toISOString(),
    });
  });

  fastify.delete('/templates/:id', async (request: any, reply) => {
    const { id } = request.params;
    await fastify.prisma.menuPresetTemplate.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ─── INVOICING & PAYMENTS ENDPOINTS ───────────────────
  fastify.get('/invoices', async (request, reply) => {
    const invoices = await fastify.prisma.tenantInvoice.findMany({
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return reply.status(200).send(
      invoices.map(inv => ({
        id: inv.id,
        companyId: inv.companyId,
        companyName: inv.company.name,
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.amount),
        currency: inv.currency,
        status: inv.status,
        paymentMethod: inv.paymentMethod,
        dueDate: inv.dueDate.toISOString(),
        paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
        createdAt: inv.createdAt.toISOString(),
      }))
    );
  });

  fastify.post('/invoices', async (request: any, reply) => {
    const { companyId, invoiceNumber, amount, currency, paymentMethod, dueDateDays } = request.body || {};
    if (!companyId || !amount) {
      throw new Error('companyId and amount are required');
    }
    const num = invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
    const dueDate = new Date(Date.now() + (dueDateDays || 14) * 86400000);

    const created = await fastify.prisma.tenantInvoice.create({
      data: {
        companyId,
        invoiceNumber: num,
        amount,
        currency: currency || 'ETB',
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        dueDate,
      },
      include: { company: { select: { name: true } } },
    });

    return reply.status(201).send({
      id: created.id,
      companyId: created.companyId,
      companyName: created.company.name,
      invoiceNumber: created.invoiceNumber,
      amount: Number(created.amount),
      currency: created.currency,
      status: created.status,
      paymentMethod: created.paymentMethod,
      dueDate: created.dueDate.toISOString(),
      paidAt: null,
      createdAt: created.createdAt.toISOString(),
    });
  });

  fastify.patch('/invoices/:id/mark-paid', async (request: any, reply) => {
    const { id } = request.params;
    const updated = await fastify.prisma.tenantInvoice.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
      include: { company: { select: { name: true } } },
    });

    return reply.status(200).send({
      id: updated.id,
      companyId: updated.companyId,
      companyName: updated.company.name,
      invoiceNumber: updated.invoiceNumber,
      amount: Number(updated.amount),
      currency: updated.currency,
      status: updated.status,
      paymentMethod: updated.paymentMethod,
      dueDate: updated.dueDate.toISOString(),
      paidAt: updated.paidAt ? updated.paidAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
    });
  });

  // ─── TENANT DATA EXPORT ───────────────────────────────
  fastify.post('/tenants/:id/export', async (request: any, reply) => {
    const { id } = request.params;
    const company = await fastify.prisma.company.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            menus: { include: { sections: { include: { items: true } } } },
            tables: true,
            orders: { include: { items: true } },
          },
        },
        staff: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!company) throw new NotFoundError('Tenant company not found');

    return reply.status(200).send({
      exportDate: new Date().toISOString(),
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        planTier: company.planTier,
        status: company.status,
      },
      staff: company.staff,
      branches: company.branches,
    });
  });

  // ─── SYSTEM SETTINGS ENDPOINTS ─────────────────────────
  fastify.get('/settings', async (request, reply) => {
    const settings = await fastify.prisma.systemSetting.findMany();
    if (settings.length === 0) {
      // Seed default settings
      const defaults = [
        { key: 'DEFAULT_CURRENCY', value: 'ETB', description: 'Platform default billing currency' },
        { key: 'SUPPORT_EMAIL', value: 'support@system.com', description: 'Primary platform support email' },
        { key: 'PLATFORM_NAME', value: 'QR Menu SaaS', description: 'White-label application title' },
        { key: 'MAINTENANCE_MODE', value: 'false', description: 'System-wide maintenance state' },
      ];
      for (const def of defaults) {
        await fastify.prisma.systemSetting.create({ data: def });
      }
      const seeded = await fastify.prisma.systemSetting.findMany();
      return reply.status(200).send(seeded);
    }
    return reply.status(200).send(settings);
  });

  fastify.patch('/settings', async (request: any, reply) => {
    const { key, value, description } = request.body || {};
    if (!key || value === undefined) {
      throw new Error('Key and value are required');
    }
    const updated = await fastify.prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value), description },
      create: { key, value: String(value), description },
    });
    return reply.status(200).send(updated);
  });
}
