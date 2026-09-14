import { NextResponse } from "next/server";
import { ProductService } from "@/server/services/product.service";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId") || undefined;

    const result = await ProductService.getProductById(params.id, storeId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Product not found";
    return NextResponse.json({ error: errMessage }, { status: 404 });
  }
}
