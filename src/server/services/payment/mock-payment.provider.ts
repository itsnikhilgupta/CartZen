import {
  IPaymentProvider,
  CreateOrderParams,
  ProviderOrderResult,
  VerifyPaymentParams,
  WebhookPayload,
} from "./payment-provider.interface";
import { generateHMACSignature, verifyHMACSignature, generateSecureToken } from "@/server/security/crypto";

export class MockPaymentProvider implements IPaymentProvider {
  readonly providerName = "MOCK_PAYMENT_GATEWAY";

  async createPaymentOrder(params: CreateOrderParams): Promise<ProviderOrderResult> {
    const providerOrderId = generateSecureToken("MOCK_ORD");
    const rawSigPayload = `${params.purchaseId}:${params.amount}:${providerOrderId}:${params.method}`;
    const providerSignature = generateHMACSignature(rawSigPayload);

    return {
      providerOrderId,
      amount: params.amount,
      currency: params.currency,
      status: "CREATED",
      providerSignature,
      qrPayload: params.method === "UPI" ? `upi://pay?pa=cartzen@supermarket&pn=CartZen&am=${params.amount}&tr=${providerOrderId}` : undefined,
    };
  }

  async verifyPaymentSignature(params: VerifyPaymentParams): Promise<boolean> {
    const expectedPayload = `${params.purchaseId}:${params.amount}:${params.transactionRef}:${params.method}`;
    return verifyHMACSignature(expectedPayload, params.signature);
  }

  async verifyWebhookSignature(rawBody: string, signature: string, secret?: string): Promise<boolean> {
    if (!signature) return false;
    return verifyHMACSignature(rawBody, signature, secret || process.env.PAYMENT_WEBHOOK_SECRET || "cartzen-secret");
  }

  parseWebhookPayload(rawBody: string, headers: Record<string, string>): WebhookPayload {
    try {
      const data = JSON.parse(rawBody);
      return {
        eventId: data.eventId || headers["x-webhook-event-id"] || generateSecureToken("EVT"),
        provider: this.providerName,
        eventType: data.eventType || "payment.captured",
        transactionRef: data.transactionRef || data.paymentId || "TXN_MOCK",
        purchaseId: data.purchaseId || "",
        status: data.status || "SUCCESS",
        amount: Number(data.amount || 0),
        rawBody,
      };
    } catch {
      throw new Error("Invalid mock webhook JSON payload");
    }
  }
}
