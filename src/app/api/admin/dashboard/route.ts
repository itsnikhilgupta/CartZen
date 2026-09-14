import { NextRequest, NextResponse } from "next/server";
import { requireStoreAdmin, requireStoreAccess } from "@/server/security/rbac";
import { prisma } from "@/server/db/prisma";
import { Role } from "@/types/enums";
import { AnalyticsService } from "@/server/services/analytics.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireStoreAdmin();

    const searchParams = req.nextUrl.searchParams;
    let storeId = searchParams.get("storeId") || undefined;

    if (storeId) {
      await requireStoreAccess(storeId);
    } else if (user.role === Role.STORE_ADMIN) {
      const membership = await prisma.storeMembership.findFirst({
        where: { userId: user.id },
      });
      if (membership) {
        storeId = membership.storeId;
      }
    }

    const data = await AnalyticsService.getStoreDashboardMetrics(storeId);

    return NextResponse.json({
      metrics: {
        totalRevenue: data.totalSales,
        totalSales: data.totalSales,
        totalOrders: data.totalOrders,
        uniqueCustomers: data.uniqueCustomers,
        activeSessions: data.activeSessions,
        averageBasketValue: data.averageBasketValue,
        averageBasketSize: data.averageBasketSize,
        cartAbandonmentRate: data.cartAbandonmentRate,
        repeatPurchaseRate: data.repeatPurchaseRate,
        lowStockCount: data.lowStockCount,
        outOfStockCount: data.outOfStockCount,
      },
      popularProducts: data.popularProducts,
      popularCategories: data.popularCategories,
      recentPurchases: data.recentPurchases,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch admin dashboard metrics";
    const status = errMessage.startsWith("UNAUTHORIZED") ? 401 : 403;
    return NextResponse.json({ error: errMessage }, { status });
  }
}
