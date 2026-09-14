import { prisma } from "@/server/db/prisma";
import { NutritionClassificationService } from "./nutrition-classification.service";
import { CustomerProfileService } from "./customer-profile.service";
import { NutritionTag } from "@/types/enums";

export type RecommendationType =
  | "HIGH_PROTEIN"
  | "LOW_SUGAR"
  | "HIGH_FIBRE"
  | "LOW_CALORIE"
  | "SIMILAR_PRODUCT"
  | "COMPLEMENTARY_PRODUCT"
  | "FREQUENTLY_BOUGHT"
  | "PERSONALIZED";

export interface RecommendedItem {
  product: {
    id: string;
    sku: string;
    name: string;
    brand: string;
    description: string;
    price: number;
    listPrice: number;
    salePrice: number;
    category: string;
    unit: string;
    inStock: boolean;
    stockQty: number;
    nutritionTags: string[];
    nutrition: any;
  };
  score: number;
  reason: string;
  recommendationType: RecommendationType;
  algorithmVersion: string;
  personalized: boolean;
}

export interface RecommendationEngineParams {
  userId: string;
  storeId: string;
  currentCartProductIds?: string[];
  limit?: number;
  categoryFilter?: string;
  typeFilter?: RecommendationType;
}

export interface RecommendationEngine {
  generateRecommendations(params: RecommendationEngineParams): Promise<RecommendedItem[]>;
}

export class RecommendationEngineV1 implements RecommendationEngine {
  public static readonly ALGORITHM_VERSION = "v1.2.0-dynamic-scoring";

