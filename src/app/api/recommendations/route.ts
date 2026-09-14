import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { RecommendationService } from "@/server/services/recommendation.service";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const cartProductIdsParam = searchParams.get("cartItems");

    if (!storeId) {
      return NextResponse.json({ error: "storeId search param is required" }, { status: 400 });
    }

    const cartProductIds = cartProductIdsParam ? cartProductIdsParam.split(",") : [];

    const recommendations = await RecommendationService.getRecommendationsForUser(
      session.user.id,
      storeId,
      cartProductIds
    );

    return NextResponse.json({ recommendations });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch recommendations";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
