import { prisma } from "@/server/db/prisma";

export class PrivacyService {
  /**
   * Get user consent preferences
   */
  static async getUserConsent(userId: string) {
    let consent = await prisma.consent.findUnique({
      where: { userId },
    });

    if (!consent) {
      consent = await prisma.consent.create({
        data: {
          userId,
          personalizationOptIn: true,
          behaviouralTrackingOptIn: true,
          marketingOptIn: false,
        },
      });
    }

    return consent;
  }

  /**
   * Update consent options
   */
  static async updateConsent(userId: string, data: {
    personalizationOptIn: boolean;
    behaviouralTrackingOptIn: boolean;
    marketingOptIn: boolean;
  }) {
    const updated = await prisma.consent.upsert({
      where: { userId },
      update: {
        personalizationOptIn: data.personalizationOptIn,
        behaviouralTrackingOptIn: data.behaviouralTrackingOptIn,
        marketingOptIn: data.marketingOptIn,
      },
      create: {
        userId,
        personalizationOptIn: data.personalizationOptIn,
        behaviouralTrackingOptIn: data.behaviouralTrackingOptIn,
        marketingOptIn: data.marketingOptIn,
      },
    });

    return updated;
  }

  /**
   * Delete or anonymize customer behavioral tracking history
   */
  static async anonymizeUserHistory(userId: string) {
    const [deletedEvents] = await prisma.$transaction([
      // 1. Delete all raw behavioral log events
      prisma.behaviourEvent.deleteMany({
        where: { userId },
      }),

      // 2. Anonymize recommendations logs
      prisma.recommendationEvent.deleteMany({
        where: { userId },
      }),

      // 3. Reset customer preferences
      prisma.customerPreference.updateMany({
        where: { userId },
        data: {
          preferredCategories: "[]",
          dietaryFlags: "[]",
          maxBudgetAlert: null,
        },
      }),
    ]);

    return {
      success: true,
      deletedBehaviouralRecords: deletedEvents.count,
      message: "Customer behavioral tracking history permanently purged and anonymized.",
    };
  }

  /**
   * Log privacy-conscious event if consent is enabled
   */
  static async recordBehaviourEvent(userId: string, eventType: string, metadata: Record<string, unknown> = {}) {
    const consent = await this.getUserConsent(userId);

    if (!consent.behaviouralTrackingOptIn) {
      return null; // Tracking disabled by user preference
    }

    return prisma.behaviourEvent.create({
      data: {
        userId,
        eventType,
        metadata: JSON.stringify(metadata),
      },
    });
  }
}
