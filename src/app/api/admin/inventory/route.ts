import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { assertStoreAdminAccess } from "@/server/security/rbac";
import { z } from "zod";

const InventoryUpdateSchema = z.object({
  inventoryId: z.string().uuid(),
  quantity: z.number().int().min(0),
  aisle: z.string().optional(),
  shelf: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    assertStoreAdminAccess(session.user);

    const inventories = await prisma.inventory.findMany({
      include: {
        product: {
          include: {
            category: true,
            barcodes: true,
          },
        },
        store: true,
      },
      orderBy: { quantity: "asc" },
    });

    return NextResponse.json({ inventories });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch inventory";
    return NextResponse.json({ error: errMessage }, { status: 403 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    assertStoreAdminAccess(session.user);

    const body = await req.json();
    const validated = InventoryUpdateSchema.parse(body);

    const updated = await prisma.inventory.update({
      where: { id: validated.inventoryId },
      data: {
        quantity: validated.quantity,
        ...(validated.aisle ? { aisle: validated.aisle } : {}),
        ...(validated.shelf ? { shelf: validated.shelf } : {}),
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json({ success: true, inventory: updated });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to update inventory";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
