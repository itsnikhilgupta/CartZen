import { prisma } from "@/server/db/prisma";
import { NutritionClassificationService } from "./nutrition-classification.service";
import { ProductStatus, NutritionTag } from "@/types/enums";

export interface GetProductsParams {
  query?: string;
  categoryId?: string;
  brand?: string;
  status?: string;
  classification?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "price_asc" | "price_desc" | "name_asc" | "newest";
  page?: number;
  limit?: number;
  storeId?: string;
}

export class ProductService {
  /**
   * Scalable Server-Side Product Search, Filter, Sort, and Pagination
   * Does NOT load entire database into memory. Uses database SKIP & TAKE.
   */
  static async getProducts(params: GetProductsParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      isSoftDeleted: false,
    };

    // Filter by Product Status (default ACTIVE for customers)
    if (params.status) {
      whereClause.status = params.status;
    } else {
      whereClause.status = ProductStatus.ACTIVE;
    }

    // Filter by Category
    if (params.categoryId) {
      whereClause.categoryId = params.categoryId;
    }

    // Filter by Brand
    if (params.brand) {
      whereClause.brand = { contains: params.brand };
    }

    // Search Query (Name, Brand, Description, or SKU)
    if (params.query) {
      whereClause.OR = [
        { name: { contains: params.query } },
        { brand: { contains: params.query } },
        { sku: { contains: params.query } },
        { description: { contains: params.query } },
        { barcodes: { some: { barcode: { contains: params.query } } } },
      ];
    }

    // Sort order
    let orderBy: any = { createdAt: "desc" };
    if (params.sortBy === "name_asc") {
      orderBy = { name: "asc" };
    } else if (params.sortBy === "newest") {
      orderBy = { createdAt: "desc" };
    }

    // Query Total Count for Pagination
    const total = await prisma.product.count({ where: whereClause });

    // Query Paginated Products from Database
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        barcodes: true,
        nutrition: true,
        prices: params.storeId ? { where: { storeId: params.storeId } } : { take: 1 },
        inventories: params.storeId ? { where: { storeId: params.storeId } } : { take: 1 },
      },
      orderBy,
      skip,
      take: limit,
    });

    // Map products & calculate Nutrition Classifications dynamically via NutritionClassificationService
    const items = products.map((p) => {
      const price = p.prices[0];
      const inventory = p.inventories[0];
      const primaryBarcode = p.barcodes.find((b) => b.isPrimary)?.barcode || p.barcodes[0]?.barcode || "";
      const classification = NutritionClassificationService.classifyNutrition(p.nutrition);

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        description: p.description,
        unit: p.unit,
        status: p.status,
        isAgeRestricted: p.isAgeRestricted,
        category: p.category.name,
        categoryId: p.categoryId,
        barcode: primaryBarcode,
        barcodes: p.barcodes,
        price: price ? (price.salePrice || price.listPrice) : 0,
        listPrice: price ? price.listPrice : 0,
        salePrice: price ? price.salePrice : 0,
        inStock: inventory ? inventory.quantity > 0 : false,
        stockQty: inventory ? inventory.quantity : 0,
        nutrition: p.nutrition,
        nutritionTags: classification.tags,
        disclaimer: classification.disclaimer,
      };
    });

    // Filter by Nutrition Classification if parameter supplied
    let filteredItems = items;
    if (params.classification) {
      filteredItems = items.filter((item) =>
        item.nutritionTags.includes(params.classification as NutritionTag)
      );
    }

    const totalPages = Math.ceil(total / limit);

    return {
      products: filteredItems,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Get single product detail by ID with nutrition classification
   */
  static async getProductById(productId: string, storeId?: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        barcodes: true,
        nutrition: true,
        prices: storeId ? { where: { storeId } } : true,
        inventories: storeId ? { where: { storeId } } : true,
      },
    });

    if (!product || product.isSoftDeleted) {
      throw new Error("Product not found");
    }

    const price = product.prices[0];
    const inventory = product.inventories[0];
    const classification = NutritionClassificationService.classifyNutrition(product.nutrition);

    return {
      product: {
        ...product,
        unitPrice: price ? (price.salePrice || price.listPrice) : 0,
        listPrice: price ? price.listPrice : 0,
        salePrice: price ? price.salePrice : 0,
        inStock: inventory ? inventory.quantity > 0 : false,
        stockQty: inventory ? inventory.quantity : 0,
        nutritionTags: classification.tags,
        disclaimer: classification.disclaimer,
      },
    };
  }

  /**
   * Create new Product with barcode uniqueness check
   */
  static async createProduct(data: {
    sku: string;
    name: string;
    brand: string;
    description: string;
    categoryId: string;
    unit?: string;
    status?: string;
    barcode: string;
    listPrice: number;
    salePrice: number;
    storeId: string;
    quantity: number;
    isAgeRestricted?: boolean;
    imageUrl?: string;
    nutrition?: any;
  }) {
    // 1. Check Barcode Uniqueness
    const existingBarcode = await prisma.productBarcode.findUnique({
      where: { barcode: data.barcode },
    });

    if (existingBarcode) {
      throw new Error(`Barcode "${data.barcode}" already exists in the system and cannot be duplicated.`);
    }

    // 2. Check SKU Uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingSku) {
      throw new Error(`SKU "${data.sku}" already exists in the catalog.`);
    }

    // 3. Create Product with Relations in Transaction
    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        brand: data.brand,
        description: data.description,
        categoryId: data.categoryId,
        unit: data.unit || "pack",
        status: data.status || ProductStatus.ACTIVE,
        isAgeRestricted: data.isAgeRestricted || false,
        imageUrl: data.imageUrl || `/images/products/${data.sku.toLowerCase()}.jpg`,
        barcodes: {
          create: {
            barcode: data.barcode,
            isPrimary: true,
          },
        },
        prices: {
          create: {
            storeId: data.storeId,
            listPrice: data.listPrice,
            salePrice: data.salePrice,
          },
        },
        inventories: {
          create: {
            storeId: data.storeId,
            quantity: data.quantity,
          },
        },
        ...(data.nutrition
          ? {
              nutrition: {
                create: {
                  calories: data.nutrition.calories,
                  protein: data.nutrition.protein,
                  carbohydrates: data.nutrition.carbohydrates,
                  totalSugar: data.nutrition.totalSugar,
                  addedSugar: data.nutrition.addedSugar,
                  fat: data.nutrition.fat,
                  saturatedFat: data.nutrition.saturatedFat,
                  fibre: data.nutrition.fibre,
                  sodium: data.nutrition.sodium,
                  servingSize: data.nutrition.servingSize || 100,
                  servingUnit: data.nutrition.servingUnit || "g",
                  allergens: data.nutrition.allergens || "",
                  organic: data.nutrition.organic || false,
                  vegan: data.nutrition.vegan || false,
                  glutenFree: data.nutrition.glutenFree || false,
                },
              },
            }
          : {}),
      },
      include: {
        barcodes: true,
        category: true,
        nutrition: true,
        prices: true,
        inventories: true,
      },
    });

    return product;
  }

  /**
   * Add a secondary barcode record to a product (Multi-Barcode Support)
   */
  static async addBarcode(productId: string, barcode: string, isPrimary: boolean = false) {
    const existing = await prisma.productBarcode.findUnique({
      where: { barcode },
    });

    if (existing) {
      throw new Error(`Barcode "${barcode}" is already assigned to another product.`);
    }

    if (isPrimary) {
      // Unset previous primary barcode for this product
      await prisma.productBarcode.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    return prisma.productBarcode.create({
      data: {
        productId,
        barcode,
        isPrimary,
      },
    });
  }
}
