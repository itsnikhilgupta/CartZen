import { NextResponse } from "next/server";
import { StoreService } from "@/server/services/store.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || undefined;
    const city = searchParams.get("city") || undefined;
    const status = searchParams.get("status") || undefined;

    const stores = await StoreService.searchStores({ query, city, status });
    return NextResponse.json({ stores });
  } catch (error) {
    return NextResponse.json({ error: "Failed to search store locations" }, { status: 500 });
  }
}
