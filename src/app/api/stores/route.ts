import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      where: { isMarketActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        city: true,
        state: true,
        status: true,
        isMarketActive: true,
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ stores });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch active store locations";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
