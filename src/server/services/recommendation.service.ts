import { RecommendationEngineML, RecommendationEngineV1 } from "./recommendation-engine";

export class RecommendationService {
  private static engineML = new RecommendationEngineML();
  private static engineV1 = new RecommendationEngineV1();

  /**
   * Fetch Smart Picks & AI Product Recommendations for customer
   * Uses RecommendationEngineML as primary engine with fallback to RecommendationEngineV1
   */
  static async getRecommendationsForUser(
    userId: string,
    storeId: string,
    currentCartProductIds: string[] = []
  ) {
    return this.engineML.generateRecommendations({
      userId,
      storeId,
      currentCartProductIds,
      limit: 12,
    });
  }

  /**
   * Explicitly invoke RecommendationEngineV1 (Rules-based engine)
   */
  static async getV1RecommendationsForUser(
    userId: string,
    storeId: string,
    currentCartProductIds: string[] = []
  ) {
    return this.engineV1.generateRecommendations({
      userId,
      storeId,
      currentCartProductIds,
      limit: 12,
    });
  }
}
