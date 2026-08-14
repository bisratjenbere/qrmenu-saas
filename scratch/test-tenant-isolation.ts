import { PrismaClient, StaffRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function testTenantIsolation() {
  console.log('🧪 Starting Tenant Isolation Test...');

  // 1. Create Company A, Branch X, Staff X
  const companyA = await prisma.company.create({
    data: {
      name: 'Company A',
      slug: `company-a-${Date.now()}`,
    },
  });

  const branchX = await prisma.branch.create({
    data: {
      companyId: companyA.id,
      name: 'Branch X',
      slug: `branch-x-${Date.now()}`,
    },
  });

  const staffX = await prisma.staff.create({
    data: {
      companyId: companyA.id,
      branchId: branchX.id,
      name: 'Staff X',
      email: `staff-x-${Date.now()}@test.com`,
      passwordHash: 'dummy',
      role: StaffRole.STAFF,
    },
  });

  // 2. Create Company B, Branch Y, Order Y
  const companyB = await prisma.company.create({
    data: {
      name: 'Company B',
      slug: `company-b-${Date.now()}`,
    },
  });

  const branchY = await prisma.branch.create({
    data: {
      companyId: companyB.id,
      name: 'Branch Y',
      slug: `branch-y-${Date.now()}`,
    },
  });

  const orderY = await prisma.order.create({
    data: {
      branchId: branchY.id,
      tableNumber: '1',
      idempotencyKey: randomUUID(),
      status: 'NEW',
    },
  });

  console.log(`Created Branch X (Company A) and Order Y (Branch Y, Company B ID: ${orderY.id})`);

  // 3. Simulate Staff X trying to access Order Y
  // We mimic the route logic of PATCH /orders/:id
  const orderId = orderY.id;
  const staffBranchId = staffX.branchId;

  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { branch: true },
  });

  if (!existingOrder) {
    console.log('❌ Test Failed: Order Y not found at all.');
    await cleanup([companyA.id, companyB.id]);
    return;
  }

  console.log(`Staff X belongs to Branch: ${staffBranchId}`);
  console.log(`Order Y belongs to Branch: ${existingOrder.branchId}`);

  // Scoping check in route:
  if (staffX.role !== StaffRole.ADMIN && staffBranchId !== existingOrder.branchId) {
    // Currently, order.routes.ts does:
    // throw new ConflictError('Not authorized for this order');
    // But it SHOULD return 404 NotFound to prevent leakage!
    console.log('🔍 CURRENT BEHAVIOR: Throws authorization error (409 Conflict/Forbidden), leaking existence.');
  }

  // Verify that scoping with the branchId directly on the query is safer:
  const scopedOrder = await prisma.order.findFirst({
    where: {
      id: orderId,
      branchId: staffBranchId || undefined, // or branch: { companyId: staffX.companyId }
    },
  });

  if (!scopedOrder) {
    console.log('✅ PASS: Scoped query successfully returned null (would result in 404 NotFound, preventing leakage).');
  } else {
    console.log('❌ FAIL: Scoped query returned the order!');
  }

  // Cleanup
  await cleanup([companyA.id, companyB.id]);
  console.log('🧹 Cleanup complete.');
}

async function cleanup(ids: string[]) {
  await prisma.company.deleteMany({
    where: { id: { in: ids } },
  });
}

testTenantIsolation()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
