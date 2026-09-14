import {
  IPaymentProvider,
  CreateOrderParams,
  ProviderOrderResult,
  VerifyPaymentParams,
  WebhookPayload,
} from "./payment-provider.interface";
import { generateHMACSignature, verifyHMACSignature, generateSecureToken } from "@/server/security/crypto";

export class StripePaymentProvider implements IPaymentProvider {
  readonly providerName = "STRIPE";

  private apiKey: string;
  private webhookSecret: string;

  constructor() {
    this.apiKey = process.env.STRIPE_SECRET_KEY || "sk_test_mockkey";
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_mocksecret";
  }

  async createPaymentOrder(params: CreateOrderParams): Promise<ProviderOrderResult> {
    const providerOrderId = generateSecureToken("pi_stripe");
    const clientSecret = `${providerOrderId}_secret_${generateSecureToken()}`;

    const sigPayload = `${providerOrderId}:${params.amount}:${params.purchaseId}`;
    const providerSignature = generateHMACSignature(sigPayload, this.apiKey);

    return {
      providerOrderId,
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      status: "CREATED",
      providerSignature,
      clientSecret,
    };
  }

  async verifyPaymentSignature(params: VerifyPaymentParams): Promise<boolean> {
    const payload = `${params.providerOrderId}:${params.amount}:${params.transactionRef}`;
    return verifyHMACSignature(payload, params.signature, this.apiKey);
  }

  async verifyWebhookSignature(rawBody: string, signature: string, secret?: string): Promise<boolean> {
    const keyToUse = secret || this.webhookSecret;
    return verifyHMACSignature(rawBody, signature, keyToUse);
  }

  parseWebhookPayload(rawBody: string, headers: Record<string, string>): WebhookPayload {
    try {
      const data = JSON.parse(rawBody);
      const object = data.data?.object || {};

      let status: "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED" = "FAILED";
      if (data.type === "payment_intent.succeeded" || data.type === "charge.succeeded") {
        status = "SUCCESS";
      } else if (data.type === "charge.refunded") {
        status = "REFUNDED";
      }

      return {
        eventId: data.id || headers["stripe-signature"] || generateSecureToken("STRIPE_EVT"),
        provider: this.providerName,
        eventType: data.type || "payment_intent.succeeded",
        transactionRef: object.id || "ch_stripe_mock",
        purchaseId: object.metadata?.purchaseId || "",
        status,
        amount: Number((object.amount || 0) / 100),
        rawBody,
      };
    } catch {
      throw new Error("Failed to parse Stripe webhook payload");
    }
  }
}
