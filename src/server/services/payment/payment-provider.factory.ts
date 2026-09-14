import { IPaymentProvider } from "./payment-provider.interface";
import { MockPaymentProvider } from "./mock-payment.provider";
import { RazorpayPaymentProvider } from "./razorpay-payment.provider";
import { StripePaymentProvider } from "./stripe-payment.provider";

export class PaymentProviderFactory {
  private static providers: Record<string, IPaymentProvider> = {
    MOCK: new MockPaymentProvider(),
    RAZORPAY: new RazorpayPaymentProvider(),
    STRIPE: new StripePaymentProvider(),
  };

  /**
   * Get configured payment provider instance
   */
  static getProvider(name?: string): IPaymentProvider {
    const providerKey = (name || process.env.PAYMENT_PROVIDER || "MOCK").toUpperCase();
    const provider = this.providers[providerKey];

    if (!provider) {
      // Fallback to MockPaymentProvider
      return this.providers["MOCK"];
    }

    return provider;
  }
}
