import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      include: {
        store: true,
        items: true,
        payment: true,
        receipt: true,
        exitVerification: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // STRICT CUSTOMER AUTHORIZATION CHECK: Prevent viewing another customer's order
    if (purchase.userId !== session.user.id) {
      return NextResponse.json({ error: "FORBIDDEN: Access denied to this order" }, { status: 403 });
    }

    return NextResponse.json({ success: true, purchase });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch order details";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