  /**
   * Main recommendation generator with multi-factor scoring and fault-tolerant fallbacks
   */
  async generateRecommendations(params: RecommendationEngineParams): Promise<RecommendedItem[]> {
    try {
      const limit = params.limit || 8;
      const currentCartIds = params.currentCartProductIds || [];

      // 1. Check Customer Consent
      const consent = await prisma.consent.findUnique({
        where: { userId: params.userId },
      });

      const isPersonalizationAllowed = consent ? consent.personalizationOptIn : true;

      // 2. If Personalization is OFF or user opted out, return non-personalized store bestsellers
      if (!isPersonalizationAllowed) {
        return this.getFallbackStoreBestsellers(params.storeId, currentCartIds, limit);
      }

      // 3. Derive Customer Profile with recency decay
      const profile = await CustomerProfileService.deriveCustomerProfile(params.userId);

      // 4. Fetch Candidate Products (in-stock at store)
      const candidateProducts = await prisma.product.findMany({
        where: {
          isSoftDeleted: false,
          status: "ACTIVE",
          id: { notIn: currentCartIds },
          inventories: {
            some: { storeId: params.storeId, quantity: { gt: 0 } },
          },
        },
        include: {
          category: true,
          nutrition: true,
          barcodes: true,
          prices: { where: { storeId: params.storeId } },
          inventories: { where: { storeId: params.storeId } },
        },
        take: 50,
      });

      if (candidateProducts.length === 0) {
        return this.getFallbackStoreBestsellers(params.storeId, currentCartIds, limit);
      }

      // 5. Co-occurring Basket Associations ("Frequently Bought Together")
      const coOccurringMap = new Map<string, number>();
      if (currentCartIds.length > 0) {
        const coItems = await prisma.purchaseItem.findMany({
          where: {
            purchase: {
              items: {
                some: { productId: { in: currentCartIds } },
              },
            },
            productId: { notIn: currentCartIds },
          },
          select: { productId: true },
          take: 30,
        });

        for (const item of coItems) {
          coOccurringMap.set(item.productId, (coOccurringMap.get(item.productId) || 0) + 1);
        }
      }

      // 6. Score Each Candidate Product
      const scoredItems: RecommendedItem[] = [];

      for (const p of candidateProducts) {
        const priceRecord = p.prices[0];
        const inventoryRecord = p.inventories[0];
        const price = priceRecord ? priceRecord.salePrice || priceRecord.listPrice : 0;
        const classification = NutritionClassificationService.classifyNutrition(p.nutrition);
        const tags = classification.tags;

        let score = 0.5; // Base candidate score
        let reason = "Popular choice in supermarket catalog";
        let recType: RecommendationType = "PERSONALIZED";

        // A. Frequently Bought Together match
        const coFreq = coOccurringMap.get(p.id) || 0;
        if (coFreq > 0) {
          score += Math.min(0.35, coFreq * 0.1);
          reason = "Frequently purchased together with items in your cart";
          recType = "COMPLEMENTARY_PRODUCT";
        }

        // B. Reorder / Buy Again match
        if (profile.frequentlyPurchasedProductIds.includes(p.id)) {
          score += 0.3;
          reason = "You frequently purchase this item";
          recType = "FREQUENTLY_BOUGHT";
        }

        // C. Nutrition Affinity Scoring
        if (p.nutrition) {
          if (tags.includes(NutritionTag.HIGH_PROTEIN) && profile.proteinInterest > 1.0) {
            score += Math.min(0.25, profile.proteinInterest * 0.05);
            reason = "You frequently purchase protein-rich foods";
            recType = "HIGH_PROTEIN";
          } else if (tags.includes(NutritionTag.HIGH_FIBRE) && profile.fibreInterest > 1.0) {
            score += Math.min(0.25, profile.fibreInterest * 0.05);
            reason = "Matches your high-fibre food selections";
            recType = "HIGH_FIBRE";
          } else if (tags.includes(NutritionTag.LOW_SUGAR) && profile.lowSugarInterest > 1.0) {
            score += Math.min(0.25, profile.lowSugarInterest * 0.05);
            reason = "Low-sugar option based on your shopping choices";
            recType = "LOW_SUGAR";
          } else if (tags.includes(NutritionTag.LOW_CALORIE) && profile.lowCalorieInterest > 1.0) {
            score += Math.min(0.25, profile.lowCalorieInterest * 0.05);
            reason = "Lower calorie choice based on your preferences";
            recType = "LOW_CALORIE";
          }
        }

        // D. Category Affinity
        const catName = p.category.name.toLowerCase();
        if (catName.includes("snack") && profile.snackInterest > 1.0) {
          score += 0.1;
        } else if (catName.includes("dairy") && profile.dairyInterest > 1.0) {
          score += 0.1;
        }

        // Apply type filter if requested
        if (params.typeFilter && recType !== params.typeFilter && !tags.includes(params.typeFilter as any)) {
          continue;
        }

        // Cold-start fallback adjustments for users without history
        const isPersonalized = profile.totalEventsAnalyzed >= 2;
        if (!isPersonalized) {
          reason = "Popular choice in supermarket store";
        }

        scoredItems.push({
          product: {
            id: p.id,
            sku: p.sku,
            name: p.name,
            brand: p.brand,
            description: p.description,
            price,
            listPrice: priceRecord ? priceRecord.listPrice : price,
            salePrice: priceRecord ? priceRecord.salePrice : price,
            category: p.category.name,
            unit: p.unit,
            inStock: inventoryRecord ? inventoryRecord.quantity > 0 : false,
            stockQty: inventoryRecord ? inventoryRecord.quantity : 0,
            nutritionTags: tags,
            nutrition: p.nutrition,
          },
          score: Math.min(0.99, Math.round(score * 100) / 100),
          reason,
          recommendationType: recType,
          algorithmVersion: RecommendationEngineV1.ALGORITHM_VERSION,
          personalized: isPersonalized,
        });
      }

      scoredItems.sort((a, b) => b.score - a.score);
      return scoredItems.slice(0, limit);
    } catch (err) {
      console.error("RecommendationEngineV1 fault caught silently for core shopping resilience:", err);
      return this.getFallbackStoreBestsellers(params.storeId, params.currentCartProductIds || [], params.limit || 6);
    }
  }

  /**
   * Fallback strategy: Non-personalized popular products
   */
  public async getFallbackStoreBestsellers(
    storeId: string,
    excludeIds: string[],
    limit: number
  ): Promise<RecommendedItem[]> {
    const products = await prisma.product.findMany({
      where: {
        isSoftDeleted: false,
        status: "ACTIVE",
        id: { notIn: excludeIds },
        inventories: {
          some: { storeId, quantity: { gt: 0 } },
        },
      },
      include: {
        category: true,
        nutrition: true,
        prices: { where: { storeId } },
        inventories: { where: { storeId } },
      },
      take: limit,
    });

    return products.map((p) => {
      const priceRecord = p.prices[0];
      const inventoryRecord = p.inventories[0];
      const price = priceRecord ? priceRecord.salePrice || priceRecord.listPrice : 0;
      const classification = NutritionClassificationService.classifyNutrition(p.nutrition);

      return {
        product: {
          id: p.id,
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          description: p.description,
          price,
          listPrice: priceRecord ? priceRecord.listPrice : price,
          salePrice: priceRecord ? priceRecord.salePrice : price,
          category: p.category.name,
          unit: p.unit,
          inStock: inventoryRecord ? inventoryRecord.quantity > 0 : false,
          stockQty: inventoryRecord ? inventoryRecord.quantity : 0,
          nutritionTags: classification.tags,
          nutrition: p.nutrition,
        },
        score: 0.8,
        reason: "Popular Supermarket Choice",
        recommendationType: "PERSONALIZED",
        algorithmVersion: RecommendationEngineV1.ALGORITHM_VERSION,
        personalized: false,
      };
    });
  }
}

