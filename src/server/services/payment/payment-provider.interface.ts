export interface CreateOrderParams {
  purchaseId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  method: "UPI" | "CARD";
  customerEmail: string;
  customerName: string;
}

export interface ProviderOrderResult {
  providerOrderId: string;
  amount: number;
  currency: string;
  status: "CREATED" | "PENDING";
  providerSignature: string;
  clientSecret?: string;
  qrPayload?: string;
}

export interface VerifyPaymentParams {
  purchaseId: string;
  providerOrderId: string;
  transactionRef: string;
  signature: string;
  amount: number;
  method: "UPI" | "CARD";
}

export interface WebhookPayload {
  eventId: string;
  provider: string;
  eventType: string;
  transactionRef: string;
  purchaseId: string;
  status: "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED";
  amount: number;
  rawBody: string;
}

export interface WebhookProcessResult {
  success: boolean;
  eventId: string;
  alreadyProcessed: boolean;
  message: string;
  purchaseId?: string;
}

export interface IPaymentProvider {
  readonly providerName: string;

  /**
   * Create a payment intent/order on the gateway
   */
  createPaymentOrder(params: CreateOrderParams): Promise<ProviderOrderResult>;

  /**
   * Verify signature sent by client after payment checkout completion
   */
  verifyPaymentSignature(params: VerifyPaymentParams): Promise<boolean>;

  /**
   * Verify authenticity of incoming gateway webhook HTTP signature
   */
  verifyWebhookSignature(rawBody: string, signature: string, secret?: string): Promise<boolean>;

  /**
   * Process incoming raw webhook payload into standardized WebhookPayload format
   */
  parseWebhookPayload(rawBody: string, headers: Record<string, string>): WebhookPayload;
}
