import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecommendationEngineV1 } from "@/server/services/recommendation-engine";
import { CustomerProfileService } from "@/server/services/customer-profile.service";
import { EventTrackingService } from "@/server/services/event-tracking.service";
import { prisma } from "@/server/db/prisma";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    consent: {
      findUnique: vi.fn(),
    },
    behaviourEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    purchaseItem: {
      findMany: vi.fn(),
    },
  },
}));

describe("Phase 5: CartZen AI Recommendation Engine & Personalization", () => {
  let engine: RecommendationEngineV1;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new RecommendationEngineV1();
  });

  describe("EventTrackingService", () => {
    it("should log standardized recommendation events when behavioural tracking is enabled", async () => {
      vi.mocked(prisma.consent.findUnique).mockResolvedValue({
        id: "c1",
        userId: "user-1",
        personalizationOptIn: true,
        behaviouralTrackingOptIn: true,
        marketingOptIn: false,
        updatedToAt: new Date(),
      });

      const res = await EventTrackingService.logEvent({
        userId: "user-1",
        eventType: "RECOMMENDATION_ADDED",
        productId: "p100",
        algorithmVersion: "v1.2.0",
      });

      expect(res.recorded).toBe(true);
      expect(prisma.behaviourEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            eventType: "RECOMMENDATION_ADDED",
          }),
        })
      );
    });

    it("should silently skip logging recommendation events when tracking is disabled", async () => {
      vi.mocked(prisma.consent.findUnique).mockResolvedValue({
        id: "c1",
        userId: "user-opt-out",
        personalizationOptIn: false,
        behaviouralTrackingOptIn: false,
        marketingOptIn: false,
        updatedToAt: new Date(),
      });

      const res = await EventTrackingService.logEvent({
        userId: "user-opt-out",
        eventType: "RECOMMENDATION_DISMISSED",
        productId: "p100",
      });

      expect(res.recorded).toBe(false);
      expect(prisma.behaviourEvent.create).not.toHaveBeenCalled();
    });
  });

  describe("CustomerProfileService", () => {
    it("should return default baseline profile for new user with zero events (Cold Start)", async () => {
      vi.mocked(prisma.consent.findUnique).mockResolvedValue({
        id: "c1",
        userId: "new-user",
        personalizationOptIn: true,
        behaviouralTrackingOptIn: true,
        marketingOptIn: false,
        updatedToAt: new Date(),
      });

      vi.mocked(prisma.behaviourEvent.findMany).mockResolvedValue([]);

      const profile = await CustomerProfileService.deriveCustomerProfile("new-user");

      expect(profile.totalEventsAnalyzed).toBe(0);
      expect(profile.proteinInterest).toBe(0);
      expect(profile.fibreInterest).toBe(0);
    });

    it("should calculate higher protein & fibre interest scores for high-protein purchase history", async () => {
      vi.mocked(prisma.consent.findUnique).mockResolvedValue({
        id: "c1",
        userId: "athlete-user",
        personalizationOptIn: true,
        behaviouralTrackingOptIn: true,
        marketingOptIn: false,
        updatedToAt: new Date(),
      });

      const recentDate = new Date();
      vi.mocked(prisma.behaviourEvent.findMany).mockResolvedValue([
        {
          id: "e1",
          userId: "athlete-user",
          eventType: "PURCHASE",
          metadata: JSON.stringify({ productId: "prod-milk" }),
          timestamp: recentDate,
        },
        {
          id: "e2",
          userId: "athlete-user",
          eventType: "ADD_TO_CART",
          metadata: JSON.stringify({ productId: "prod-milk" }),
          timestamp: recentDate,
        },
      ] as any);

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "prod-milk",
          name: "Organic Milk 1L",
          category: { name: "Dairy & Eggs" },
          nutrition: {
            protein: 15,
            fibre: 7,
            calories: 120,
            totalSugar: 3,
          },
        },
      ] as any);

      const profile = await CustomerProfileService.deriveCustomerProfile("athlete-user");

      expect(profile.totalEventsAnalyzed).toBe(2);
      expect(profile.proteinInterest).toBeGreaterThan(0);
      expect(profile.fibreInterest).toBeGreaterThan(0);
      expect(profile.dairyInterest).toBeGreaterThan(0);
    });
  });

  describe("RecommendationEngineV1", () => {
    it("should return non-personalized fallback store bestsellers when personalizationOptIn is false", async () => {
      vi.mocked(prisma.consent.findUnique).mockResolvedValue({
        id: "c1",
        userId: "opted-out-user",
        personalizationOptIn: false,
        behaviouralTrackingOptIn: false,
        marketingOptIn: false,
        updatedToAt: new Date(),
      });

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          sku: "SKU-MILK",
          name: "Organic Whole Milk 1L",
          brand: "CartZen Dairy",
          description: "Fresh milk",
          unit: "L",
          category: { name: "Dairy & Eggs" },
          nutrition: { protein: 8, totalSugar: 4 },
          prices: [{ listPrice: 75, salePrice: 69 }],
          inventories: [{ quantity: 50 }],
        },
      ] as any);

      const recs = await engine.generateRecommendations({
        userId: "opted-out-user",
        storeId: "store-101",
      });

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].personalized).toBe(false);
      expect(recs[0].reason).toBe("Popular Supermarket Choice");
    });

    it("should generate truthful data-grounded explanations and correct recommendation types", async () => {
      vi.mocked(prisma.consent.findUnique).mockResolvedValue({
        id: "c1",
        userId: "active-user",
        personalizationOptIn: true,
        behaviouralTrackingOptIn: true,
        marketingOptIn: false,
        updatedToAt: new Date(),
      });

      vi.mocked(prisma.behaviourEvent.findMany).mockResolvedValue([
        {
          id: "e1",
          userId: "active-user",
          eventType: "PURCHASE",
          metadata: JSON.stringify({ productId: "prod-eggs" }),
          timestamp: new Date(),
        },
        {
          id: "e2",
          userId: "active-user",
          eventType: "PURCHASE",
          metadata: JSON.stringify({ productId: "prod-eggs" }),
          timestamp: new Date(),
        },
      ] as any);

      vi.mocked(prisma.purchaseItem.findMany).mockResolvedValue([]);

      vi.mocked(prisma.product.findMany)
        .mockResolvedValueOnce([
          {
            id: "prod-eggs",
            name: "Fresh Eggs 12pk",
            category: { name: "Dairy & Eggs" },
            nutrition: { protein: 14, totalSugar: 0 },
          },
        ] as any)
        .mockResolvedValueOnce([
          {
            id: "prod-greek-yogurt",
            sku: "SKU-YOGURT",
            name: "Greek Yogurt 500g",
            brand: "CartZen Dairy",
            description: "High protein yogurt",
            unit: "g",
            category: { name: "Dairy & Eggs" },
            nutrition: { protein: 16, totalSugar: 3, fibre: 0, calories: 90 },
            prices: [{ listPrice: 120, salePrice: 110 }],
            inventories: [{ quantity: 30 }],
          },
        ] as any);

      const recs = await engine.generateRecommendations({
        userId: "active-user",
        storeId: "store-101",
      });

      expect(recs.length).toBeGreaterThan(0);
      const topRec = recs[0];
      expect(topRec.personalized).toBe(true);
      expect(topRec.recommendationType).toBe("HIGH_PROTEIN");
      expect(topRec.reason).toContain("You frequently purchase protein-rich foods");
      expect(topRec.reason).not.toContain("diagnosed"); // Strictly no medical claims
    });
  });
});
