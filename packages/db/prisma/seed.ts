import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import { PrismaClient, QrMode, MenuStatus, StaffRole, ServiceMode } from '@prisma/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import {
  ETHIOPIAN_DEMO_BRANCH,
  ETHIOPIAN_DEMO_SECTIONS,
} from './ethiopian-seed-data';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database (Ethiopian demo)...\n');

  const company = await prisma.company.upsert({
    where: { slug: 'mesob-restaurant' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'Mesob Restaurant Group',
      slug: 'mesob-restaurant',
    },
  });
  console.log(`✅ Company: ${company.name}`);

  const branch = await prisma.branch.upsert({
    where: { slug: ETHIOPIAN_DEMO_BRANCH.slug },
    update: {
      name: ETHIOPIAN_DEMO_BRANCH.name,
      tagline: ETHIOPIAN_DEMO_BRANCH.tagline,
      currency: ETHIOPIAN_DEMO_BRANCH.currency,
      serviceChargePercent: ETHIOPIAN_DEMO_BRANCH.serviceChargePercent,
      vatPercent: ETHIOPIAN_DEMO_BRANCH.vatPercent,
      serviceMode: ServiceMode.SINGLE_QR_SELF_ORDER,
      qrMode: QrMode.SINGLE,
      primaryLanguage: 'AM',
      enableTakeaway: true,
      setupStep: 7,
      logoUrl: ETHIOPIAN_DEMO_BRANCH.logoUrl,
      coverImageUrl: ETHIOPIAN_DEMO_BRANCH.coverImageUrl,
      description: ETHIOPIAN_DEMO_BRANCH.description,
      address: ETHIOPIAN_DEMO_BRANCH.address,
      phone: ETHIOPIAN_DEMO_BRANCH.phone,
      mapUrl: ETHIOPIAN_DEMO_BRANCH.mapUrl,
      callWaiterEnabled: ETHIOPIAN_DEMO_BRANCH.callWaiterEnabled,
      requestBillEnabled: ETHIOPIAN_DEMO_BRANCH.requestBillEnabled,
    },
    create: {
      id: randomUUID(),
      companyId: company.id,
      name: ETHIOPIAN_DEMO_BRANCH.name,
      slug: ETHIOPIAN_DEMO_BRANCH.slug,
      qrMode: QrMode.SINGLE,
      serviceMode: ServiceMode.SINGLE_QR_SELF_ORDER,
      tagline: ETHIOPIAN_DEMO_BRANCH.tagline,
      currency: ETHIOPIAN_DEMO_BRANCH.currency,
      serviceChargePercent: ETHIOPIAN_DEMO_BRANCH.serviceChargePercent,
      vatPercent: ETHIOPIAN_DEMO_BRANCH.vatPercent,
      primaryLanguage: 'AM',
      enableTakeaway: true,
      setupStep: 7,
      logoUrl: ETHIOPIAN_DEMO_BRANCH.logoUrl,
      coverImageUrl: ETHIOPIAN_DEMO_BRANCH.coverImageUrl,
      description: ETHIOPIAN_DEMO_BRANCH.description,
      address: ETHIOPIAN_DEMO_BRANCH.address,
      phone: ETHIOPIAN_DEMO_BRANCH.phone,
      mapUrl: ETHIOPIAN_DEMO_BRANCH.mapUrl,
      callWaiterEnabled: ETHIOPIAN_DEMO_BRANCH.callWaiterEnabled,
      requestBillEnabled: ETHIOPIAN_DEMO_BRANCH.requestBillEnabled,
    },
  });
  console.log(`✅ Branch: ${branch.name} (${branch.slug})`);

  const superAdminHash = await hashPassword('changeme');
  await prisma.staff.upsert({
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

  const adminHash = await hashPassword('changeme');
  await prisma.staff.upsert({
    where: { email: 'admin@mesob.com' },
    update: {},
    create: {
      id: randomUUID(),
      companyId: company.id,
      name: 'Restaurant Admin',
      email: 'admin@mesob.com',
      passwordHash: adminHash,
      role: StaffRole.ADMIN,
    },
  });

  await prisma.staff.upsert({
    where: { email: 'waiter@mesob.com' },
    update: {},
    create: {
      id: randomUUID(),
      companyId: company.id,
      branchId: branch.id,
      name: 'Waiter One',
      email: 'waiter@mesob.com',
      passwordHash: adminHash,
      role: StaffRole.STAFF,
    },
  });
  console.log('✅ Staff accounts created');

  for (let i = 1; i <= 8; i++) {
    await prisma.table.upsert({
      where: { branchId_label: { branchId: branch.id, label: String(i) } },
      update: {},
      create: {
        id: randomUUID(),
        branchId: branch.id,
        label: String(i),
      },
    });
  }
  console.log('✅ Tables 1–8');

  await prisma.orderItem.deleteMany({
    where: { order: { branchId: branch.id } },
  });
  await prisma.order.deleteMany({ where: { branchId: branch.id } });
  await prisma.menu.deleteMany({ where: { branchId: branch.id } });

  const menu = await prisma.menu.create({
    data: {
      id: randomUUID(),
      branchId: branch.id,
      name: 'Main Menu',
      status: MenuStatus.PUBLISHED,
      version: 1,
      publishedAt: new Date(),
    },
  });

  for (let sIndex = 0; sIndex < ETHIOPIAN_DEMO_SECTIONS.length; sIndex++) {
    const sec = ETHIOPIAN_DEMO_SECTIONS[sIndex];
    const section = await prisma.menuSection.create({
      data: {
        id: randomUUID(),
        menuId: menu.id,
        name: sec.name,
        nameAmharic: sec.nameAmharic,
        timeSlot: sec.timeSlot,
        sortOrder: sIndex,
        isVisible: true,
      },
    });

    for (let iIndex = 0; iIndex < sec.items.length; iIndex++) {
      const item = sec.items[iIndex];
      const created = await prisma.menuItem.create({
        data: {
          id: randomUUID(),
          sectionId: section.id,
          name: item.name,
          nameAmharic: item.nameAmharic,
          description: item.description,
          descriptionAmharic: item.descriptionAmharic,
          price: item.price,
          spiceLevel: item.spiceLevel ?? 0,
          dietaryLabels: item.dietaryLabels ?? [],
          allergens: item.allergens ?? [],
          prepTimeMin: item.prepTimeMin,
          servingSize: item.servingSize,
          isCombo: item.isCombo ?? false,
          comboItemCount: item.comboItemCount,
          popularityScore: item.popularityScore ?? 0,
          photoUrl: item.photoUrl,
          isAvailable: true,
          sortOrder: iIndex,
        },
      });

      if (item.name === 'Kitfo') {
        const cookingGroup = await prisma.modifierGroup.create({
          data: {
            id: randomUUID(),
            menuItemId: created.id,
            name: 'Cooking preference',
            nameAmharic: 'የክትፎ ምግብ',
            required: true,
            minSelect: 1,
            maxSelect: 1,
            sortOrder: 0,
          },
        });
        const options = [
          { name: 'Raw (Tere)', nameAmharic: 'ቴሬ' },
          { name: 'Leb leb', nameAmharic: 'leb leb' },
          { name: 'Well done', nameAmharic: 'ደህንነቱ የተጠበቀ' },
        ];
        for (let o = 0; o < options.length; o++) {
          await prisma.modifierOption.create({
            data: {
              id: randomUUID(),
              groupId: cookingGroup.id,
              name: options[o].name,
              nameAmharic: options[o].nameAmharic,
              sortOrder: o,
            },
          });
        }
      }
    }
    console.log(`  📋 ${sec.nameAmharic}: ${sec.items.length} items`);
  }

  console.log('\n✅ Seed complete!');
  console.log('\n📌 Logins: superadmin@system.com / admin@mesob.com / waiter@mesob.com — password: changeme');
  console.log(`📌 Menu: http://localhost:3000/${branch.slug}`);
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
