import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { ProductService } from "@/server/services/product.service";
import { AdminProductCreateSchema } from "@/server/validations";
import { assertStoreAdminAccess } from "@/server/security/rbac";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    assertStoreAdminAccess(session.user);

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId") || undefined;
    const query = searchParams.get("query") || undefined;

    const result = await ProductService.getProducts({
      query,
      storeId,
      status: searchParams.get("status") || undefined,
      limit: 50,
    });

    const categories = await prisma.productCategory.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ...result, categories });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json({ error: errMessage }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    assertStoreAdminAccess(session.user);

    const body = await req.json();
    const validated = AdminProductCreateSchema.parse(body);

    const product = await ProductService.createProduct(validated);

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
