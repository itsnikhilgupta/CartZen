import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  requireAuth,
  requireCustomer,
  requireStoreAdmin,
  requireSuperAdmin,
  requireStoreAccess,
  SessionUser,
} from "../../src/server/security/rbac";
import { Role } from "../../src/types/enums";
import { prisma } from "../../src/server/db/prisma";

describe("Phase 2 Server RBAC Composable Helpers", () => {
  it("requireAuth() should return session user when authenticated", async () => {
    const mockUser: SessionUser = {
      id: "usr-1",
      email: "alex@cartzen.com",
      name: "Alex",
      role: Role.CUSTOMER,
    };
    (getServerSession as any).mockResolvedValueOnce({ user: mockUser });

    const user = await requireAuth();
    expect(user.id).toBe("usr-1");
  });

  it("requireAuth() should throw UNAUTHORIZED when session is missing", async () => {
    (getServerSession as any).mockResolvedValueOnce(null);
    await expect(requireAuth()).rejects.toThrow("UNAUTHORIZED");
  });

  it("requireCustomer() should allow CUSTOMER and SUPER_ADMIN roles", async () => {
    const custUser: SessionUser = { id: "c1", role: Role.CUSTOMER };
    (getServerSession as any).mockResolvedValueOnce({ user: custUser });
    await expect(requireCustomer()).resolves.toEqual(custUser);

    const superAdmin: SessionUser = { id: "s1", role: Role.SUPER_ADMIN };
    (getServerSession as any).mockResolvedValueOnce({ user: superAdmin });
    await expect(requireCustomer()).resolves.toEqual(superAdmin);
  });

  it("requireStoreAdmin() should reject CUSTOMER role", async () => {
    const custUser: SessionUser = { id: "c1", role: Role.CUSTOMER };
    (getServerSession as any).mockResolvedValueOnce({ user: custUser });
    await expect(requireStoreAdmin()).rejects.toThrow("FORBIDDEN: Requires STORE_ADMIN");
  });

  it("requireSuperAdmin() should reject STORE_ADMIN role", async () => {
    const adminUser: SessionUser = { id: "a1", role: Role.STORE_ADMIN };
    (getServerSession as any).mockResolvedValueOnce({ user: adminUser });
    await expect(requireSuperAdmin()).rejects.toThrow("FORBIDDEN: Requires SUPER_ADMIN");
  });
});
