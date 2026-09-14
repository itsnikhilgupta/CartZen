import { NutritionTag } from "@/types/enums";

export interface NutritionDataInput {
  calories?: number | null;
  protein?: number | null;
  carbohydrates?: number | null;
  totalSugar?: number | null;
  addedSugar?: number | null;
  fat?: number | null;
  saturatedFat?: number | null;
  fibre?: number | null;
  sodium?: number | null;
  servingSize?: number | null;
  servingUnit?: string | null;
}

export interface ClassificationThresholds {
  minProteinGrams?: number; // default 10g per 100g/serving
  maxSugarGrams?: number; // default 5g per 100g/serving
  minFibreGrams?: number; // default 6g per 100g/serving
  maxCaloriesKcal?: number; // default 40 kcal per 100g/serving
}

export const DEFAULT_NUTRITION_THRESHOLDS: Required<ClassificationThresholds> = {
  minProteinGrams: 10,
  maxSugarGrams: 5,
  minFibreGrams: 6,
  maxCaloriesKcal: 40,
};

export const NUTRITION_DISCLAIMER =
  "Disclaimer: Nutrition classifications are application/business heuristics for informational guidance and do not constitute clinical or medical diagnoses.";

export class NutritionClassificationService {
  /**
   * Classify product nutrition values into tags (HIGH_PROTEIN, LOW_SUGAR, HIGH_FIBRE, LOW_CALORIE)
   * Strictly avoids misleading tags when required nutrition fields are missing or null.
   */
  static classifyNutrition(
    nutrition: NutritionDataInput | null | undefined,
    customThresholds?: ClassificationThresholds
  ): { tags: NutritionTag[]; disclaimer: string } {
    if (!nutrition) {
      return { tags: [], disclaimer: NUTRITION_DISCLAIMER };
    }

    const thresholds = {
      ...DEFAULT_NUTRITION_THRESHOLDS,
      ...customThresholds,
    };

    const tags: NutritionTag[] = [];

    // 1. HIGH_PROTEIN check
    if (nutrition.protein !== null && nutrition.protein !== undefined) {
      if (nutrition.protein >= thresholds.minProteinGrams) {
        tags.push(NutritionTag.HIGH_PROTEIN);
      }
    }

    // 2. LOW_SUGAR check
    if (nutrition.totalSugar !== null && nutrition.totalSugar !== undefined) {
      if (nutrition.totalSugar <= thresholds.maxSugarGrams) {
        tags.push(NutritionTag.LOW_SUGAR);
      }
    }

    // 3. HIGH_FIBRE check
    if (nutrition.fibre !== null && nutrition.fibre !== undefined) {
      if (nutrition.fibre >= thresholds.minFibreGrams) {
        tags.push(NutritionTag.HIGH_FIBRE);
      }
    }

    // 4. LOW_CALORIE check
    if (nutrition.calories !== null && nutrition.calories !== undefined) {
      if (nutrition.calories <= thresholds.maxCaloriesKcal) {
        tags.push(NutritionTag.LOW_CALORIE);
      }
    }

    return {
      tags,
      disclaimer: NUTRITION_DISCLAIMER,
    };
  }
}
