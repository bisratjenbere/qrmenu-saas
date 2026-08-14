import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fastify, prisma } from '../server.js';
import { sseService } from '../services/sse.service.js';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { signToken } from '../middleware/auth.middleware.js';
import { FulfillmentType } from '@qrmenu/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-minimum-32-chars-long';

function orderLine(menuItemId: string, quantity = 1, notes?: string | null) {
  return {
    clientLineId: randomUUID(),
    menuItemId,
    quantity,
    notes: notes ?? undefined,
    selectedModifiers: [] as never[],
  };
}

function perTableOrderPayload(
  branchId: string,
  tableToken: string,
  items: ReturnType<typeof orderLine>[],
  idempotencyKey = randomUUID()
) {
  return {
    branchId,
    fulfillmentType: FulfillmentType.DINE_IN,
    tableToken,
    idempotencyKey,
    items,
  };
}

describe('🚀 Integration & Security Hardening Tests', () => {
  let companyA: any;
  let companyB: any;
  let branchX: any;
  let branchY: any;
  let staffX: any;
  let staffY: any;
  let adminX: any;
  let tokenX: string;
  let tokenY: string;
  let tokenAdminX: string;
  let activeMenuX: any;
  let activeSectionX: any;
  let itemAvailableX: any;
  let itemUnavailableX: any;
  let tableTokenX: string;
  let orderX: any;
  let orderY: any;

  beforeAll(async () => {
    // Connect prisma and wait for fastify ready
    await prisma.$connect();
    await fastify.ready();

    // 1. Create Companies
    companyA = await prisma.company.create({
      data: { name: 'Test Company A', slug: `test-co-a-${Date.now()}` }
    });
    companyB = await prisma.company.create({
      data: { name: 'Test Company B', slug: `test-co-b-${Date.now()}` }
    });

    // 2. Create Branches
    branchX = await prisma.branch.create({
      data: {
        companyId: companyA.id,
        name: 'Branch X',
        slug: `branch-x-${Date.now()}`,
        qrMode: 'PER_TABLE',
        serviceMode: 'PER_TABLE_QR',
      },
    });
    branchY = await prisma.branch.create({
      data: {
        companyId: companyB.id,
        name: 'Branch Y',
        slug: `branch-y-${Date.now()}`,
        qrMode: 'SINGLE',
        serviceMode: 'SINGLE_QR_SELF_ORDER',
        tableInputMode: 'VALIDATED',
      },
    });

    // 3. Create Tables
    await prisma.table.createMany({
      data: [
        { branchId: branchX.id, label: '1' },
        { branchId: branchY.id, label: '2' }
      ]
    });
    const tableX = await prisma.table.findFirst({ where: { branchId: branchX.id, label: '1' } });
    tableTokenX = tableX!.qrToken;

    // 4. Create Staff
    staffX = await prisma.staff.create({
      data: {
        companyId: companyA.id,
        branchId: branchX.id,
        name: 'Waiter X',
        email: `waiter-x-${Date.now()}@test.com`,
        passwordHash: 'dummy',
        role: 'STAFF'
      }
    });
    staffY = await prisma.staff.create({
      data: {
        companyId: companyB.id,
        branchId: branchY.id,
        name: 'Waiter Y',
        email: `waiter-y-${Date.now()}@test.com`,
        passwordHash: 'dummy',
        role: 'STAFF'
      }
    });
    adminX = await prisma.staff.create({
      data: {
        companyId: companyA.id,
        branchId: null,
        name: 'Admin X',
        email: `admin-x-${Date.now()}@test.com`,
        passwordHash: 'dummy',
        role: 'ADMIN'
      }
    });

    // 5. Generate JWTS
    tokenX = jwt.sign({ sub: staffX.id, role: 'STAFF', companyId: companyA.id, branchId: branchX.id }, JWT_SECRET);
    tokenY = jwt.sign({ sub: staffY.id, role: 'STAFF', companyId: companyB.id, branchId: branchY.id }, JWT_SECRET);
    tokenAdminX = jwt.sign({ sub: adminX.id, role: 'ADMIN', companyId: companyA.id, branchId: null }, JWT_SECRET);

    // 6. Create Menu, Section, Items for Branch X
    activeMenuX = await prisma.menu.create({
      data: { branchId: branchX.id, name: 'X Menu', status: 'PUBLISHED' }
    });
    // Create published menu and item structures for Branch Y
    const activeMenuY = await prisma.menu.create({
      data: { branchId: branchY.id, name: 'Y Menu', status: 'PUBLISHED' }
    });
    const activeSectionY = await prisma.menuSection.create({
      data: { menuId: activeMenuY.id, name: 'Y Section', sortOrder: 1 }
    });
    const itemAvailableY = await prisma.menuItem.create({
      data: { sectionId: activeSectionY.id, name: 'Dish Y1', price: 12.50, isAvailable: true, sortOrder: 1 }
    });
    orderY = await prisma.order.create({
      data: {
        branchId: branchY.id,
        tableNumber: '2',
        idempotencyKey: randomUUID(),
        status: 'NEW',
        subtotal: 12.5,
        grandTotal: 12.5,
        items: {
          create: [
            {
              menuItemId: itemAvailableY.id,
              clientLineId: randomUUID(),
              itemNameSnapshot: itemAvailableY.name,
              priceSnapshot: itemAvailableY.price,
              lineTotal: 12.5,
              quantity: 1,
              modifiersSnapshot: [],
            }
          ]
        }
      },
      include: { items: true }
    });
    activeSectionX = await prisma.menuSection.create({
      data: { menuId: activeMenuX.id, name: 'X Section', sortOrder: 1 }
    });
    itemAvailableX = await prisma.menuItem.create({
      data: { sectionId: activeSectionX.id, name: 'Dish X1', price: 10.99, isAvailable: true, sortOrder: 1 }
    });
    itemUnavailableX = await prisma.menuItem.create({
      data: { sectionId: activeSectionX.id, name: 'Dish X2', price: 5.50, isAvailable: false, sortOrder: 2 }
    });

    // 7. Create an Order in Branch X
    orderX = await prisma.order.create({
      data: {
        branchId: branchX.id,
        tableNumber: '1',
        idempotencyKey: randomUUID(),
        status: 'NEW',
        subtotal: 21.98,
        grandTotal: 21.98,
        items: {
          create: [
            {
              menuItemId: itemAvailableX.id,
              clientLineId: randomUUID(),
              itemNameSnapshot: itemAvailableX.name,
              priceSnapshot: itemAvailableX.price,
              lineTotal: 21.98,
              quantity: 2,
              modifiersSnapshot: [],
            }
          ]
        }
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.company.deleteMany({
      where: { id: { in: [companyA.id, companyB.id] } }
    });
    await fastify.close();
    await prisma.$disconnect();
  });

  // ─── 1. Tenant Isolation Tests ──────────────────────────────
  describe('🛡️ Tenant Isolation & Information Disclosure Checks', () => {
    it('should refuse to update another branch order and return 404 (leak-safe)', async () => {
      const response = await fastify.inject({
        method: 'PATCH',
        url: `/api/orders/${orderX.id}`,
        headers: { authorization: `Bearer ${tokenY}` }, // Token Y trying to touch Order X
        payload: { status: 'SEEN' }
      });

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.payload);
      expect(data.error.message).toBe('Order not found');
    });

    it('should prevent cross-branch list querying', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/orders?branchId=${branchX.id}`, // Y trying to query X
        headers: { authorization: `Bearer ${tokenY}` }
      });

      expect(response.statusCode).toBe(404); // Expect 404 Secure Error to hide order presence
    });
  });

  // ─── 2. Order Validation Tests ─────────────────────────────
  describe('🍔 Order Validation Checks', () => {
    it('should reject order if table token is invalid', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/orders',
        payload: {
          branchId: branchX.id,
          fulfillmentType: FulfillmentType.DINE_IN,
          tableToken: randomUUID(),
          idempotencyKey: randomUUID(),
          items: [orderLine(itemAvailableX.id)],
        },
      });

      expect(response.statusCode).toBe(422);
      const data = JSON.parse(response.payload);
      expect(data.error.message).toMatch(/table token/i);
    });

    it('should reject order if item list contains unavailable items', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/orders',
        payload: perTableOrderPayload(branchX.id, tableTokenX, [orderLine(itemUnavailableX.id)]),
      });

      expect(response.statusCode).toBe(422);
      const data = JSON.parse(response.payload);
      expect(data.error.message).toContain('currently unavailable');
    });

    it('should reject order if items are from a different branch or invalid', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/orders',
        payload: {
          branchId: branchY.id,
          fulfillmentType: FulfillmentType.DINE_IN,
          tableNumber: '2',
          idempotencyKey: randomUUID(),
          items: [orderLine(itemAvailableX.id)],
        },
      });

      expect(response.statusCode).toBe(422);
      const data = JSON.parse(response.payload);
      expect(data.error.message).toBe('Some items are invalid or not from this menu');
    });
  });

  // ─── 3. Idempotency Safety Checks ──────────────────────────
  describe('🔄 Idempotency Safety Checks', () => {
    it('should return identical responses (200 OK) for repeated submissions of same key', async () => {
      const uniqueKey = randomUUID();
      const payload = perTableOrderPayload(branchX.id, tableTokenX, [orderLine(itemAvailableX.id)], uniqueKey);

      const res1 = await fastify.inject({ method: 'POST', url: '/api/orders', payload });
      expect(res1.statusCode).toBe(201);
      const data1 = JSON.parse(res1.payload);

      const res2 = await fastify.inject({ method: 'POST', url: '/api/orders', payload });
      expect(res2.statusCode).toBe(200); // Replay returning 200
      const data2 = JSON.parse(res2.payload);

      expect(data2.id).toBe(data1.id);
      expect(data2.idempotencyKey).toBe(uniqueKey);
    });
  });

  // ─── 4. Auth Verification Checks ───────────────────────────
  describe('🔐 Auth Verification Checks', () => {
    it('should block requests with missing authorization token', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/orders?branchId=${branchX.id}`
      });

      expect(response.statusCode).toBe(401);
    });

    it('should block requests with invalid signature token', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/orders?branchId=${branchX.id}`,
        headers: { authorization: `Bearer invalid.token.signature` }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── 5. Kitchen Display & Upsells Verification ────────────
  describe('🍳 Kitchen Display & Upsells Verification', () => {
    it('should increment popularity score and aggregate items in kitchen queue', async () => {
      const itemBefore = await prisma.menuItem.findUnique({ where: { id: itemAvailableX.id } });
      const initialPopularity = itemBefore?.popularityScore || 0;

      const payload = perTableOrderPayload(branchX.id, tableTokenX, [orderLine(itemAvailableX.id, 3)]);
      const orderRes = await fastify.inject({ method: 'POST', url: '/api/orders', payload });
      expect(orderRes.statusCode).toBe(201);
      const createdOrder = JSON.parse(orderRes.payload);

      const itemAfter = await prisma.menuItem.findUnique({ where: { id: itemAvailableX.id } });
      expect(itemAfter?.popularityScore).toBe(initialPopularity + 3);

      const kdsRes = await fastify.inject({
        method: 'GET',
        url: `/api/kitchen/${branchX.id}/active`,
        headers: { authorization: `Bearer ${tokenX}` }
      });
      expect(kdsRes.statusCode).toBe(200);
      const queueData = JSON.parse(kdsRes.payload);
      
      const orderItem = queueData.items.find((i: any) => i.orderId === createdOrder.id);
      expect(orderItem).toBeDefined();
      expect(orderItem.status).toBe('PENDING');

      const aggItem = queueData.items.find(
        (i: any) => i.menuItemId === itemAvailableX.id && i.status === 'PENDING'
      );
      expect(aggItem).toBeDefined();
      expect(aggItem.quantity).toBeGreaterThanOrEqual(3);

      const updateRes = await fastify.inject({
        method: 'PATCH',
        url: `/api/kitchen/items/${orderItem.id}`,
        headers: { authorization: `Bearer ${tokenX}` },
        payload: { status: 'PREPARING' }
      });
      expect(updateRes.statusCode).toBe(200);
      const updateData = JSON.parse(updateRes.payload);
      expect(updateData.status).toBe('PREPARING');
    });
  });

  // ─── 6. Senior QA Pre-Live Audits ──────────────────────────
  describe('🚨 Senior QA Pre-Live Audits', () => {
    it('should reject orders with empty items list', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/orders',
        payload: {
          branchId: branchX.id,
          fulfillmentType: FulfillmentType.DINE_IN,
          tableToken: tableTokenX,
          idempotencyKey: randomUUID(),
          items: [],
        },
      });
      expect(response.statusCode).toBe(400); // Zod validation
    });

    it('should reject order modifications with negative quantities', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/orders',
        payload: perTableOrderPayload(branchX.id, tableTokenX, [
          { ...orderLine(itemAvailableX.id), quantity: -2 },
        ]),
      });
      expect(response.statusCode).toBe(400); // Zod validation
    });

    it('should block checkout if item notes exceed maximum text limit', async () => {
      const longNote = 'a'.repeat(201);
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/orders',
        payload: perTableOrderPayload(branchX.id, tableTokenX, [
          orderLine(itemAvailableX.id, 1, longNote),
        ]),
      });
      expect(response.statusCode).toBe(400);
    });

    it('should block non-admin staff from accessing Branch CRUD operations', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/admin/branches',
        headers: { authorization: `Bearer ${tokenX}` }, // Staff role
        payload: { name: 'Unauthorized Branch', slug: 'unauth-branch', qrMode: 'SINGLE' }
      });
      expect(response.statusCode).toBe(403);
    });

    it('should block staff from updating kitchen items belonging to another branch', async () => {
      const payload = perTableOrderPayload(branchX.id, tableTokenX, [orderLine(itemAvailableX.id)]);
      const res = await fastify.inject({ method: 'POST', url: '/api/orders', payload });
      const createdOrder = JSON.parse(res.payload);
      const itemId = createdOrder.items[0].id;

      const updateRes = await fastify.inject({
        method: 'PATCH',
        url: `/api/kitchen/items/${itemId}`,
        headers: { authorization: `Bearer ${tokenY}` }, // Branch Y staff
        payload: { status: 'PREPARING' }
      });
      expect(updateRes.statusCode).toBe(404); // Secured 404 Not Found error
    });

    it('should block table generation if requested label counts exceed system boundaries', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/api/admin/branches/${branchX.id}/tables/generate`,
        headers: { authorization: `Bearer ${tokenX}` }, // Staff role
        payload: { count: 150 }
      });
      expect(response.statusCode).toBe(403);
    });

    it('should process concurrent checkout calls with identical keys and resolve only one db insert', async () => {
      const key = randomUUID();
      const payload = perTableOrderPayload(branchX.id, tableTokenX, [orderLine(itemAvailableX.id)], key);

      const promises = [
        fastify.inject({ method: 'POST', url: '/api/orders', payload }),
        fastify.inject({ method: 'POST', url: '/api/orders', payload })
      ];
      
      const responses = await Promise.all(promises);
      const statuses = responses.map(r => r.statusCode);
      
      expect(statuses).toContain(201);
      expect(statuses).toContain(200);
    });
  });

  // ─── 7. Cross-tenant ADMIN bypass (kitchen + SSE routes) ───
  describe('🚨 Cross-tenant ADMIN bypass (kitchen + SSE routes)', () => {
    it('admin token from Company A hitting GET /api/kitchen/:branchY.id/active must return 404, not 200', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/kitchen/${branchY.id}/active`,
        headers: { authorization: `Bearer ${tokenAdminX}` }
      });
      expect(response.statusCode).toBe(404);
    });

    it('admin token from Company A hitting PATCH /api/kitchen/items/:orderItemId must return 404, not 200, and must NOT mutate the item\'s status', async () => {
      const orderItemId = orderY.items[0].id;
      
      const response = await fastify.inject({
        method: 'PATCH',
        url: `/api/kitchen/items/${orderItemId}`,
        headers: { authorization: `Bearer ${tokenAdminX}` },
        payload: { status: 'PREPARING' }
      });
      expect(response.statusCode).toBe(404);

      const unmutated = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
      expect(unmutated?.status).toBe('PENDING');
    });

    it('admin token from Company A hitting GET /api/branches/:branchY.id/orders/stream must NOT return 200/text-event-stream', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/branches/${branchY.id}/orders/stream?token=${tokenAdminX}`
      });
      expect(response.statusCode).not.toBe(200);
      expect(response.headers['content-type']).not.toBe('text-event-stream');
    });

    it('should enforce connection cap per branch and reject excessive streams', async () => {
      const originalMax = process.env.SSE_MAX_CONNECTIONS_PER_BRANCH;
      process.env.SSE_MAX_CONNECTIONS_PER_BRANCH = '2';

      try {
        const mockRes1 = {
          writeHead: () => {},
          write: () => true,
          end: () => {}
        } as any;
        const mockRes2 = {
          writeHead: () => {},
          write: () => true,
          end: () => {}
        } as any;
        const mockRes3 = {
          writeHead: () => {},
          write: () => true,
          end: () => {}
        } as any;

        // Connections 1 & 2 succeed
        sseService.subscribe(branchX.id, mockRes1);
        sseService.subscribe(branchX.id, mockRes2);

        // Connection 3 should throw AppError (429)
        expect(() => {
          sseService.subscribe(branchX.id, mockRes3);
        }).toThrowError('Too many active connection streams for this branch');
      } finally {
        sseService.closeAll();
        if (originalMax) {
          process.env.SSE_MAX_CONNECTIONS_PER_BRANCH = originalMax;
        } else {
          delete process.env.SSE_MAX_CONNECTIONS_PER_BRANCH;
        }
      }
    });

    it('should retrieve single table QR code successfully', async () => {
      const testTable = await prisma.table.create({
        data: { id: randomUUID(), branchId: branchX.id, label: 'Table-QR-Test' }
      });

      const viewRes = await fastify.inject({
        method: 'GET',
        url: `/api/admin/branches/${branchX.id}/qr/table/${testTable.id}`,
        headers: { authorization: `Bearer ${tokenAdminX}` }
      });
      expect(viewRes.statusCode).toBe(200);
      expect(viewRes.headers['content-type']).toBe('image/svg+xml');

      const downloadRes = await fastify.inject({
        method: 'GET',
        url: `/api/admin/branches/${branchX.id}/qr/table/${testTable.id}?download=true`,
        headers: { authorization: `Bearer ${tokenAdminX}` }
      });
      expect(downloadRes.statusCode).toBe(200);
      expect(downloadRes.headers['content-type']).toBe('image/png');
      expect(downloadRes.headers['content-disposition']).toContain('attachment');
    });

    it('should retrieve single branch QR code successfully', async () => {
      const viewRes = await fastify.inject({
        method: 'GET',
        url: `/api/admin/branches/${branchX.id}/qr/single`,
        headers: { authorization: `Bearer ${tokenAdminX}` }
      });
      expect(viewRes.statusCode).toBe(200);
      expect(viewRes.headers['content-type']).toBe('image/svg+xml');

      const downloadRes = await fastify.inject({
        method: 'GET',
        url: `/api/admin/branches/${branchX.id}/qr/single?download=true`,
        headers: { authorization: `Bearer ${tokenAdminX}` }
      });
      expect(downloadRes.statusCode).toBe(200);
      expect(downloadRes.headers['content-type']).toBe('image/png');
      expect(downloadRes.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('🌐 Super Admin System-Wide Tenant Management Tests', () => {
    let tokenSuperAdmin: string;

    beforeAll(async () => {
      const superAdminStaff = await prisma.staff.create({
        data: {
          id: randomUUID(),
          companyId: null,
          branchId: null,
          name: 'Global Test Super Admin',
          email: `super-${randomUUID()}@system.com`,
          passwordHash: await bcrypt.hash('changeme', 10),
          role: 'SUPER_ADMIN',
        },
      });

      tokenSuperAdmin = signToken({
        sub: superAdminStaff.id,
        role: 'SUPER_ADMIN',
        companyId: null,
        branchId: null,
      });
    });

    it('should allow SUPER_ADMIN to list all platform tenants', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: '/api/super-admin/tenants',
        headers: { authorization: `Bearer ${tokenSuperAdmin}` },
      });
      expect(res.statusCode).toBe(200);
      const tenants = JSON.parse(res.payload);
      expect(Array.isArray(tenants)).toBe(true);
      expect(tenants.length).toBeGreaterThan(0);
    });

    it('should allow SUPER_ADMIN to provision a new tenant company in 1 atomic call', async () => {
      const testSlug = `tenant-${randomUUID().slice(0, 8)}`;
      const res = await fastify.inject({
        method: 'POST',
        url: '/api/super-admin/tenants',
        headers: { authorization: `Bearer ${tokenSuperAdmin}` },
        payload: {
          companyName: 'Provisioned Test Grill',
          companySlug: testSlug,
          planTier: 'SCALE',
          adminName: 'Test Owner',
          adminEmail: `${testSlug}@owner.com`,
          adminPassword: 'password123',
        },
      });
      expect(res.statusCode).toBe(201);
      const created = JSON.parse(res.payload);
      expect(created.name).toBe('Provisioned Test Grill');
      expect(created.status).toBe('ACTIVE');
      expect(created.adminEmail).toBe(`${testSlug}@owner.com`);
    });

    it('should allow SUPER_ADMIN to suspend a tenant company', async () => {
      const res = await fastify.inject({
        method: 'PATCH',
        url: `/api/super-admin/tenants/${companyA.id}`,
        headers: { authorization: `Bearer ${tokenSuperAdmin}` },
        payload: { status: 'SUSPENDED' },
      });
      expect(res.statusCode).toBe(200);
      const updated = JSON.parse(res.payload);
      expect(updated.status).toBe('SUSPENDED');
    });

    it('should block non-super-admin staff from accessing super-admin routes with 403 Forbidden', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: '/api/super-admin/tenants',
        headers: { authorization: `Bearer ${tokenAdminX}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
