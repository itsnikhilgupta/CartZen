import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/server/db/prisma";
import { AnalyticsService, analyticsCache } from "@/server/services/analytics.service";
import { cleanDatabase } from "../helpers/db";

describe("Phase 8: Store Admin Dashboard & AI Analytics Engine", () => {
  let storeAId: string;
  let storeBId: string;
  let user1Id: string;
  let user2Id: string;
  let prodAId: string;
  let prodBId: string;

  beforeEach(async () => {
    // Clear cache & clean database
    analyticsCache.clear();
    await cleanDatabase();

    // 1. Create Users
    const user1 = await prisma.user.create({
      data: {
        email: `user1-${Date.now()}-${Math.random()}@cartzen.com`,
        passwordHash: "pass",
        name: "Customer Alpha",
        role: "CUSTOMER",
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: `user2-${Date.now()}-${Math.random()}@cartzen.com`,
        passwordHash: "pass",
        name: "Customer Beta",
        role: "CUSTOMER",
      },
    });
    user2Id = user2.id;

    // 2. Create Stores
    const storeA = await prisma.store.create({
      data: {
        name: "CartZen Store #101 (Downtown)",
        code: `STORE-A-${Date.now()}-${Math.random()}`,
        address: "101 Main St",
        city: "San Francisco",
        currency: "INR",
        status: "ACTIVE",
      },
    });
    storeAId = storeA.id;

    const storeB = await prisma.store.create({
      data: {
        name: "CartZen Store #102 (Uptown)",
        code: `STORE-B-${Date.now()}-${Math.random()}`,
        address: "202 Park Ave",
        city: "Oakland",
        currency: "INR",
        status: "ACTIVE",
      },
    });
    storeBId = storeB.id;

    // 3. Create Categories & Products
    const catDairy = await prisma.productCategory.create({
      data: { name: "Dairy & Eggs", slug: `dairy-${Date.now()}-${Math.random()}` },
    });
    const catBakery = await prisma.productCategory.create({
      data: { name: "Bakery", slug: `bakery-${Date.now()}-${Math.random()}` },
    });

    const prodA = await prisma.product.create({
      data: {
        sku: `SKU-MILK-${Date.now()}-${Math.random()}`,
        name: "Organic Milk 1L",
        brand: "FarmFresh",
        description: "Pure milk",
        categoryId: catDairy.id,
        status: "ACTIVE",
      },
    });
    prodAId = prodA.id;

    const prodB = await prisma.product.create({
      data: {
        sku: `SKU-BREAD-${Date.now()}-${Math.random()}`,
        name: "Whole Wheat Bread 400g",
        brand: "BakersDelight",
        description: "Fresh bread",
        categoryId: catBakery.id,
        status: "ACTIVE",
      },
    });
    prodBId = prodB.id;

    // 4. Create Inventory in Store A
    await prisma.inventory.create({
      data: { storeId: storeAId, productId: prodAId, quantity: 5 }, // Low stock (<= 10)
    });
    await prisma.inventory.create({
      data: { storeId: storeAId, productId: prodBId, quantity: 0 }, // Out of stock
    });

    // 5. Create Sessions & Carts
    const session1 = await prisma.shoppingSession.create({
      data: { userId: user1Id, storeId: storeAId, status: "ACTIVE" },
    });
    const cart1 = await prisma.cart.create({
      data: { shoppingSessionId: session1.id, userId: user1Id, storeId: storeAId, totalAmount: 105, totalTax: 5 },
    });

    const sessionAbandoned = await prisma.shoppingSession.create({
      data: { userId: user2Id, storeId: storeAId, status: "ABANDONED" },
    });

    const session1Repeat = await prisma.shoppingSession.create({
      data: { userId: user1Id, storeId: storeAId, status: "COMPLETED" },
    });
    const cart1Repeat = await prisma.cart.create({
      data: { shoppingSessionId: session1Repeat.id, userId: user1Id, storeId: storeAId, totalAmount: 52.5, totalTax: 2.5 },
    });

    const session2StoreB = await prisma.shoppingSession.create({
      data: { userId: user2Id, storeId: storeBId, status: "COMPLETED" },
    });
    const cart2StoreB = await prisma.cart.create({
      data: { shoppingSessionId: session2StoreB.id, userId: user2Id, storeId: storeBId, totalAmount: 210, totalTax: 10 },
    });

    // 6. Create Purchases for Store A
    await prisma.purchase.create({
      data: {
        orderNumber: `ORD-101-${Date.now()}`,
        userId: user1Id,
        storeId: storeAId,
        shoppingSessionId: session1.id,
        cartId: cart1.id,
        subtotal: 100,
        taxTotal: 5,
        grandTotal: 105,
        paymentStatus: "SUCCESS",
        orderStatus: "COMPLETED",
        items: {
          create: [
            { productId: prodAId, sku: prodA.sku, name: prodA.name, quantity: 2, unitPrice: 40, lineTotal: 80 },
            { productId: prodBId, sku: prodB.sku, name: prodB.name, quantity: 1, unitPrice: 25, lineTotal: 25 },
          ],
        },
      },
    });

    // Repeat purchase for User 1 in Store A
    await prisma.purchase.create({
      data: {
        orderNumber: `ORD-102-${Date.now()}`,
        userId: user1Id,
        storeId: storeAId,
        shoppingSessionId: session1Repeat.id,
        cartId: cart1Repeat.id,
        subtotal: 50,
        taxTotal: 2.5,
        grandTotal: 52.5,
        paymentStatus: "SUCCESS",
        orderStatus: "COMPLETED",
        items: {
          create: [{ productId: prodAId, sku: prodA.sku, name: prodA.name, quantity: 1, unitPrice: 52.5, lineTotal: 52.5 }],
        },
      },
    });

    // 7. Create Purchase for Store B (Isolation test)
    await prisma.purchase.create({
      data: {
        orderNumber: `ORD-201-${Date.now()}`,
        userId: user2Id,
        storeId: storeBId,
        shoppingSessionId: session2StoreB.id,
        cartId: cart2StoreB.id,
        subtotal: 200,
        taxTotal: 10,
        grandTotal: 210,
        paymentStatus: "SUCCESS",
        orderStatus: "COMPLETED",
        items: {
          create: [{ productId: prodBId, sku: prodB.sku, name: prodB.name, quantity: 4, unitPrice: 52.5, lineTotal: 210 }],
        },
      },
    });
  });

  it("1. Should calculate Store A Executive Dashboard metrics accurately", async () => {
    const metrics = await AnalyticsService.getStoreDashboardMetrics(storeAId);

    expect(metrics.totalSales).toBe(157.5); // 105 + 52.5
    expect(metrics.totalOrders).toBe(2);
    expect(metrics.uniqueCustomers).toBe(1); // user1
    expect(metrics.activeSessions).toBe(1);
    expect(metrics.averageBasketValue).toBe(78.75); // 157.5 / 2
    expect(metrics.averageBasketSize).toBe(2); // 4 total items / 2 orders = 2.0
    expect(metrics.repeatPurchaseRate).toBe(100); // 1 user with >= 2 orders
    expect(metrics.cartAbandonmentRate).toBe(33.3); // 1 abandoned out of 3 total sessions
    expect(metrics.lowStockCount).toBe(1); // qty 5
    expect(metrics.outOfStockCount).toBe(1); // qty 0

    expect(metrics.popularProducts.length).toBeGreaterThan(0);
    expect(metrics.popularProducts[0].name).toBe("Organic Milk 1L");

    expect(metrics.popularCategories.length).toBeGreaterThan(0);
    expect(metrics.recentPurchases.length).toBe(2);
  });

  it("2. Should enforce Store Isolation between Store A and Store B", async () => {
    const metricsA = await AnalyticsService.getStoreDashboardMetrics(storeAId);
    analyticsCache.clear();
    const metricsB = await AnalyticsService.getStoreDashboardMetrics(storeBId);

    expect(metricsA.totalSales).toBe(157.5);
    expect(metricsB.totalSales).toBe(210);

    expect(metricsA.totalOrders).toBe(2);
    expect(metricsB.totalOrders).toBe(1);
  });

  it("3. Should safely handle empty store dataset without zero-division errors", async () => {
    const emptyStore = await prisma.store.create({
      data: {
        name: "Empty Store",
        code: `EMPTY-${Date.now()}`,
        address: "Empty St",
        city: "None",
        currency: "INR",
        status: "ACTIVE",
      },
    });

    const metrics = await AnalyticsService.getStoreDashboardMetrics(emptyStore.id);

    expect(metrics.totalSales).toBe(0);
    expect(metrics.totalOrders).toBe(0);
    expect(metrics.uniqueCustomers).toBe(0);
    expect(metrics.activeSessions).toBe(0);
    expect(metrics.averageBasketValue).toBe(0);
    expect(metrics.averageBasketSize).toBe(0);
    expect(metrics.repeatPurchaseRate).toBe(0);
    expect(metrics.cartAbandonmentRate).toBe(0);
    expect(metrics.popularProducts).toEqual([]);
    expect(metrics.popularCategories).toEqual([]);
    expect(metrics.recentPurchases).toEqual([]);
  });

  it("4. Should calculate AI Analytics recommendation funnel & CTR metrics", async () => {
    // Log AI events
    await prisma.behaviourEvent.create({
      data: {
        userId: user1Id,
        eventType: "RECOMMENDATION_SHOWN",
        metadata: JSON.stringify({ recommendationType: "HIGH_PROTEIN", productId: prodAId }),
      },
    });
    await prisma.behaviourEvent.create({
      data: {
        userId: user1Id,
        eventType: "RECOMMENDATION_CLICKED",
        metadata: JSON.stringify({ recommendationType: "HIGH_PROTEIN", productId: prodAId }),
      },
    });
    await prisma.behaviourEvent.create({
      data: {
        userId: user1Id,
        eventType: "RECOMMENDATION_ADDED",
        metadata: JSON.stringify({ recommendationType: "HIGH_PROTEIN", productId: prodAId }),
      },
    });

    analyticsCache.clear();
    const aiMetrics = await AnalyticsService.getAIAnalyticsMetrics({ storeId: storeAId, timePeriod: "all" });

    expect(aiMetrics.recommendationsShown).toBe(1);
    expect(aiMetrics.recommendationClicks).toBe(1);
    expect(aiMetrics.recommendationAddToCart).toBe(1);
    expect(aiMetrics.ctr).toBe(100);
    expect(aiMetrics.breakdownByType.length).toBeGreaterThan(0);
    expect(aiMetrics.breakdownByType[0].type).toBe("HIGH_PROTEIN");
    expect(aiMetrics.topRecommendedProducts.length).toBeGreaterThan(0);
    expect(aiMetrics.topRecommendedProducts[0].productId).toBe(prodAId);
  });

  it("5. Should calculate frequently bought together combinations in Shopping Analytics", async () => {
    analyticsCache.clear();
    const shoppingMetrics = await AnalyticsService.getShoppingAnalyticsMetrics(storeAId);

    expect(shoppingMetrics.frequentlyBoughtCombinations.length).toBe(1);
    expect(shoppingMetrics.frequentlyBoughtCombinations[0].count).toBe(1);
    expect([shoppingMetrics.frequentlyBoughtCombinations[0].itemA, shoppingMetrics.frequentlyBoughtCombinations[0].itemB]).toContain("Organic Milk 1L");
    expect([shoppingMetrics.frequentlyBoughtCombinations[0].itemA, shoppingMetrics.frequentlyBoughtCombinations[0].itemB]).toContain("Whole Wheat Bread 400g");
  });

  it("6. Should leverage in-memory cache for fast sub-50ms responses", async () => {
    analyticsCache.clear();

    const start1 = performance.now();
    const metrics1 = await AnalyticsService.getStoreDashboardMetrics(storeAId);
    const duration1 = performance.now() - start1;

    const start2 = performance.now();
    const metrics2 = await AnalyticsService.getStoreDashboardMetrics(storeAId);
    const duration2 = performance.now() - start2;

    expect(metrics1).toEqual(metrics2);
    expect(duration2).toBeLessThan(50); // Cached lookup must return in <50ms
  });
});
