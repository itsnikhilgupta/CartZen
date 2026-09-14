import { NextResponse } from "next/server";
import { PaymentService } from "@/server/services/payment.service";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headersObj: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headersObj[key.toLowerCase()] = val;
    });

    const providerName = req.headers.get("x-payment-provider") || undefined;
    const result = await PaymentService.handleWebhook(rawBody, headersObj, providerName);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Webhook processing error";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
