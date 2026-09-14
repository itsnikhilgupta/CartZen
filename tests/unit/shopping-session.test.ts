import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShoppingSessionService } from "@/server/services/session.service";
import { StoreService } from "@/server/services/store.service";
import { prisma } from "@/server/db/prisma";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    shoppingSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    cart: {
      create: vi.fn(),
    },
    store: {
      findUnique: vi.fn(),
    },
  },
}));

describe("ShoppingSessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startSession", () => {
    it("should reuse existing active session if one exists for user and store", async () => {
      vi.spyOn(StoreService, "assertStoreIsActive").mockResolvedValue({
        id: "store-101",
        name: "Test Store",
        status: "ACTIVE",
      } as any);

      vi.mocked(prisma.shoppingSession.findFirst).mockResolvedValue({
        id: "session-active-1",
        userId: "user-1",
        storeId: "store-101",
        status: "ACTIVE",
        cart: { id: "cart-1" },
      } as any);

      const session = await ShoppingSessionService.startSession("user-1", "store-101");

      expect(session.id).toBe("session-active-1");
      expect(prisma.shoppingSession.create).not.toHaveBeenCalled();
    });

    it("should pause existing active sessions at other stores when starting new session", async () => {
      vi.spyOn(StoreService, "assertStoreIsActive").mockResolvedValue({
        id: "store-103",
        status: "ACTIVE",
      } as any);

      vi.mocked(prisma.shoppingSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.shoppingSession.create).mockResolvedValue({
        id: "session-new-2",
        userId: "user-1",
        storeId: "store-103",
        status: "ACTIVE",
      } as any);

      await ShoppingSessionService.startSession("user-1", "store-103");

      expect(prisma.shoppingSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          status: "ACTIVE",
          storeId: { not: "store-103" },
        },
        data: { status: "PAUSED" },
      });
    });

    it("should throw error if store is inactive", async () => {
      vi.spyOn(StoreService, "assertStoreIsActive").mockRejectedValue(
        new Error("Store STORE-102 is currently INACTIVE")
      );

      await expect(
        ShoppingSessionService.startSession("user-1", "store-102")
      ).rejects.toThrow("Store STORE-102 is currently INACTIVE");
    });
  });

  describe("getSessionById", () => {
    it("should throw unauthorized error if user does not own the session", async () => {
      vi.mocked(prisma.shoppingSession.findUnique).mockResolvedValue({
        id: "session-99",
        userId: "other-user",
      } as any);

      await expect(
        ShoppingSessionService.getSessionById("session-99", "current-user")
      ).rejects.toThrow("Unauthorized access to shopping session");
    });
  });
});
