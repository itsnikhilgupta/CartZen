import { NextResponse } from "next/server";
import { ProductService } from "@/server/services/product.service";
import { ProductQuerySchema } from "@/server/validations";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const queryParams = {
      query: searchParams.get("query") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      brand: searchParams.get("brand") || undefined,
      status: searchParams.get("status") as any || undefined,
      classification: searchParams.get("classification") as any || undefined,
      minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
      maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
      sortBy: (searchParams.get("sortBy") as any) || "newest",
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 10,
      storeId: searchParams.get("storeId") || undefined,
    };

    const validated = ProductQuerySchema.parse(queryParams);
    const result = await ProductService.getProducts(validated);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
