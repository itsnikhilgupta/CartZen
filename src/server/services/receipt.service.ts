import { prisma } from "@/server/db/prisma";
import { generateSecureToken, generateHMACSignature } from "@/server/security/crypto";

export class ReceiptService {
  /**
   * Generate E-Bill Receipt and cryptographic Exit Verification QR Code
   */
  static async generateReceiptAndExitQR(purchaseId: string) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: true,
        user: true,
        payment: true,
      },
    });

    if (!purchase) {
      throw new Error("Purchase order not found for receipt generation");
    }

    const receiptNumber = generateSecureToken("RCP");
    const verificationCode = generateSecureToken("EXIT");

    // Construct Cryptographic QR Code payload with 4-hour expiration window
    // NO sensitive customer information is stored in the QR payload
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const qrRawPayload = `${purchase.orderNumber}:${purchase.storeId}:${verificationCode}:${expiresAt}`;
    const qrSignature = generateHMACSignature(qrRawPayload);

    const qrCodeData = JSON.stringify({
      orderNumber: purchase.orderNumber,
      storeId: purchase.storeId,
      code: verificationCode,
      expiresAt,
      sig: qrSignature,
    });

    const receiptJson = JSON.stringify({
      receiptNumber,
      orderNumber: purchase.orderNumber,
      storeName: purchase.store.name,
      storeCode: purchase.store.code,
      storeAddress: `${purchase.store.address}, ${purchase.store.city}, ${purchase.store.state}, ${purchase.store.country}`,
      customerName: purchase.user.name,
      customerEmail: purchase.user.email,
      date: purchase.createdAt.toISOString(),
      items: purchase.items.map((i) => ({
        sku: i.sku,
        name: i.name,
        qty: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount || 0,
        taxAmount: i.taxAmount || 0,
        lineTotal: i.lineTotal,
      })),
      subtotal: purchase.subtotal,
      taxTotal: purchase.taxTotal,
      discountTotal: purchase.discountTotal,
      grandTotal: purchase.grandTotal,
      currency: purchase.store.currency || "INR",
      paymentMethod: purchase.payment?.method || "CARD",
      paymentProvider: purchase.payment?.provider || "CARTZEN_PAY",
      transactionRef: purchase.payment?.transactionRef || "TXN_COMMITTED",
    });

    const receipt = await prisma.receipt.upsert({
      where: { purchaseId: purchase.id },
      update: {
        receiptNumber,
        receiptJson,
        qrCodeData,
        eBillUrl: `/receipt/${purchase.id}`,
      },
      create: {
        purchaseId: purchase.id,
        receiptNumber,
        eBillUrl: `/receipt/${purchase.id}`,
        receiptJson,
        qrCodeData,
      },
    });

    // Upsert ExitVerification record with initial PENDING status
    const exitRecord = await prisma.exitVerification.upsert({
      where: { purchaseId: purchase.id },
      update: {
        verificationCode,
        status: "PENDING",
      },
      create: {
        purchaseId: purchase.id,
        storeId: purchase.storeId,
        verificationCode,
        status: "PENDING",
      },
    });

    return {
      ...receipt,
      verificationCode: exitRecord.verificationCode,
    };
  }

  /**
   * Fetch E-Bill receipt with authorization ownership guard
   */
  static async getReceiptForUser(receiptIdOrPurchaseId: string, userId: string) {
    const purchase = await prisma.purchase.findFirst({
      where: {
        OR: [{ id: receiptIdOrPurchaseId }, { receipt: { id: receiptIdOrPurchaseId } }],
      },
      include: {
        receipt: true,
        store: true,
        user: true,
        payment: true,
        items: true,
        exitVerification: true,
      },
    });

    if (!purchase) {
      throw new Error("Receipt not found");
    }

    if (purchase.userId !== userId) {
      throw new Error("FORBIDDEN: You do not have permission to view this receipt");
    }

    return purchase;
  }
}
