import { ValidationError } from './errors.js';

export const PLAN_LIMITS = {
  PILOT: {
    maxBranches: 1,
    maxItemsPerBranch: 50,
  },
  SCALE: {
    maxBranches: 5,
    maxItemsPerBranch: 1000,
  },
  ENTERPRISE: {
    maxBranches: 999,
    maxItemsPerBranch: 9999,
  },
} as const;

/** Asserts that a tenant company has not exceeded its branch quota based on its planTier */
export async function assertTenantBranchQuota(prisma: any, companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { planTier: true },
  });

  if (!company) return;

  const currentBranchesCount = await prisma.branch.count({
    where: { companyId },
  });

  const tier = (company.planTier as keyof typeof PLAN_LIMITS) || 'SCALE';
  const limit = PLAN_LIMITS[tier]?.maxBranches ?? 5;

  if (currentBranchesCount >= limit) {
    throw new ValidationError(
      `Branch limit reached (${currentBranchesCount}/${limit}) for ${tier} plan. Please upgrade to add more locations.`
    );
  }
}

/** Asserts that a tenant company has not exceeded its item quota */
export async function assertTenantItemQuota(prisma: any, companyId: string, sectionId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { planTier: true },
  });

  if (!company) return;

  const section = await prisma.menuSection.findUnique({
    where: { id: sectionId },
    select: { menu: { select: { branchId: true } } },
  });

  if (!section) return;

  const currentItemsCount = await prisma.menuItem.count({
    where: {
      section: {
        menu: { branchId: section.menu.branchId },
      },
    },
  });

  const tier = (company.planTier as keyof typeof PLAN_LIMITS) || 'SCALE';
  const limit = PLAN_LIMITS[tier]?.maxItemsPerBranch ?? 1000;

  if (currentItemsCount >= limit) {
    throw new ValidationError(
      `Item limit reached (${currentItemsCount}/${limit}) for ${tier} plan tier. Please upgrade your subscription.`
    );
  }
}
