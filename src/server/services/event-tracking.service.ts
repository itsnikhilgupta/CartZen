import { prisma } from "@/server/db/prisma";

export type EventType =
  | "PRODUCT_VIEW"
  | "PRODUCT_SCAN"
  | "SEARCH"
  | "ADD_TO_CART"
  | "REMOVE_FROM_CART"
  | "PURCHASE"
  | "RECOMMENDATION_SHOWN"
  | "RECOMMENDATION_CLICKED"
  | "RECOMMENDATION_ADDED"
  | "RECOMMENDATION_DISMISSED";

export interface LogEventParams {
  userId: string;
  eventType: EventType;
  productId?: string;
  sessionId?: string;
  storeId?: string;
  barcode?: string;
  quantity?: number;
  algorithmVersion?: string;
  metadata?: Record<string, any>;
}

export class EventTrackingService {
  /**
   * Record privacy-conscious user event if behavioural tracking consent is granted.
   * Silently skips recording if user has not opted in.
   */
  static async logEvent(params: LogEventParams): Promise<{ recorded: boolean }> {
    try {
      // 1. Query User Consent
      const consent = await prisma.consent.findUnique({
        where: { userId: params.userId },
      });

      // 2. Strict Privacy Check: Only record if behaviouralTrackingOptIn === true
      if (!consent || !consent.behaviouralTrackingOptIn) {
        return { recorded: false };
      }

      // 3. Record Event in BehaviourEvent table without personal info
      await prisma.behaviourEvent.create({
        data: {
          userId: params.userId,
          eventType: params.eventType,
          metadata: JSON.stringify({
            productId: params.productId || undefined,
            sessionId: params.sessionId || undefined,
            storeId: params.storeId || undefined,
            barcode: params.barcode || undefined,
            quantity: params.quantity || undefined,
            algorithmVersion: params.algorithmVersion || "v1.0",
            timestamp: new Date().toISOString(),
            ...params.metadata,
          }),
        },
      });

      return { recorded: true };
    } catch (err) {
      console.warn("Event tracking exception ignored for privacy/resilience:", err);
      return { recorded: false };
    }
  }
}
