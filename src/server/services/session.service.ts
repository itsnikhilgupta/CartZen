import { prisma } from "@/server/db/prisma";
import { StoreService } from "./store.service";

export type SessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "EXPIRED" | "CANCELLED";

export class ShoppingSessionService {
  /**
   * Start or retrieve an active shopping session for a user at a specific store
   */
  static async startSession(userId: string, storeId: string) {
    // 1. Verify target store is active
    await StoreService.assertStoreIsActive(storeId);

    // 2. Check for existing active session for this user at this store
    const existingSession = await prisma.shoppingSession.findFirst({
      where: {
        userId,
        storeId,
        status: "ACTIVE",
      },
      include: {
        store: true,
        cart: {
          include: {
            items: true,
          },
        },
      },
    });

    if (existingSession) {
      if (!existingSession.cart) {
        // Ensure cart exists for existing session
        const cart = await prisma.cart.create({
          data: {
            shoppingSessionId: existingSession.id,
            userId,
            storeId,
            totalAmount: 0,
            totalTax: 0,
          },
          include: { items: true },
        });
        return { ...existingSession, cart };
      }
      return existingSession;
    }

    // 3. Mark any existing active sessions at OTHER stores as PAUSED
    await prisma.shoppingSession.updateMany({
      where: {
        userId,
        status: "ACTIVE",
        storeId: { not: storeId },
      },
      data: {
        status: "PAUSED",
      },
    });

    // 4. Create new ACTIVE session with linked Cart
    const session = await prisma.shoppingSession.create({
      data: {
        userId,
        storeId,
        status: "ACTIVE",
        startedAt: new Date(),
        cart: {
          create: {
            userId,
            storeId,
            totalAmount: 0,
            totalTax: 0,
          },
        },
      },
      include: {
        store: true,
        cart: {
          include: {
            items: true,
          },
        },
      },
    });

    return session;
  }

  /**
   * Get session details with authorization & ownership guard
   */
  static async getSessionById(sessionId: string, userId: string) {
    const session = await prisma.shoppingSession.findUnique({
      where: { id: sessionId },
      include: {
        store: true,
        cart: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    nutrition: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new Error("Shopping session not found");
    }

    if (session.userId !== userId) {
      throw new Error("Unauthorized access to shopping session");
    }

    return session;
  }

  /**
   * Update session status (e.g. PAUSED, COMPLETED, EXPIRED, CANCELLED)
   */
  static async updateSessionStatus(sessionId: string, userId: string, status: SessionStatus) {
    const session = await this.getSessionById(sessionId, userId);

    const updated = await prisma.shoppingSession.update({
      where: { id: session.id },
      data: {
        status,
        ...(status === "COMPLETED" || status === "CANCELLED" || status === "EXPIRED"
          ? { endedAt: new Date() }
          : {}),
      },
    });

    return updated;
  }
}
