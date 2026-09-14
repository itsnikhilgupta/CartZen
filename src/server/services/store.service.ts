import { prisma } from "@/server/db/prisma";
import { StoreStatus, Role } from "@/types/enums";

export class StoreService {
  /**
   * Search stores by search query, city, or status
   */
  static async searchStores(params: { query?: string; city?: string; status?: string }) {
    const whereClause: any = {};

    if (params.status) {
      whereClause.status = params.status;
    }

    if (params.city) {
      whereClause.city = { contains: params.city };
    }

    if (params.query) {
      whereClause.OR = [
        { name: { contains: params.query } },
        { code: { contains: params.query } },
        { address: { contains: params.query } },
        { city: { contains: params.query } },
      ];
    }

    return prisma.store.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        city: true,
        state: true,
        country: true,
        timezone: true,
        currency: true,
        status: true,
        isMarketActive: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get store details by ID
   */
  static async getStoreById(storeId: string) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!store) {
      throw new Error("Store location not found");
    }

    return store;
  }

  /**
   * Assert that a store is ACTIVE and market-ready.
   * Only active stores can start shopping sessions.
   */
  static async assertStoreIsActive(storeId: string) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error("Store location not found");
    }

    if (store.status !== StoreStatus.ACTIVE || !store.isMarketActive) {
      throw new Error(`Store "${store.name}" is currently ${store.status.toLowerCase()}. Shopping sessions cannot be started at this location.`);
    }

    return store;
  }

  /**
   * Create or update store (Super Admin / Store Admin)
   */
  static async createOrUpdateStore(data: {
    id?: string;
    name: string;
    code: string;
    address: string;
    city: string;
    state?: string;
    country?: string;
    timezone?: string;
    currency?: string;
    status?: string;
  }) {
    if (data.id) {
      return prisma.store.update({
        where: { id: data.id },
        data: {
          name: data.name,
          code: data.code,
          address: data.address,
          city: data.city,
          state: data.state || "Maharashtra",
          country: data.country || "India",
          timezone: data.timezone || "Asia/Kolkata",
          currency: data.currency || "INR",
          status: data.status || StoreStatus.ACTIVE,
          isMarketActive: data.status === StoreStatus.ACTIVE,
        },
      });
    } else {
      return prisma.store.create({
        data: {
          name: data.name,
          code: data.code,
          address: data.address,
          city: data.city,
          state: data.state || "Maharashtra",
          country: data.country || "India",
          timezone: data.timezone || "Asia/Kolkata",
          currency: data.currency || "INR",
          status: data.status || StoreStatus.ACTIVE,
          isMarketActive: data.status === StoreStatus.ACTIVE,
        },
      });
    }
  }

  /**
   * Verify Store Access for Store Admins (Multi-Tenant Cross-Store Boundary Guard)
   */
  static async verifyStoreAccess(userId: string, userRole: string, storeId: string) {
    if (userRole === Role.SUPER_ADMIN) {
      return true; // Super Admin has global store management access
    }

    const membership = await prisma.storeMembership.findUnique({
      where: {
        userId_storeId: {
          userId,
          storeId,
        },
      },
    });

    if (!membership) {
      throw new Error("FORBIDDEN: You do not have permission to manage this store.");
    }

    return true;
  }
}
