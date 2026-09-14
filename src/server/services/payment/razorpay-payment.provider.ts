import {
  IPaymentProvider,
  CreateOrderParams,
  ProviderOrderResult,
  VerifyPaymentParams,
  WebhookPayload,
} from "./payment-provider.interface";
import { generateHMACSignature, verifyHMACSignature, generateSecureToken } from "@/server/security/crypto";

export class RazorpayPaymentProvider implements IPaymentProvider {
  readonly providerName = "RAZORPAY";

  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_mockkey";
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_mocksecret";
  }

  async createPaymentOrder(params: CreateOrderParams): Promise<ProviderOrderResult> {
    const providerOrderId = generateSecureToken("order_rzp");

    const sigPayload = `${providerOrderId}|${params.purchaseId}`;
    const providerSignature = generateHMACSignature(sigPayload, this.keySecret);

    return {
      providerOrderId,
      amount: params.amount,
      currency: params.currency,
      status: "CREATED",
      providerSignature,
      clientSecret: this.keyId,
    };
  }

  async verifyPaymentSignature(params: VerifyPaymentParams): Promise<boolean> {
    // Razorpay client payment signature: HMAC_SHA256(providerOrderId + "|" + transactionRef, keySecret)
    const payload = `${params.providerOrderId}|${params.transactionRef}`;
    return verifyHMACSignature(payload, params.signature, this.keySecret);
  }

  async verifyWebhookSignature(rawBody: string, signature: string, secret?: string): Promise<boolean> {
    const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || this.keySecret;
    return verifyHMACSignature(rawBody, signature, webhookSecret);
  }

  parseWebhookPayload(rawBody: string, headers: Record<string, string>): WebhookPayload {
    try {
      const data = JSON.parse(rawBody);
      const paymentEntity = data.payload?.payment?.entity || {};
      const orderEntity = data.payload?.order?.entity || {};

      let status: "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED" = "FAILED";
      if (data.event === "payment.captured" || data.event === "order.paid") {
        status = "SUCCESS";
      } else if (data.event === "refund.processed") {
        status = "REFUNDED";
      }

      return {
        eventId: data.event_id || headers["x-razorpay-event-id"] || generateSecureToken("RZP_EVT"),
        provider: this.providerName,
        eventType: data.event || "payment.captured",
        transactionRef: paymentEntity.id || orderEntity.id || "TXN_RZP",
        purchaseId: orderEntity.notes?.purchaseId || paymentEntity.notes?.purchaseId || "",
        status,
        amount: Number((paymentEntity.amount || 0) / 100),
        rawBody,
      };
    } catch {
      throw new Error("Failed to parse Razorpay webhook payload");
    }
  }
}
