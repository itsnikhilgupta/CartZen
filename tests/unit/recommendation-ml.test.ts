import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecommendationEngineML, RecommendationEngineV1 } from "@/server/services/recommendation-engine";
import { prisma } from "@/server/db/prisma";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    consent: {
      findUnique: vi.fn(),
    },
    behaviourEvent: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    purchaseItem: {
      findMany: vi.fn(),
    },
  },
}));

describe("Machine Learning Recommendation Engine (RecommendationEngineML)", () => {
  let engineML: RecommendationEngineML;

  beforeEach(() => {
    vi.clearAllMocks();
    engineML = new RecommendationEngineML("http://localhost:8999/recommend");
  });

  it("1. Should automatically fall back to RecommendationEngineV1 when ML service is offline/unreachable", async () => {
    vi.mocked(prisma.consent.findUnique).mockResolvedValue({
      id: "c1",
      userId: "user-ml-1",
      personalizationOptIn: true,
      behaviouralTrackingOptIn: true,
      marketingOptIn: false,
      updatedToAt: new Date(),
    });

    vi.mocked(prisma.product.findMany).mockResolvedValue([
      {
        id: "prod-ml-1",
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

    vi.mocked(prisma.behaviourEvent.findMany).mockResolvedValue([]);

    // Global fetch fails (simulating ML service offline)
    const spyFetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED: Connection refused"));

    const recs = await engineML.generateRecommendations({
      userId: "user-ml-1",
      storeId: "store-101",
    });

    expect(spyFetch).toHaveBeenCalled();
    expect(recs.length).toBeGreaterThan(0);
    // Verified fallback to V1
    expect(recs[0].algorithmVersion).toBe(RecommendationEngineV1.ALGORITHM_VERSION);
  });

  it("2. Should process ML service response cleanly when ML service is active", async () => {
    vi.mocked(prisma.consent.findUnique).mockResolvedValue({
      id: "c1",
      userId: "user-ml-2",
      personalizationOptIn: true,
      behaviouralTrackingOptIn: true,
      marketingOptIn: false,
      updatedToAt: new Date(),
    });

    vi.mocked(prisma.product.findMany).mockResolvedValue([
      {
        id: "prod-ml-2",
        sku: "SKU-YOGURT",
        name: "Greek Yogurt 500g",
        brand: "CartZen Dairy",
        description: "High protein yogurt",
        unit: "g",
        category: { name: "Dairy & Eggs" },
        nutrition: { protein: 15, totalSugar: 3 },
        prices: [{ listPrice: 120, salePrice: 110 }],
        inventories: [{ quantity: 30 }],
      },
    ] as any);

    vi.mocked(prisma.behaviourEvent.findMany).mockResolvedValue([]);

    // Mock successful ML service response
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        algorithmVersion: "v2.0.0-ml-content-cosine",
        recommendations: [
          {
            product: {
              id: "prod-ml-2",
              sku: "SKU-YOGURT",
              name: "Greek Yogurt 500g",
              brand: "CartZen Dairy",
              description: "High protein yogurt",
              price: 110,
              listPrice: 120,
              salePrice: 110,
              category: "Dairy & Eggs",
              unit: "g",
              inStock: true,
              stockQty: 30,
              nutrition: { protein: 15, totalSugar: 3 },
            },
            score: 0.95,
            reason: "High protein option matching your preference",
            recommendationType: "HIGH_PROTEIN",
            algorithmVersion: "v2.0.0-ml-content-cosine",
            personalized: true,
          },
        ],
      }),
    } as Response);

    const recs = await engineML.generateRecommendations({
      userId: "user-ml-2",
      storeId: "store-101",
    });

    expect(recs.length).toBe(1);
    expect(recs[0].score).toBe(0.95);
    expect(recs[0].recommendationType).toBe("HIGH_PROTEIN");
    expect(recs[0].algorithmVersion).toBe("v2.0.0-ml-content-cosine");
  });

  it("3. Should respect privacy opt-out and fall back without calling ML service", async () => {
    vi.mocked(prisma.consent.findUnique).mockResolvedValue({
      id: "c1",
      userId: "user-opt-out",
      personalizationOptIn: false,
      behaviouralTrackingOptIn: false,
      marketingOptIn: false,
      updatedToAt: new Date(),
    });

    vi.mocked(prisma.product.findMany).mockResolvedValue([
      {
        id: "prod-bestseller",
        sku: "SKU-BREAD",
        name: "Whole Wheat Bread 400g",
        brand: "BakersFresh",
        description: "Fresh bread",
        unit: "g",
        category: { name: "Bakery" },
        nutrition: { fibre: 5 },
        prices: [{ listPrice: 50, salePrice: 45 }],
        inventories: [{ quantity: 100 }],
      },
    ] as any);

    const spyFetch = vi.spyOn(globalThis, "fetch");

    const recs = await engineML.generateRecommendations({
      userId: "user-opt-out",
      storeId: "store-101",
    });

    expect(spyFetch).not.toHaveBeenCalled();
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].personalized).toBe(false);
  });
});
