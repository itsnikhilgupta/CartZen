import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { InitiateCheckoutSchema } from "@/server/validations";
import { PaymentService } from "@/server/services/payment.service";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const body = await req.json();
    const { shoppingSessionId } = InitiateCheckoutSchema.parse(body);

    const purchase = await PaymentService.initiatePurchase(shoppingSessionId, session.user.id);

    return NextResponse.json({ success: true, purchase });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to initiate checkout";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