/**
 * RecommendationEngineML
 * Primary ML Recommendation Engine with 500ms timeout & automatic fallback to RecommendationEngineV1.
 */
export class RecommendationEngineML implements RecommendationEngine {
  public static readonly ALGORITHM_VERSION = "v2.0.0-ml-content-cosine";
  private fallbackEngine: RecommendationEngineV1;
  private mlServiceUrl: string;

  constructor(mlServiceUrl?: string) {
    this.fallbackEngine = new RecommendationEngineV1();
    this.mlServiceUrl = mlServiceUrl || process.env.ML_SERVICE_URL || "http://localhost:8000/recommend";
  }

  async generateRecommendations(params: RecommendationEngineParams): Promise<RecommendedItem[]> {
    try {
      const limit = params.limit || 8;
      const currentCartIds = params.currentCartProductIds || [];

      // 1. Check Customer Consent
      const consent = await prisma.consent.findUnique({
        where: { userId: params.userId },
      });

      const isPersonalizationAllowed = consent ? consent.personalizationOptIn : true;

      if (!isPersonalizationAllowed) {
        return this.fallbackEngine.generateRecommendations(params);
      }

      // 2. Fetch Candidate Products (in-stock at store)
      const candidateProducts = await prisma.product.findMany({
        where: {
          isSoftDeleted: false,
          status: "ACTIVE",
          id: { notIn: currentCartIds },
          inventories: {
            some: { storeId: params.storeId, quantity: { gt: 0 } },
          },
        },
        include: {
          category: true,
          nutrition: true,
          barcodes: true,
          prices: { where: { storeId: params.storeId } },
          inventories: { where: { storeId: params.storeId } },
        },
        take: 50,
      });

      if (candidateProducts.length === 0) {
        return this.fallbackEngine.generateRecommendations(params);
      }

      // 3. Fetch User Events for Feature Engineering
      const userEvents = await prisma.behaviourEvent.findMany({
        where: { userId: params.userId },
        take: 100,
        orderBy: { timestamp: "desc" },
      });

      const payloadCandidates = candidateProducts.map((p) => {
        const priceRecord = p.prices[0];
        const inventoryRecord = p.inventories[0];
        const price = priceRecord ? priceRecord.salePrice || priceRecord.listPrice : 0;
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          description: p.description,
          category: p.category?.name || "General",
          price,
          listPrice: priceRecord ? priceRecord.listPrice : price,
          salePrice: priceRecord ? priceRecord.salePrice : price,
          unit: p.unit,
          inStock: inventoryRecord ? inventoryRecord.quantity > 0 : false,
          stockQty: inventoryRecord ? inventoryRecord.quantity : 0,
          nutrition: p.nutrition,
        };
      });

      // 4. Send Request to FastAPI ML Service with 500ms AbortSignal Timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);

      const res = await fetch(this.mlServiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: params.userId,
          storeId: params.storeId,
          currentCartProductIds: currentCartIds,
          candidateProducts: payloadCandidates,
          userEvents,
          limit,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`ML Service responded with HTTP ${res.status}`);
      }

      const data = await res.json();

      if (!data.success || !Array.isArray(data.recommendations)) {
        throw new Error("Invalid ML Service payload response");
      }

      // Map ML recommendations
      const mlItems: RecommendedItem[] = data.recommendations.map((item: any) => {
        const p = item.product;
        const classification = NutritionClassificationService.classifyNutrition(p.nutrition);
        return {
          product: {
            id: p.id,
            sku: p.sku,
            name: p.name,
            brand: p.brand,
            description: p.description,
            price: p.price,
            listPrice: p.listPrice,
            salePrice: p.salePrice,
            category: p.category,
            unit: p.unit,
            inStock: p.inStock,
            stockQty: p.stockQty,
            nutritionTags: classification.tags,
            nutrition: p.nutrition,
          },
          score: item.score,
          reason: item.reason,
          recommendationType: item.recommendationType || "PERSONALIZED",
          algorithmVersion: item.algorithmVersion || RecommendationEngineML.ALGORITHM_VERSION,
          personalized: item.personalized ?? true,
        };
      });

      if (mlItems.length === 0) {
        return this.fallbackEngine.generateRecommendations(params);
      }

      return mlItems.slice(0, limit);
    } catch (error) {
      console.warn(
        "RecommendationEngineML service unavailable or timed out. Falling back silently to RecommendationEngineV1:",
        error instanceof Error ? error.message : error
      );
      return this.fallbackEngine.generateRecommendations(params);
    }
  }
}
