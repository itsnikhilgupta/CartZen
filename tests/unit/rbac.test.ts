import { describe, it, expect } from "vitest";
import { authorizeRole, assertCustomerAccess, SessionUser } from "../../src/server/security/rbac";
import { Role } from "../../src/types/enums";

describe("Server-Side RBAC & IDOR Protection", () => {
  const customerUser: SessionUser = {
    id: "user-cust-123",
    email: "customer@cartzen.com",
    name: "Alex Customer",
    role: Role.CUSTOMER,
  };

  const adminUser: SessionUser = {
    id: "user-admin-456",
    email: "admin@cartzen.com",
    name: "Admin User",
    role: Role.STORE_ADMIN,
  };

  it("should allow customer to access their own resources", () => {
    expect(() => assertCustomerAccess(customerUser, "user-cust-123")).not.toThrow();
  });

  it("should throw IDOR forbidden error if customer accesses another user's resource", () => {
    expect(() => assertCustomerAccess(customerUser, "user-victim-999")).toThrow("IDOR protection");
  });

  it("should allow super admin to override resource ownership check", () => {
    const superAdmin: SessionUser = {
      id: "user-super-1",
      email: "super@cartzen.com",
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
    };

    expect(() => assertCustomerAccess(superAdmin, "user-victim-999")).not.toThrow();
  });

  it("should check role authorization correctly", () => {
    expect(authorizeRole(customerUser, [Role.CUSTOMER])).toBe(true);
    expect(authorizeRole(customerUser, [Role.STORE_ADMIN])).toBe(false);
    expect(authorizeRole(adminUser, [Role.STORE_ADMIN])).toBe(true);
  });
});
