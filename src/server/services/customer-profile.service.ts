import { prisma } from "@/server/db/prisma";

export interface CustomerBehaviourProfile {
  userId: string;
  totalEventsAnalyzed: number;
  proteinInterest: number;
  fibreInterest: number;
  lowSugarInterest: number;
  lowCalorieInterest: number;
  snackInterest: number;
  dairyInterest: number;
  beverageInterest: number;
  organicPreference: boolean;
  veganPreference: boolean;
  glutenFreePreference: boolean;
  frequentlyPurchasedProductIds: string[];
}

export const HALF_LIFE_DAYS = 14;
export const DECAY_LAMBDA = Math.LN2 / HALF_LIFE_DAYS; // ~0.0495 per day

export const EVENT_ACTION_WEIGHTS: Record<string, number> = {
  PURCHASE: 3.0,
  ADD_TO_CART: 2.0,
  RECOMMENDATION_ADDED: 2.0,
  PRODUCT_SCAN: 1.0,
  PRODUCT_VIEW: 0.5,
  RECOMMENDATION_CLICKED: 0.5,
  SEARCH: 0.3,
  RECOMMENDATION_SHOWN: 0.1,
  REMOVE_FROM_CART: -1.0,
  RECOMMENDATION_DISMISSED: -1.5,
};

export class CustomerProfileService {
  /**
   * Derive customer behaviour profile from raw event history with recency decay
   */
  static async deriveCustomerProfile(userId: string): Promise<CustomerBehaviourProfile> {
    const defaultProfile: CustomerBehaviourProfile = {
      userId,
      totalEventsAnalyzed: 0,
      proteinInterest: 0,
      fibreInterest: 0,
      lowSugarInterest: 0,
      lowCalorieInterest: 0,
      snackInterest: 0,
      dairyInterest: 0,
      beverageInterest: 0,
      organicPreference: false,
      veganPreference: false,
      glutenFreePreference: false,
      frequentlyPurchasedProductIds: [],
    };

    // 1. Check User Consent
    const consent = await prisma.consent.findUnique({
      where: { userId },
    });

    if (!consent || !consent.behaviouralTrackingOptIn) {
      return defaultProfile;
    }

    // 2. Fetch User Behaviour Events (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const events = await prisma.behaviourEvent.findMany({
      where: {
        userId,
        timestamp: { gte: ninetyDaysAgo },
      },
      orderBy: { timestamp: "desc" },
      take: 200,
    });

    if (events.length === 0) {
      return defaultProfile;
    }

    // 3. Extract Product IDs from Event Metadata & Fetch Products
    const productIdsSet = new Set<string>();
    const parsedEvents: { eventType: string; productId?: string; timestamp: Date }[] = [];

    for (const event of events) {
      try {
        const meta = JSON.parse(event.metadata || "{}");
        const productId = meta.productId;
        if (productId) {
          productIdsSet.add(productId);
        }
        parsedEvents.push({
          eventType: event.eventType,
          productId,
          timestamp: event.timestamp,
        });
      } catch {
        // ignore parse error
      }
    }

    const products = await prisma.product.findMany({
      where: { id: { in: Array.from(productIdsSet) } },
      include: {
        category: true,
        nutrition: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 4. Calculate Scores with Exponential Recency Decay
    const now = new Date().getTime();
    let proteinScore = 0;
    let fibreScore = 0;
    let lowSugarScore = 0;
    let lowCalorieScore = 0;
    let snackScore = 0;
    let dairyScore = 0;
    let beverageScore = 0;
    let organicHits = 0;
    let veganHits = 0;
    let glutenFreeHits = 0;

    const purchaseCounts = new Map<string, number>();

    for (const event of parsedEvents) {
      const actionWeight = EVENT_ACTION_WEIGHTS[event.eventType] || 0.1;
      const daysAgo = (now - event.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      const recencyWeight = Math.exp(-DECAY_LAMBDA * daysAgo);
      const effectiveWeight = actionWeight * recencyWeight;

      if (event.eventType === "PURCHASE" && event.productId) {
        purchaseCounts.set(event.productId, (purchaseCounts.get(event.productId) || 0) + 1);
      }

      if (!event.productId) continue;
      const product = productMap.get(event.productId);
      if (!product) continue;

      const catName = product.category.name.toLowerCase();
      if (catName.includes("snack")) snackScore += effectiveWeight;
      if (catName.includes("dairy")) dairyScore += effectiveWeight;
      if (catName.includes("beverage") || catName.includes("drink")) beverageScore += effectiveWeight;

      const n = product.nutrition;
      if (n) {
        if ((n.protein || 0) >= 10) proteinScore += effectiveWeight;
        if ((n.fibre || 0) >= 6) fibreScore += effectiveWeight;
        if ((n.totalSugar || 0) <= 5) lowSugarScore += effectiveWeight;
        if ((n.calories || 0) <= 40) lowCalorieScore += effectiveWeight;

        if (n.organic) organicHits += 1;
        if (n.vegan) veganHits += 1;
        if (n.glutenFree) glutenFreeHits += 1;
      }
    }

    // Top purchased products
    const frequentlyPurchased = Array.from(purchaseCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pid]) => pid);

    return {
      userId,
      totalEventsAnalyzed: events.length,
      proteinInterest: Math.min(10, Math.max(0, Math.round(proteinScore * 10) / 10)),
      fibreInterest: Math.min(10, Math.max(0, Math.round(fibreScore * 10) / 10)),
      lowSugarInterest: Math.min(10, Math.max(0, Math.round(lowSugarScore * 10) / 10)),
      lowCalorieInterest: Math.min(10, Math.max(0, Math.round(lowCalorieScore * 10) / 10)),
      snackInterest: Math.min(10, Math.max(0, Math.round(snackScore * 10) / 10)),
      dairyInterest: Math.min(10, Math.max(0, Math.round(dairyScore * 10) / 10)),
      beverageInterest: Math.min(10, Math.max(0, Math.round(beverageScore * 10) / 10)),
      organicPreference: organicHits >= 2,
      veganPreference: veganHits >= 2,
      glutenFreePreference: glutenFreeHits >= 2,
      frequentlyPurchasedProductIds: frequentlyPurchased,
    };
  }
}
