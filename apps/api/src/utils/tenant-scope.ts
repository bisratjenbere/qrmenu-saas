import { NotFoundError } from './errors.js';

export async function assertBranchAccess(
  prisma: any,
  staff: { role: string; branchId: string | null; companyId: string | null },
  branchId: string,
  errorMsg = 'Branch not found'
) {
  if (staff.role === 'SUPER_ADMIN') {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });
    if (!branch) throw new NotFoundError(errorMsg);
    return;
  }

  if (staff.role !== 'ADMIN' && staff.branchId !== branchId) {
    throw new NotFoundError(errorMsg);
  }

  if (staff.role === 'ADMIN') {
    if (!staff.companyId) throw new NotFoundError(errorMsg);
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, companyId: staff.companyId }
    });
    if (!branch) {
      throw new NotFoundError(errorMsg);
    }
  }
}
