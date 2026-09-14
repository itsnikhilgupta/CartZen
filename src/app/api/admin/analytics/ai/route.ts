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
    const period = (searchParams.get("period") as "today" | "7d" | "30d" | "all") || "7d";
    const algorithmVersion = searchParams.get("algorithmVersion") || undefined;

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

    const aiAnalytics = await AnalyticsService.getAIAnalyticsMetrics({
      storeId,
      timePeriod: period,
      algorithmVersion,
    });

    return NextResponse.json(aiAnalytics);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch AI analytics metrics";
    const status = errMessage.startsWith("UNAUTHORIZED") ? 401 : 403;
    return NextResponse.json({ error: errMessage }, { status });
  }
}
