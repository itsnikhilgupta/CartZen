import { describe, it, expect, vi, beforeEach } from "vitest";
import { CartService, TAX_RATE } from "@/server/services/cart.service";
import { prisma } from "@/server/db/prisma";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    shoppingSession: {
      findUnique: vi.fn(),
    },
    productBarcode: {
      findUnique: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    cartItem: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    consent: {
      findUnique: vi.fn(),
    },
    behaviourEvent: {
      create: vi.fn(),
    },
  },
}));

describe("CartService Authoritative Pricing & Security Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addItemToCart", () => {
    it("should throw error if quantity is zero or negative", async () => {
      await expect(
        CartService.addItemToCart({
          shoppingSessionId: "s1",
          userId: "u1",
          barcode: "8901030000012",
          quantity: 0,
        })
      ).rejects.toThrow("Quantity must be a positive integer greater than 0");
    });

    it("should throw unauthorized error on cross-customer session access", async () => {
      vi.mocked(prisma.shoppingSession.findUnique).mockResolvedValue({
        id: "s1",
        userId: "customer-A",
        status: "ACTIVE",
        storeId: "store-101",
      } as any);

      await expect(
        CartService.addItemToCart({
          shoppingSessionId: "s1",
          userId: "customer-B",
          barcode: "8901030000012",
          quantity: 1,
        })
      ).rejects.toThrow("Unauthorized: Cross-customer cart access denied");
    });

    it("should compute authoritative 5% tax and total amount", async () => {
      vi.mocked(prisma.cart.findUnique).mockResolvedValue({
        id: "cart-100",
        items: [
          { lineTotal: 100 },
          { lineTotal: 50 },
        ],
      } as any);

      vi.mocked(prisma.cart.update).mockResolvedValue({
        id: "cart-100",
        totalAmount: 157.5,
        totalTax: 7.5,
        items: [],
      } as any);

      const result = await CartService.recalculateCart("cart-100");

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: "cart-100" },
        data: {
          totalAmount: 157.5,
          totalTax: 7.5,
        },
        include: expect.any(Object),
      });
    });
  });

  describe("updateItemQuantity", () => {
    it("should throw unauthorized error if item cart does not belong to user", async () => {
      vi.mocked(prisma.cartItem.findUnique).mockResolvedValue({
        id: "ci-1",
        cartId: "cart-A",
        cart: { userId: "user-A" },
      } as any);

      await expect(
        CartService.updateItemQuantity("ci-1", "user-B", 2)
      ).rejects.toThrow("Unauthorized: Cross-customer cart access denied");
    });
  });
});
