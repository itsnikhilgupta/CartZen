import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { PaymentProcessSchema } from "@/server/validations";
import { PaymentService } from "@/server/services/payment.service";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const body = await req.json();
    const { purchaseId, paymentMethod, provider, clientTransactionRef, signature, amountPaid } = PaymentProcessSchema.parse(body);

    const result = await PaymentService.processPayment({
      purchaseId,
      userId: session.user.id,
      paymentMethod,
      provider,
      clientTransactionRef,
      signature,
      amountPaid,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
