import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const purchases = await prisma.purchase.findMany({
      where: { userId: session.user.id },
      include: {
        store: { select: { name: true, code: true, address: true } },
        items: true,
        payment: { select: { method: true, status: true, transactionRef: true } },
        receipt: { select: { id: true, receiptNumber: true } },
        exitVerification: { select: { status: true, verificationCode: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, purchases });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch orders";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
