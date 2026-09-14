import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/server/db/prisma";
import { PaymentService } from "@/server/services/payment.service";
import { ExitService } from "@/server/services/exit.service";
import { ReceiptService } from "@/server/services/receipt.service";
import { cleanDatabase } from "../helpers/db";

describe("Phase 7: Supermarket Exit Verification System", () => {
  let testStaffId: string;
  let testUserId: string;
  let storeAId: string;
  let storeBId: string;
  let testProductId: string;
  let testSessionId: string;

  beforeEach(async () => {
    // Clean database in strict reverse-dependency order
    await cleanDatabase();

    // Create Staff User (STORE_ADMIN)
    const staff = await prisma.user.create({
      data: {
        email: `staff-${Date.now()}-${Math.random()}@cartzen.com`,
        passwordHash: "hashed_pass",
        name: "Store Staff Gatekeeper",
        role: "STORE_ADMIN",
      },
    });
    testStaffId = staff.id;

    // Create Customer User
    const customer = await prisma.user.create({
      data: {
        email: `customer-${Date.now()}-${Math.random()}@cartzen.com`,
        passwordHash: "hashed_pass",
        name: "Alice Shopper",
        role: "CUSTOMER",
      },
    });
    testUserId = customer.id;

    // Create Store A and Store B
    const storeA = await prisma.store.create({
      data: {
        name: "CartZen Supermarket #101",
        code: `STORE-A-${Date.now()}-${Math.random()}`,
        address: "100 Main Street",
        city: "San Francisco",
        currency: "INR",
        status: "ACTIVE",
      },
    });
    storeAId = storeA.id;

    const storeB = await prisma.store.create({
      data: {
        name: "CartZen Supermarket #102",
        code: `STORE-B-${Date.now()}-${Math.random()}`,
        address: "200 Market Street",
        city: "San Jose",
        currency: "INR",
        status: "ACTIVE",
      },
    });
    storeBId = storeB.id;

    // Create Product Category & Product
    const category = await prisma.productCategory.create({
      data: { name: "Bakery", slug: `bakery-${Date.now()}-${Math.random()}` },
    });

    const product = await prisma.product.create({
      data: {
        sku: `SKU-BREAD-${Date.now()}-${Math.random()}`,
        name: "Whole Wheat Bread 400g",
        brand: "BakersFresh",
        description: "Fresh wheat bread",
        categoryId: category.id,
        status: "ACTIVE",
        barcodes: {
          create: { barcode: `890104${Date.now()}${Math.floor(Math.random() * 1000)}`, isPrimary: true },
        },
      },
    });
    testProductId = product.id;

    // Product Price & Inventory in Store A
    await prisma.productPrice.create({
      data: { productId: product.id, storeId: storeA.id, listPrice: 50, salePrice: 50, currency: "INR" },
    });
    await prisma.inventory.create({
      data: { productId: product.id, storeId: storeA.id, quantity: 100 },
    });

    // Create Session & Cart for Store A
    const session = await prisma.shoppingSession.create({
      data: { userId: testUserId, storeId: storeA.id, status: "ACTIVE" },
    });
    testSessionId = session.id;

    await prisma.cart.create({
      data: {
        shoppingSessionId: session.id,
        userId: testUserId,
        storeId: storeA.id,
        totalAmount: 105, // 2 x 50 + 5% GST (5)
        totalTax: 5,
        items: {
          create: { productId: product.id, quantity: 2, unitPrice: 50, lineTotal: 105 },
        },
      },
    });
  });

  it("1. Should successfully verify a valid exit QR pass for paid order at matching store", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);
    const payRes = await PaymentService.processPayment({
      purchaseId: purchase.id,
      userId: testUserId,
      paymentMethod: "UPI",
      provider: "MOCK",
      clientTransactionRef: `TXN-EXIT-${Date.now()}-${Math.random()}`,
      amountPaid: 105,
    });

    const exitCode = payRes.exitCode!;

    const result = await ExitService.verifyExitCode({
      verificationCode: exitCode,
      storeId: storeAId,
      verifiedByUserId: testStaffId,
    });

    expect(result.valid).toBe(true);
    expect(result.reason).toBe("VERIFIED");
    expect(result.orderStatusText).toBe("ORDER VERIFIED");
    expect(result.customerExitText).toBe("CUSTOMER MAY EXIT");
    expect(result.customerName).toBe("Alice Shopper");
    expect(result.itemCount).toBe(1);
    expect(result.grandTotal).toBe(105);

    // Verify DB exit verification status updated to VERIFIED
    const exitRecord = await prisma.exitVerification.findUnique({ where: { verificationCode: exitCode } });
    expect(exitRecord?.status).toBe("VERIFIED");
    expect(exitRecord?.verifiedByUserId).toBe(testStaffId);
  });

  it("2. Should reject replayed/duplicate exit QR scan (Single-Use Guard)", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);
    const payRes = await PaymentService.processPayment({
      purchaseId: purchase.id,
      userId: testUserId,
      paymentMethod: "UPI",
      provider: "MOCK",
      clientTransactionRef: `TXN-REPLAY-${Date.now()}-${Math.random()}`,
      amountPaid: 105,
    });

    const exitCode = payRes.exitCode!;

    // 1st Scan -> Success
    await ExitService.verifyExitCode({
      verificationCode: exitCode,
      storeId: storeAId,
      verifiedByUserId: testStaffId,
    });

    // 2nd Replayed Scan -> Rejected ALREADY_USED
    const res2 = await ExitService.verifyExitCode({
      verificationCode: exitCode,
      storeId: storeAId,
      verifiedByUserId: testStaffId,
    });

    expect(res2.valid).toBe(false);
    expect(res2.reason).toBe("ALREADY_USED");
    expect(res2.message).toContain("ALREADY scanned and verified");
  });

  it("3. Should reject exit verification at wrong store location (Cross-Store Protection)", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);
    const payRes = await PaymentService.processPayment({
      purchaseId: purchase.id,
      userId: testUserId,
      paymentMethod: "CARD",
      provider: "MOCK",
      clientTransactionRef: `TXN-CROSS-${Date.now()}-${Math.random()}`,
      amountPaid: 105,
    });

    const exitCode = payRes.exitCode!;

    // Attempt verification at Store B instead of Store A
    const result = await ExitService.verifyExitCode({
      verificationCode: exitCode,
      storeId: storeBId, // Wrong Store!
      verifiedByUserId: testStaffId,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("STORE_MISMATCH");
  });

  it("4. Should reject fake or tampered exit QR code", async () => {
    const fakeCode = "EXIT-FAKE-CODE-99999";

    const result = await ExitService.verifyExitCode({
      verificationCode: fakeCode,
      storeId: storeAId,
      verifiedByUserId: testStaffId,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("INVALID");
  });

  it("5. Should reject exit QR if order payment is unpaid/pending", async () => {
    // Initiate purchase without calling processPayment (paymentStatus remains PENDING)
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);

    // Generate exit QR record directly in PENDING state
    const receipt = await ReceiptService.generateReceiptAndExitQR(purchase.id);

    const result = await ExitService.verifyExitCode({
      verificationCode: receipt.verificationCode,
      storeId: storeAId,
      verifiedByUserId: testStaffId,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("UNPAID_ORDER");
  });

  it("6. Should log an audit trail entry for every exit verification attempt", async () => {
    const purchase = await PaymentService.initiatePurchase(testSessionId, testUserId);
    const payRes = await PaymentService.processPayment({
      purchaseId: purchase.id,
      userId: testUserId,
      paymentMethod: "UPI",
      provider: "MOCK",
      clientTransactionRef: `TXN-AUDIT-${Date.now()}-${Math.random()}`,
      amountPaid: 105,
    });

    await ExitService.verifyExitCode({
      verificationCode: payRes.exitCode!,
      storeId: storeAId,
      verifiedByUserId: testStaffId,
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: { action: "EXIT_VERIFICATION" },
    });

    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].userId).toBe(testStaffId);
    expect(auditLogs[0].entityType).toBe("EXIT_VERIFICATION");
  });
});
