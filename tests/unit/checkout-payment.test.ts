import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/server/db/prisma";
import { PaymentService } from "@/server/services/payment.service";
import { ReceiptService } from "@/server/services/receipt.service";
import { ExitService } from "@/server/services/exit.service";
import { generateHMACSignature } from "@/server/security/crypto";
import { cleanDatabase } from "../helpers/db";

describe("Phase 6: Checkout, Payment Security & Exit QR System", () => {
  let testUserId: string;
  let testOtherUserId: string;
  let testStoreId: string;
  let testProductId: string;
  let testSessionId: string;

  beforeEach(async () => {
    // Clean database in strict reverse-dependency order
    await cleanDatabase();

    // Create Test Customer User
    const user = await prisma.user.create({
      data: {
        email: `customer-${Date.now()}-${Math.random()}@cartzen.com`,
        passwordHash: "hashed_password",
        name: "Test Customer",
        role: "CUSTOMER",
      },
    });
    testUserId = user.id;

    // Create Other Customer User (for IDOR authorization tests)
    const otherUser = await prisma.user.create({
      data: {
        email: `other-${Date.now()}-${Math.random()}@cartzen.com`,
        passwordHash: "hashed_password",
        name: "Other Customer",
        role: "CUSTOMER",
      },
    });
    testOtherUserId = otherUser.id;

    // Create Test Store
    const store = await prisma.store.create({
      data: {
        name: "CartZen Test Supermarket #99",
        code: `STORE-TEST-${Date.now()}-${Math.random()}`,
        address: "100 Innovation Way",
        city: "San Francisco",
        state: "California",
        country: "USA",
        currency: "INR",
        status: "ACTIVE",
      },
    });
    testStoreId = store.id;

    // Create Product Category & Product
    const category = await prisma.productCategory.create({
      data: { name: "Fresh Dairy", slug: `fresh-dairy-${Date.now()}-${Math.random()}` },
    });

    const product = await prisma.product.create({
      data: {
        sku: `SKU-MILK-${Date.now()}-${Math.random()}`,
        name: "Organic Whole Milk 1L",
        brand: "FarmFresh",
        description: "Fresh pasteurized whole milk",
        categoryId: category.id,
        unit: "L",
        status: "ACTIVE",
        barcodes: {
          create: { barcode: `890103${Date.now()}${Math.floor(Math.random() * 1000)}`, isPrimary: true },
        },
      },
    });
    testProductId = product.id;

    // Create Product Price & Inventory
    await prisma.productPrice.create({
      data: {
        productId: product.id,
        storeId: store.id,
        listPrice: 100,
        salePrice: 100,
        currency: "INR",
      },
    });

    await prisma.inventory.create({
      data: {
        productId: product.id,
        storeId: store.id,
        quantity: 50,
      },
    });

    // Create Active Shopping Session & Cart
    const session = await prisma.shoppingSession.create({
      data: {
        userId: testUserId,
        storeId: testStoreId,
        status: "ACTIVE",
      },
    });
    testSessionId = session.id;

    await prisma.cart.create({
      data: {
        shoppingSessionId: session.id,
        userId: testUserId,
        storeId: testStoreId,
        totalAmount: 210, // 2 x 100 + 5% GST (10)
        totalTax: 10,
        items: {
          create: {
            productId: product.id,
            quantity: 2,
            unitPrice: 100,
            discountAmount: 0,
            lineTotal: 210,
          },
        },
      },
    });
  });

  it("1. Should calculate authoritative purchase totals from server cart items", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);

    expect(purchase).toBeDefined();
    expect(purchase.userId).toBe(testUserId);
    expect(purchase.storeId).toBe(testStoreId);
    expect(purchase.subtotal).toBe(200);
    expect(purchase.taxTotal).toBe(10);
    expect(purchase.grandTotal).toBe(210);
    expect(purchase.paymentStatus).toBe("PENDING");
    expect(purchase.items.length).toBe(1);
    expect(purchase.items[0].quantity).toBe(2);
    expect(purchase.items[0].unitPrice).toBe(100);
  });

  it("2. Should reject payment if client submits manipulated amount (Amount Security Check)", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);

    await expect(
      PaymentService.processPayment({
        purchaseId: purchase.id,
        userId: testUserId,
        paymentMethod: "UPI",
        provider: "MOCK",
        clientTransactionRef: `TXN-MANIPULATE-${Date.now()}`,
        amountPaid: 50, // Manipulated lower amount!
      })
    ).rejects.toThrow("SECURITY_FAILURE: Payment amount manipulation detected");
  });

  it("3. Should process payment atomically and generate E-Bill & Exit QR", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);

    const result = await PaymentService.processPayment({
      purchaseId: purchase.id,
      userId: testUserId,
      paymentMethod: "UPI",
      provider: "MOCK",
      clientTransactionRef: `TXN-VALID-${Date.now()}-${Math.random()}`,
      amountPaid: 210,
    });

    expect(result.success).toBe(true);
    expect(result.orderNumber).toBe(purchase.orderNumber);
    expect(result.receiptId).toBeDefined();
    expect(result.exitCode).toBeDefined();

    // Verify inventory deduction (50 -> 48)
    const inv = await prisma.inventory.findUnique({
      where: { productId_storeId: { productId: testProductId, storeId: testStoreId } },
    });
    expect(inv?.quantity).toBe(48);

    // Verify Session COMPLETED
    const session = await prisma.shoppingSession.findUnique({ where: { id: testSessionId } });
    expect(session?.status).toBe("COMPLETED");
  });

  it("4. Should prevent duplicate payment processing on an already paid order", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);
    const txnRef = `TXN-DUP-${Date.now()}-${Math.random()}`;

    // First Payment Success
    await PaymentService.processPayment({
      purchaseId: purchase.id,
      userId: testUserId,
      paymentMethod: "CARD",
      provider: "MOCK",
      clientTransactionRef: txnRef,
      amountPaid: 210,
    });

    // Second Duplicate Payment Attempt
    const secondResult = await PaymentService.processPayment({
      purchaseId: purchase.id,
      userId: testUserId,
      paymentMethod: "CARD",
      provider: "MOCK",
      clientTransactionRef: txnRef,
      amountPaid: 210,
    });

    expect(secondResult.success).toBe(true);
    expect(secondResult.alreadyPaid).toBe(true);

    // Verify inventory was NOT double-deducted (stayed 48)
    const inv = await prisma.inventory.findUnique({
      where: { productId_storeId: { productId: testProductId, storeId: testStoreId } },
    });
    expect(inv?.quantity).toBe(48);
  });

  it("5. Should process webhooks idempotently and ignore duplicate replayed events", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);
    const eventId = `EVT-REPLAY-${Date.now()}-${Math.random()}`;
    const rawPayload = JSON.stringify({
      eventId,
      eventType: "payment.captured",
      transactionRef: `TXN-WEBHOOK-${Date.now()}-${Math.random()}`,
      purchaseId: purchase.id,
      status: "SUCCESS",
      amount: 210,
    });

    const signature = generateHMACSignature(rawPayload, process.env.PAYMENT_WEBHOOK_SECRET || "cartzen-secret");

    // First Webhook execution
    const res1 = await PaymentService.handleWebhook(rawPayload, { "x-webhook-signature": signature }, "MOCK");
    expect(res1.success).toBe(true);
    expect(res1.alreadyProcessed).toBe(false);

    // Replayed Webhook execution
    const res2 = await PaymentService.handleWebhook(rawPayload, { "x-webhook-signature": signature }, "MOCK");
    expect(res2.success).toBe(true);
    expect(res2.alreadyProcessed).toBe(true);
  });

  it("6. Should enforce single-use Exit QR Verification (PENDING -> VERIFIED -> ALREADY_USED)", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);
    const paymentRes = await PaymentService.processPayment({
      purchaseId: purchase.id,
      userId: testUserId,
      paymentMethod: "UPI",
      provider: "MOCK",
      clientTransactionRef: `TXN-EXIT-${Date.now()}-${Math.random()}`,
      amountPaid: 210,
    });

    const exitCode = paymentRes.exitCode!;

    // 1st Scan by Store Staff -> Success VERIFIED
    const scan1 = await ExitService.verifyExitCode({
      verificationCode: exitCode,
      storeId: testStoreId,
      verifiedByUserId: testUserId,
    });

    expect(scan1.valid).toBe(true);
    expect(scan1.reason).toBe("VERIFIED");

    // 2nd Scan by Store Staff -> Rejected ALREADY_USED
    const scan2 = await ExitService.verifyExitCode({
      verificationCode: exitCode,
      storeId: testStoreId,
      verifiedByUserId: testUserId,
    });

    expect(scan2.valid).toBe(false);
    expect(scan2.reason).toBe("ALREADY_USED");
  });

  it("7. Should enforce strict customer ownership authorization on receipts (IDOR Protection)", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);
    const paymentRes = await PaymentService.processPayment({
      purchaseId: purchase.id,
      userId: testUserId,
      paymentMethod: "CARD",
      provider: "MOCK",
      clientTransactionRef: `TXN-IDOR-${Date.now()}-${Math.random()}`,
      amountPaid: 210,
    });

    // Owner customer can access receipt
    const ownerReceipt = await ReceiptService.getReceiptForUser(paymentRes.receiptId!, testUserId);
    expect(ownerReceipt).toBeDefined();

    // Other customer attempting to view receipt is rejected
    await expect(
      ReceiptService.getReceiptForUser(paymentRes.receiptId!, testOtherUserId)
    ).rejects.toThrow("FORBIDDEN: You do not have permission to view this receipt");
  });

  it("8. Should safely transition order to REFUNDED and restore inventory", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);
    await PaymentService.processPayment({
      purchaseId: purchase.id,
      userId: testUserId,
      paymentMethod: "CARD",
      provider: "MOCK",
      clientTransactionRef: `TXN-REFUND-${Date.now()}-${Math.random()}`,
      amountPaid: 210,
    });

    // Refund Order
    const refundedPurchase = await PaymentService.processRefund(purchase.id, "Customer requested cancellation", testUserId);
    expect(refundedPurchase.paymentStatus).toBe("REFUNDED");
    expect(refundedPurchase.orderStatus).toBe("CANCELLED");

    // Inventory restored back to 50
    const inv = await prisma.inventory.findUnique({
      where: { productId_storeId: { productId: testProductId, storeId: testStoreId } },
    });
    expect(inv?.quantity).toBe(50);
  });
});
