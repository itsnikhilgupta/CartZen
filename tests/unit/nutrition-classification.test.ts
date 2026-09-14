import { describe, it, expect } from "vitest";
import {
  NutritionClassificationService,
  DEFAULT_NUTRITION_THRESHOLDS,
  NUTRITION_DISCLAIMER,
} from "@/server/services/nutrition-classification.service";
import { NutritionTag } from "@/types/enums";

describe("NutritionClassificationService", () => {
  it("should return empty tags when nutrition is null or undefined", () => {
    const result = NutritionClassificationService.classifyNutrition(null);
    expect(result.tags).toEqual([]);
    expect(result.disclaimer).toBe(NUTRITION_DISCLAIMER);
  });

  it("should classify HIGH_PROTEIN when protein >= 10g", () => {
    const result = NutritionClassificationService.classifyNutrition({
      protein: 12,
      totalSugar: 15,
      calories: 200,
    });
    expect(result.tags).toContain(NutritionTag.HIGH_PROTEIN);
    expect(result.tags).not.toContain(NutritionTag.LOW_SUGAR);
  });

  it("should classify LOW_SUGAR when totalSugar <= 5g", () => {
    const result = NutritionClassificationService.classifyNutrition({
      totalSugar: 2,
    });
    expect(result.tags).toContain(NutritionTag.LOW_SUGAR);
  });

  it("should classify HIGH_FIBRE when fibre >= 6g", () => {
    const result = NutritionClassificationService.classifyNutrition({
      fibre: 7,
    });
    expect(result.tags).toContain(NutritionTag.HIGH_FIBRE);
  });

  it("should classify LOW_CALORIE when calories <= 40 kcal", () => {
    const result = NutritionClassificationService.classifyNutrition({
      calories: 35,
    });
    expect(result.tags).toContain(NutritionTag.LOW_CALORIE);
  });

  it("should classify multiple tags when multiple thresholds are satisfied", () => {
    const result = NutritionClassificationService.classifyNutrition({
      protein: 15,
      totalSugar: 1,
      fibre: 8,
      calories: 30,
    });
    expect(result.tags).toEqual([
      NutritionTag.HIGH_PROTEIN,
      NutritionTag.LOW_SUGAR,
      NutritionTag.HIGH_FIBRE,
      NutritionTag.LOW_CALORIE,
    ]);
  });

  it("should strictly avoid false claims when fields are missing or null", () => {
    const result = NutritionClassificationService.classifyNutrition({
      protein: null,
      totalSugar: null,
      fibre: null,
      calories: null,
    });
    expect(result.tags).toEqual([]);
  });

  it("should accept custom threshold overrides", () => {
    const customResult = NutritionClassificationService.classifyNutrition(
      { protein: 8 },
      { minProteinGrams: 5 }
    );
    expect(customResult.tags).toContain(NutritionTag.HIGH_PROTEIN);
  });
});
