import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { assertStoreAdminAccess } from "@/server/security/rbac";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    assertStoreAdminAccess(session.user);

    const purchases = await prisma.purchase.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        store: { select: { name: true, code: true } },
        items: true,
        payment: true,
        exitVerification: true,
      },
    });

    return NextResponse.json({ purchases });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch orders";
    return NextResponse.json({ error: errMessage }, { status: 403 });
  }
}
