import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { Role } from "@/types/enums";

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role: Role;
}

export function authorizeRole(user: SessionUser | null | undefined, allowedRoles: Role[]): boolean {
  if (!user) return false;
  if (user.role === Role.SUPER_ADMIN) return true; // Super Admin overrides
  return allowedRoles.includes(user.role as Role);
}

/**
 * requireAuth()
 * Requires an active authenticated user session.
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }
  return session.user as SessionUser;
}

/**
 * requireCustomer()
 * Requires an authenticated user with CUSTOMER or SUPER_ADMIN role.
 */
export async function requireCustomer(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== Role.CUSTOMER && user.role !== Role.SUPER_ADMIN) {
    throw new Error("FORBIDDEN: Requires CUSTOMER role");
  }
  return user;
}

/**
 * requireStoreAdmin()
 * Requires an authenticated user with STORE_ADMIN or SUPER_ADMIN role.
 */
export async function requireStoreAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== Role.STORE_ADMIN && user.role !== Role.SUPER_ADMIN) {
    throw new Error("FORBIDDEN: Requires STORE_ADMIN or SUPER_ADMIN role");
  }
  return user;
}

/**
 * requireSuperAdmin()
 * Requires an authenticated user with SUPER_ADMIN role.
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== Role.SUPER_ADMIN) {
    throw new Error("FORBIDDEN: Requires SUPER_ADMIN role");
  }
  return user;
}

/**
 * requireStoreAccess(storeId)
 * Prevents cross-store data leakage.
 * Verifies user has explicit StoreMembership for the given storeId or is SUPER_ADMIN.
 */
export async function requireStoreAccess(storeId: string): Promise<SessionUser> {
  const user = await requireStoreAdmin();

  if (user.role === Role.SUPER_ADMIN) {
    return user; // Super Admin overrides cross-store boundary
  }

  const membership = await prisma.storeMembership.findUnique({
    where: {
      userId_storeId: {
        userId: user.id,
        storeId,
      },
    },
  });

  if (!membership) {
    throw new Error("FORBIDDEN: Cross-store access prohibited. You are not assigned to this store.");
  }

  return user;
}

/**
 * Synchronous IDOR check for customer owned resources
 */
export function assertCustomerAccess(user: SessionUser | null | undefined, targetUserId: string): void {
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }
  if (user.role === Role.SUPER_ADMIN) return;
  if (user.id !== targetUserId) {
    throw new Error("FORBIDDEN: IDOR protection - Cannot access resources belonging to another user");
  }
}

/**
 * Synchronous Store Admin check
 */
export function assertStoreAdminAccess(user: SessionUser | null | undefined): void {
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }
  if (user.role !== Role.STORE_ADMIN && user.role !== Role.SUPER_ADMIN) {
    throw new Error("FORBIDDEN: Requires STORE_ADMIN or SUPER_ADMIN role");
  }
}
