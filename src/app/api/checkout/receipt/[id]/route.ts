import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { assertCustomerAccess } from "@/server/security/rbac";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const receipt = await prisma.receipt.findFirst({
      where: {
        OR: [
          { id: params.id },
          { purchaseId: params.id },
        ],
      },
      include: {
        purchase: {
          include: {
            items: true,
            store: true,
            user: {
              select: { id: true, name: true, email: true },
            },
            payment: true,
            exitVerification: true,
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // IDOR Protection: Verify ownership or Store Admin role
    assertCustomerAccess(session.user, receipt.purchase.userId);

    return NextResponse.json({ receipt });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch receipt";
    return NextResponse.json({ error: errMessage }, { status: 403 });
  }
}
