import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { PaymentService } from "@/server/services/payment.service";
import { z } from "zod";

const PaymentIntentSchema = z.object({
  purchaseId: z.string().uuid("Invalid purchase ID"),
  method: z.enum(["UPI", "CARD"]),
  provider: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const body = await req.json();
    const { purchaseId, method, provider } = PaymentIntentSchema.parse(body);

    const intent = await PaymentService.createPaymentIntent({
      purchaseId,
      userId: session.user.id,
      method,
      providerName: provider,
    });

    return NextResponse.json({ success: true, intent });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to create payment intent";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
