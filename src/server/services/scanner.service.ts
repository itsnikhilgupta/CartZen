import { prisma } from "@/server/db/prisma";
import { NutritionClassificationService } from "./nutrition-classification.service";
import { EventTrackingService } from "./event-tracking.service";

export class ScannerService {
  /**
   * Look up product information by barcode and record ScanEvent
   */
  static async scanBarcode(shoppingSessionId: string, barcode: string, userId?: string) {
    const session = await prisma.shoppingSession.findUnique({
      where: { id: shoppingSessionId },
    });

    if (!session || session.status !== "ACTIVE") {
      throw new Error("Invalid or expired shopping session");
    }

    const barcodeRecord = await prisma.productBarcode.findUnique({
      where: { barcode },
      include: {
        product: {
          include: {
            category: true,
            nutrition: true,
            prices: {
              where: { storeId: session.storeId },
            },
            inventories: {
              where: { storeId: session.storeId },
            },
          },
        },
      },
    });

    const isMatch = !!(barcodeRecord && barcodeRecord.product && !barcodeRecord.product.isSoftDeleted);

    // Record ScanEvent for audit trail
    await prisma.scanEvent.create({
      data: {
        shoppingSessionId: session.id,
        barcode,
        productId: isMatch ? barcodeRecord.product.id : null,
        scanResult: isMatch ? "SUCCESS" : "NOT_FOUND",
      },
    });

    // Record Privacy-Conscious Behavioural Event if user ID provided
    if (userId) {
      await EventTrackingService.logEvent({
        userId,
        eventType: "PRODUCT_SCAN",
        barcode,
        productId: isMatch ? barcodeRecord.product.id : undefined,
      });
    }

    if (!isMatch || !barcodeRecord?.product) {
      return {
        found: false,
        barcode,
        message: "Product barcode not found in current store catalog",
      };
    }

    const product = barcodeRecord.product;
    const price = product.prices[0];
    const inventory = product.inventories[0];

    // Calculate dynamic nutrition tags
    const classification = NutritionClassificationService.classifyNutrition(product.nutrition);

    return {
      found: true,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        description: product.description,
        isAgeRestricted: product.isAgeRestricted,
        category: product.category.name,
        barcode,
        unitPrice: price ? (price.salePrice || price.listPrice) : 0,
        listPrice: price ? price.listPrice : 0,
        salePrice: price ? price.salePrice : 0,
        inStock: inventory ? inventory.quantity > 0 : false,
        stockQty: inventory ? inventory.quantity : 0,
        location: inventory ? `${inventory.aisle} / ${inventory.shelf}` : "Unassigned",
        nutrition: product.nutrition,
        nutritionTags: classification.tags,
        disclaimer: classification.disclaimer,
      },
    };
  }
}
