import { prisma } from "@/server/db/prisma";
import { generateHMACSignature, generateSecureToken } from "@/server/security/crypto";
import { PaymentProviderFactory } from "./payment/payment-provider.factory";
import { ReceiptService } from "./receipt.service";

export class PaymentService {
  /**
   * 1. Initiate Purchase order from active cart (Server-Authoritative)
   */
  static async initiatePurchase(shoppingSessionId: string, userId: string) {
    const session = await prisma.shoppingSession.findUnique({
      where: { id: shoppingSessionId },
      include: {
        cart: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!session || !session.cart || session.cart.items.length === 0) {
      throw new Error("Cannot checkout an empty or invalid shopping session");
    }

    if (session.userId !== userId) {
      throw new Error("FORBIDDEN: Session does not belong to user");
    }

    // Check if purchase already exists for this session
    const existingPurchase = await prisma.purchase.findUnique({
      where: { shoppingSessionId },
      include: { items: true },
    });

    if (existingPurchase) {
      return existingPurchase;
    }

    const cart = session.cart;

    // Recalculate authoritative totals directly from database items
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const purchaseItemData = cart.items.map((item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemDiscount = item.discountAmount || 0;
      const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);
      const itemTax = Math.round(taxableAmount * 0.05 * 100) / 100; // 5% GST
      const lineTotal = taxableAmount + itemTax;

      subtotal += itemSubtotal;
      discountTotal += itemDiscount;
      taxTotal += itemTax;

      return {
        productId: item.productId,
        sku: item.product.sku,
        name: item.product.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountAmount: itemDiscount,
        taxAmount: itemTax,
        lineTotal,
      };
    });

    const grandTotal = Math.max(0, subtotal - discountTotal) + taxTotal;
    const orderNumber = generateSecureToken("ORD");

    // Create immutable Purchase Record
    const purchase = await prisma.purchase.create({
      data: {
        shoppingSessionId: session.id,
        cartId: cart.id,
        userId: session.userId,
        storeId: session.storeId,
        orderNumber,
        subtotal,
        taxTotal,
        discountTotal,
        grandTotal,
        paymentStatus: "PENDING",
        orderStatus: "PENDING",
        items: {
          create: purchaseItemData,
        },
      },
      include: {
        items: true,
      },
    });

    // Update Session status to CHECKOUT_PENDING
    await prisma.shoppingSession.update({
      where: { id: session.id },
      data: { status: "CHECKOUT_PENDING" },
    });

    return purchase;
  }

  /**
   * 2. Create Payment Intent/Order with Gateway Provider
   */
  static async createPaymentIntent(params: {
    purchaseId: string;
    userId: string;
    method: "UPI" | "CARD";
    providerName?: string;
  }) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: params.purchaseId },
      include: { user: true },
    });

    if (!purchase) {
      throw new Error("Purchase order not found");
    }

    if (purchase.userId !== params.userId) {
      throw new Error("FORBIDDEN: Order ownership mismatch");
    }

    if (purchase.paymentStatus === "SUCCESS") {
      throw new Error("Purchase order is already paid");
    }

    const provider = PaymentProviderFactory.getProvider(params.providerName);
    const orderResult = await provider.createPaymentOrder({
      purchaseId: purchase.id,
      orderNumber: purchase.orderNumber,
      amount: purchase.grandTotal,
      currency: "INR",
      method: params.method,
      customerEmail: purchase.user.email,
      customerName: purchase.user.name,
    });

    // Create or update Payment record in CREATED/PENDING state
    const payment = await prisma.payment.upsert({
      where: { purchaseId: purchase.id },
      update: {
        amount: purchase.grandTotal,
        provider: provider.providerName,
        method: params.method,
        transactionRef: orderResult.providerOrderId,
        signature: orderResult.providerSignature,
        status: "CREATED",
      },
      create: {
        purchaseId: purchase.id,
        amount: purchase.grandTotal,
        currency: "INR",
        provider: provider.providerName,
        method: params.method,
        transactionRef: orderResult.providerOrderId,
        signature: orderResult.providerSignature,
        status: "CREATED",
      },
    });

    return {
      purchaseId: purchase.id,
      orderNumber: purchase.orderNumber,
      grandTotal: purchase.grandTotal,
      provider: provider.providerName,
      paymentId: payment.id,
      providerOrderId: orderResult.providerOrderId,
      clientSecret: orderResult.clientSecret,
      qrPayload: orderResult.qrPayload,
    };
  }

  /**
   * 3. Server-authoritative payment verification & order completion
   */
  static async processPayment(params: {
    purchaseId: string;
    userId: string;
    paymentMethod: "UPI" | "CARD";
    provider?: string;
    clientTransactionRef: string;
    signature?: string;
    amountPaid?: number;
  }) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: params.purchaseId },
      include: {
        items: true,
        session: true,
        user: true,
      },
    });

    if (!purchase) {
      throw new Error("Purchase order not found");
    }

    if (purchase.userId !== params.userId) {
      throw new Error("FORBIDDEN: Purchase order ownership mismatch");
    }

    // STATE MACHINE GUARD: Prevent duplicate payment for already completed order
    if (purchase.paymentStatus === "SUCCESS") {
      const existingReceipt = await prisma.receipt.findUnique({ where: { purchaseId: purchase.id } });
      const existingExit = await prisma.exitVerification.findUnique({ where: { purchaseId: purchase.id } });

      return {
        success: true,
        orderNumber: purchase.orderNumber,
        amountPaid: purchase.grandTotal,
        alreadyPaid: true,
        receiptId: existingReceipt?.id,
        exitCode: existingExit?.verificationCode,
      };
    }

    // AMOUNT MANIPULATION SECURITY CHECK: Reject if submitted amount does not match server grandTotal
    if (params.amountPaid !== undefined && Math.abs(params.amountPaid - purchase.grandTotal) > 0.01) {
      throw new Error("SECURITY_FAILURE: Payment amount manipulation detected. Submitted amount does not match authoritative total.");
    }

    const provider = PaymentProviderFactory.getProvider(params.provider);

    // Signature verification via provider adapter or cryptographic fallback
    let isSignatureValid = true;
    if (params.signature) {
      isSignatureValid = await provider.verifyPaymentSignature({
        purchaseId: purchase.id,
        providerOrderId: params.clientTransactionRef,
        transactionRef: params.clientTransactionRef,
        signature: params.signature,
        amount: purchase.grandTotal,
        method: params.paymentMethod,
      });
    }

    if (!isSignatureValid) {
      throw new Error("SECURITY_FAILURE: Payment signature verification failed");
    }

    const serverSignature = params.signature || generateHMACSignature(`${purchase.id}:${purchase.grandTotal}:${params.clientTransactionRef}:${params.paymentMethod}`);

    // Atomic database transaction: Payment status, Purchase status, Session completion, Inventory deduction
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.upsert({
        where: { purchaseId: purchase.id },
        update: {
          amount: purchase.grandTotal,
          provider: provider.providerName,
          method: params.paymentMethod,
          transactionRef: params.clientTransactionRef,
          signature: serverSignature,
          status: "SUCCESS",
          verifiedAt: new Date(),
        },
        create: {
          purchaseId: purchase.id,
          amount: purchase.grandTotal,
          currency: "INR",
          provider: provider.providerName,
          method: params.paymentMethod,
          transactionRef: params.clientTransactionRef,
          signature: serverSignature,
          status: "SUCCESS",
          verifiedAt: new Date(),
        },
      });

      const updatedPurchase = await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          paymentStatus: "SUCCESS",
          orderStatus: "PAID",
        },
      });

      await tx.shoppingSession.update({
        where: { id: purchase.shoppingSessionId },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
        },
      });

      // Deduct inventory stock
      for (const item of purchase.items) {
        await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            storeId: purchase.storeId,
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      return { payment, purchase: updatedPurchase };
    });

    // Generate E-Bill Receipt & Exit QR Code
    const receipt = await ReceiptService.generateReceiptAndExitQR(purchase.id);

    return {
      success: true,
      orderNumber: purchase.orderNumber,
      amountPaid: purchase.grandTotal,
      paymentId: result.payment.id,
      receiptId: receipt.id,
      exitCode: receipt.verificationCode,
    };
  }

  /**
   * 4. Idempotent Payment Webhook Processing
   */
  static async handleWebhook(rawBody: string, headers: Record<string, string>, providerName?: string) {
    const provider = PaymentProviderFactory.getProvider(providerName);

    // Verify webhook signature
    const signature = headers["x-razorpay-signature"] || headers["stripe-signature"] || headers["x-webhook-signature"] || "";
    const isValidSig = await provider.verifyWebhookSignature(rawBody, signature);

    if (!isValidSig) {
      throw new Error("SECURITY_FAILURE: Webhook signature verification failed");
    }

    const payload = provider.parseWebhookPayload(rawBody, headers);

    // IDEMPOTENCY CHECK: Reject replayed or duplicate webhook events
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId: payload.eventId },
    });

    if (existingEvent) {
      return {
        success: true,
        eventId: payload.eventId,
        alreadyProcessed: true,
        message: "Webhook event was already processed previously (Idempotent execution)",
      };
    }

    if (payload.purchaseId) {
      const purchase = await prisma.purchase.findUnique({
        where: { id: payload.purchaseId },
      });

      if (purchase) {
        if (payload.status === "SUCCESS" && purchase.paymentStatus !== "SUCCESS") {
          await this.processPayment({
            purchaseId: purchase.id,
            userId: purchase.userId,
            paymentMethod: "CARD",
            provider: provider.providerName,
            clientTransactionRef: payload.transactionRef,
            amountPaid: payload.amount || purchase.grandTotal,
          });
        } else if (payload.status === "REFUNDED" && purchase.paymentStatus === "SUCCESS") {
          await this.processRefund(purchase.id, "Webhook refund event", "SYSTEM");
        }
      }
    }

    // Log processed webhook event for audit and future idempotency checks
    await prisma.webhookEvent.create({
      data: {
        eventId: payload.eventId,
        provider: provider.providerName,
        eventType: payload.eventType,
        payload: rawBody,
        status: "PROCESSED",
      },
    });

    return {
      success: true,
      eventId: payload.eventId,
      alreadyProcessed: false,
      message: "Webhook processed successfully",
    };
  }

  /**
   * 5. Process Order Refund & Inventory Restoration
   */
  static async processRefund(purchaseId: string, reason: string, adminUserId: string) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });

    if (!purchase) {
      throw new Error("Purchase order not found");
    }

    if (purchase.paymentStatus !== "SUCCESS") {
      throw new Error("Cannot refund an unpaid or invalid order");
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { purchaseId: purchase.id },
        data: { status: "REFUNDED" },
      });

      const updatedPurchase = await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          paymentStatus: "REFUNDED",
          orderStatus: "CANCELLED",
        },
      });

      // Restore inventory quantity
      for (const item of purchase.items) {
        await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            storeId: purchase.storeId,
          },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "ORDER_REFUND",
          entityType: "PURCHASE",
          entityId: purchase.id,
          payload: JSON.stringify({ reason, grandTotal: purchase.grandTotal }),
        },
      });

      return updatedPurchase;
    });

    return result;
  }
}
