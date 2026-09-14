import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductService } from "@/server/services/product.service";
import { prisma } from "@/server/db/prisma";

// Mock Prisma
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    product: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    productBarcode: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe("ProductService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProducts", () => {
    it("should apply pagination skip and limit correctly", async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(25);
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);

      const result = await ProductService.getProducts({
        page: 2,
        limit: 10,
      });

      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { isSoftDeleted: false, status: "ACTIVE" },
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );

      expect(result.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
        hasMore: true,
      });
    });

    it("should search across barcode and SKU when query is provided", async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(1);
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);

      await ProductService.getProducts({ query: "8901030000012" });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { barcodes: { some: { barcode: { contains: "8901030000012" } } } },
            ]),
          }),
        })
      );
    });
  });

  describe("createProduct", () => {
    it("should throw error if barcode already exists", async () => {
      vi.mocked(prisma.productBarcode.findUnique).mockResolvedValue({
        id: "b1",
        productId: "p1",
        barcode: "8901030000012",
        isPrimary: true,
        createdAt: new Date(),
      });

      await expect(
        ProductService.createProduct({
          sku: "SKU-NEW-001",
          name: "Test Milk",
          brand: "Test",
          description: "Test",
          categoryId: "cat1",
          barcode: "8901030000012",
          listPrice: 50,
          salePrice: 45,
          storeId: "store1",
          quantity: 10,
        })
      ).rejects.toThrow('Barcode "8901030000012" already exists');
    });

    it("should throw error if SKU already exists", async () => {
      vi.mocked(prisma.productBarcode.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        sku: "SKU-EXISTING",
      } as any);

      await expect(
        ProductService.createProduct({
          sku: "SKU-EXISTING",
          name: "Test Milk",
          brand: "Test",
          description: "Test",
          categoryId: "cat1",
          barcode: "8909990000111",
          listPrice: 50,
          salePrice: 45,
          storeId: "store1",
          quantity: 10,
        })
      ).rejects.toThrow('SKU "SKU-EXISTING" already exists');
    });
  });

  describe("addBarcode", () => {
    it("should throw error if barcode is assigned to another product", async () => {
      vi.mocked(prisma.productBarcode.findUnique).mockResolvedValue({
        id: "b1",
        productId: "other-prod",
        barcode: "8901030000012",
        isPrimary: true,
        createdAt: new Date(),
      });

      await expect(
        ProductService.addBarcode("p1", "8901030000012")
      ).rejects.toThrow('Barcode "8901030000012" is already assigned to another product.');
    });
  });
});
