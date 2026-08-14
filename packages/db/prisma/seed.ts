import { PrismaClient, QrMode, MenuStatus, StaffRole } from '@prisma/client';
import { randomUUID } from 'crypto';

import bcrypt from 'bcryptjs';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── Company ────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
    },
  });
  console.log(`✅ Company: ${company.name}`);

  // ─── Branch ─────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where: { slug: 'downtown' },
    update: {},
    create: {
      id: randomUUID(),
      companyId: company.id,
      name: 'Downtown Branch',
      slug: 'downtown',
      qrMode: QrMode.PER_TABLE,
    },
  });
  console.log(`✅ Branch: ${branch.name} (slug: ${branch.slug})`);

  // ─── Super Admin ─────────────────────────────────
  const superAdminHash = await hashPassword('changeme');
  const superAdmin = await prisma.staff.upsert({
    where: { email: 'superadmin@system.com' },
    update: {},
    create: {
      id: randomUUID(),
      companyId: null,
      branchId: null,
      name: 'Platform Super Admin',
      email: 'superadmin@system.com',
      passwordHash: superAdminHash,
      role: StaffRole.SUPER_ADMIN,
    },
  });
  console.log(`✅ Super Admin: ${superAdmin.email}`);

  // ─── Staff ──────────────────────────────────────
  const adminHash = await hashPassword('changeme');
  const waiterHash = await hashPassword('changeme');

  const admin = await prisma.staff.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      id: randomUUID(),
      companyId: company.id,
      branchId: null, // Company-wide admin
      name: 'Admin User',
      email: 'admin@demo.com',
      passwordHash: adminHash,
      role: StaffRole.ADMIN,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  const waiter = await prisma.staff.upsert({
    where: { email: 'waiter@demo.com' },
    update: {},
    create: {
      id: randomUUID(),
      companyId: company.id,
      branchId: branch.id,
      name: 'Waiter One',
      email: 'waiter@demo.com',
      passwordHash: waiterHash,
      role: StaffRole.STAFF,
    },
  });
  console.log(`✅ Waiter: ${waiter.email}`);

  // ─── Tables ─────────────────────────────────────
  for (let i = 1; i <= 5; i++) {
    await prisma.table.upsert({
      where: {
        branchId_label: { branchId: branch.id, label: String(i) },
      },
      update: {},
      create: {
        id: randomUUID(),
        branchId: branch.id,
        label: String(i),
      },
    });
  }
  console.log(`✅ Tables: 1–5`);

  // ─── Menu ───────────────────────────────────────
  // Delete existing orders and items for this branch to start fresh without foreign key violations
  await prisma.orderItem.deleteMany({
    where: {
      order: {
        branchId: branch.id
      }
    }
  });
  await prisma.order.deleteMany({
    where: {
      branchId: branch.id
    }
  });
  
  // Delete existing menus for this branch to start fresh
  await prisma.menu.deleteMany({ where: { branchId: branch.id } });

  const menu = await prisma.menu.create({
    data: {
      id: randomUUID(),
      branchId: branch.id,
      name: 'Main Menu',
      status: MenuStatus.PUBLISHED,
    },
  });
  console.log(`✅ Menu: ${menu.name} (${menu.status})`);

  // ─── Sections & Items ──────────────────────────

  // Appetizers
  const appetizers = await prisma.menuSection.create({
    data: {
      id: randomUUID(),
      menuId: menu.id,
      name: 'Appetizers',
      sortOrder: 0,
    },
  });

  const appetizerItems = [
    {
      name: 'Crispy Spring Rolls',
      description: 'Golden fried vegetable spring rolls served with sweet chili dipping sauce',
      price: 8.99,
    },
    {
      name: 'Bruschetta Trio',
      description: 'Toasted ciabatta topped with tomato-basil, mushroom-truffle, and roasted pepper',
      price: 11.50,
    },
    {
      name: 'Soup of the Day',
      description: 'Ask your server for today\'s freshly made soup, served with artisan bread',
      price: 7.00,
    },
    {
      name: 'Grilled Halloumi Salad',
      description: 'Warm halloumi on mixed greens with pomegranate seeds, walnuts, and honey-lemon dressing',
      price: 12.50,
    },
  ];

  for (let i = 0; i < appetizerItems.length; i++) {
    await prisma.menuItem.create({
      data: {
        id: randomUUID(),
        sectionId: appetizers.id,
        ...appetizerItems[i],
        sortOrder: i,
      },
    });
  }
  console.log(`  📋 ${appetizers.name}: ${appetizerItems.length} items`);

  // Main Course
  const mains = await prisma.menuSection.create({
    data: {
      id: randomUUID(),
      menuId: menu.id,
      name: 'Main Course',
      sortOrder: 1,
    },
  });

  const mainItems = [
    {
      name: 'Grilled Ribeye Steak',
      description: '300g grass-fed ribeye with roasted garlic butter, seasonal vegetables, and hand-cut fries',
      price: 28.00,
    },
    {
      name: 'Pan-Seared Salmon',
      description: 'Atlantic salmon with lemon-dill sauce, asparagus, and saffron risotto',
      price: 24.50,
    },
    {
      name: 'Wild Mushroom Risotto',
      description: 'Arborio rice with mixed wild mushrooms, parmesan, truffle oil, and fresh herbs',
      price: 18.00,
    },
    {
      name: 'Classic Beef Burger',
      description: 'Angus beef patty with cheddar, caramelized onions, lettuce, tomato, and house sauce on a brioche bun',
      price: 16.50,
    },
  ];

  for (let i = 0; i < mainItems.length; i++) {
    await prisma.menuItem.create({
      data: {
        id: randomUUID(),
        sectionId: mains.id,
        ...mainItems[i],
        sortOrder: i,
      },
    });
  }
  console.log(`  📋 ${mains.name}: ${mainItems.length} items`);

  // Drinks
  const drinks = await prisma.menuSection.create({
    data: {
      id: randomUUID(),
      menuId: menu.id,
      name: 'Drinks',
      sortOrder: 2,
    },
  });

  const drinkItems = [
    {
      name: 'Fresh Lemonade',
      description: 'House-made with fresh lemons, mint, and a touch of honey',
      price: 5.00,
    },
    {
      name: 'Mango Smoothie',
      description: 'Blended mango, banana, yogurt, and a splash of orange juice',
      price: 7.50,
    },
    {
      name: 'Espresso',
      description: 'Double-shot single-origin espresso',
      price: 3.50,
    },
  ];

  for (let i = 0; i < drinkItems.length; i++) {
    await prisma.menuItem.create({
      data: {
        id: randomUUID(),
        sectionId: drinks.id,
        ...drinkItems[i],
        sortOrder: i,
      },
    });
  }
  console.log(`  📋 ${drinks.name}: ${drinkItems.length} items`);

  console.log('\n✅ Seed complete!');
  console.log('\n📌 Login credentials:');
  console.log('   Super Admin: superadmin@system.com / changeme');
  console.log('   Tenant Admin: admin@demo.com / changeme');
  console.log('   Waiter: waiter@demo.com / changeme');
  console.log(`\n📌 Customer menu URL: http://localhost:3000/${branch.slug}?table=1`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
