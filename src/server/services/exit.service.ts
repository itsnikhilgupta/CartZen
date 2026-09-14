import { prisma } from "@/server/db/prisma";
import { verifyHMACSignature } from "@/server/security/crypto";
import { formatTime } from "@/lib/utils";

export interface ExitVerificationParams {
  verificationCode: string;
  storeId: string;
  verifiedByUserId: string;
}

export interface ExitVerificationResult {
  valid: boolean;
  reason: "VERIFIED" | "ALREADY_USED" | "EXPIRED" | "STORE_MISMATCH" | "TAMPERED_QR" | "UNPAID_ORDER" | "INVALID";
  message: string;
  orderStatusText?: string;
  paymentConfirmedText?: string;
  customerExitText?: string;
  customerName?: string;
  orderNumber?: string;
  itemCount?: number;
  grandTotal?: number;
  verifiedAt?: Date;
  purchase?: any;
}

export class ExitService {
  /**
   * Authorized Store Staff scan verification of customer Exit QR Code
   */
  static async verifyExitCode(params: ExitVerificationParams): Promise<ExitVerificationResult> {
    const cleanCode = params.verificationCode.trim();

    // 1. Order Existence & Exit Record lookup
    const exitRecord = await prisma.exitVerification.findFirst({
      where: {
        OR: [
          { verificationCode: cleanCode },
          { purchase: { orderNumber: cleanCode } },
          { purchaseId: cleanCode },
        ],
      },
      include: {
        purchase: {
          include: {
            items: true,
            user: { select: { id: true, name: true, email: true } },
            receipt: true,
            payment: true,
          },
        },
      },
    });

    if (!exitRecord) {
      await this.logAudit({
        userId: params.verifiedByUserId,
        storeId: params.storeId,
        verificationCode: cleanCode,
        valid: false,
        reason: "INVALID",
        message: "Exit verification code not found in system database",
      });

      return {
        valid: false,
        reason: "INVALID",
        message: "Exit verification code not found in system database",
      };
    }

    const purchase = exitRecord.purchase;

    // 2. Payment Confirmation Check
    if (purchase.paymentStatus !== "SUCCESS") {
      await this.logAudit({
        userId: params.verifiedByUserId,
        storeId: params.storeId,
        purchaseId: purchase.id,
        orderNumber: purchase.orderNumber,
        verificationCode: cleanCode,
        valid: false,
        reason: "UNPAID_ORDER",
        message: `DENY EXIT: Order payment status is ${purchase.paymentStatus} (Not Paid)`,
      });

      return {
        valid: false,
        reason: "UNPAID_ORDER",
        message: `DENY EXIT: Order payment status is ${purchase.paymentStatus} (Not Paid)`,
      };
    }

    // 3. Store Ownership Matching Check (Cross-store protection)
    if (exitRecord.storeId !== params.storeId) {
      await this.logAudit({
        userId: params.verifiedByUserId,
        storeId: params.storeId,
        purchaseId: purchase.id,
        orderNumber: purchase.orderNumber,
        verificationCode: cleanCode,
        valid: false,
        reason: "STORE_MISMATCH",
        message: "DENY EXIT: Exit QR code belongs to a different supermarket store location",
      });

      return {
        valid: false,
        reason: "STORE_MISMATCH",
        message: "DENY EXIT: Exit QR code belongs to a different supermarket store location",
      };
    }

    // 4. Single-Use Enforcement (Replay protection)
    if (exitRecord.status === "VERIFIED") {
      await this.logAudit({
        userId: params.verifiedByUserId,
        storeId: params.storeId,
        purchaseId: purchase.id,
        orderNumber: purchase.orderNumber,
        verificationCode: cleanCode,
        valid: false,
        reason: "ALREADY_USED",
        message: `DENY EXIT: Exit QR was ALREADY scanned and verified at ${exitRecord.verifiedAt ? formatTime(exitRecord.verifiedAt) : "earlier time"}`,
      });

      return {
        valid: false,
        reason: "ALREADY_USED",
        message: `DENY EXIT: Exit QR was ALREADY scanned and verified at ${exitRecord.verifiedAt ? formatTime(exitRecord.verifiedAt) : "earlier time"}`,
        customerName: purchase.user.name,
        orderNumber: purchase.orderNumber,
        itemCount: purchase.items.length,
        grandTotal: purchase.grandTotal,
        verifiedAt: exitRecord.verifiedAt || undefined,
        purchase,
      };
    }

    if (exitRecord.status === "FLAGGED" || exitRecord.status === "EXPIRED") {
      await this.logAudit({
        userId: params.verifiedByUserId,
        storeId: params.storeId,
        purchaseId: purchase.id,
        orderNumber: purchase.orderNumber,
        verificationCode: cleanCode,
        valid: false,
        reason: "EXPIRED",
        message: `DENY EXIT: Exit QR status is ${exitRecord.status}`,
      });

      return {
        valid: false,
        reason: "EXPIRED",
        message: `DENY EXIT: Exit QR status is ${exitRecord.status}`,
      };
    }

    // 5. Cryptographic Signature & Expiration Window Check
    if (purchase.receipt?.qrCodeData) {
      try {
        const qrObj = JSON.parse(purchase.receipt.qrCodeData);
        if (qrObj.expiresAt && new Date(qrObj.expiresAt).getTime() < Date.now()) {
          await prisma.exitVerification.update({
            where: { id: exitRecord.id },
            data: { status: "EXPIRED" },
          });

          await this.logAudit({
            userId: params.verifiedByUserId,
            storeId: params.storeId,
            purchaseId: purchase.id,
            orderNumber: purchase.orderNumber,
            verificationCode: cleanCode,
            valid: false,
            reason: "EXPIRED",
            message: "DENY EXIT: Exit QR code has expired (exceeded 4-hour window)",
          });

          return {
            valid: false,
            reason: "EXPIRED",
            message: "DENY EXIT: Exit QR code has expired (exceeded 4-hour validity window)",
          };
        }

        const rawSigPayload = `${qrObj.orderNumber}:${qrObj.storeId}:${qrObj.code}:${qrObj.expiresAt}`;
        const isSigValid = verifyHMACSignature(rawSigPayload, qrObj.sig);
        if (!isSigValid) {
          await this.logAudit({
            userId: params.verifiedByUserId,
            storeId: params.storeId,
            purchaseId: purchase.id,
            orderNumber: purchase.orderNumber,
            verificationCode: cleanCode,
            valid: false,
            reason: "TAMPERED_QR",
            message: "SECURITY WARNING: QR Code cryptographic signature verification failed!",
          });

          return {
            valid: false,
            reason: "TAMPERED_QR",
            message: "SECURITY WARNING: Exit QR code cryptographic signature verification failed!",
          };
        }
      } catch (e) {
        console.error("Exit QR parsing error:", e);
      }
    }

    // 6. Atomically transition status PENDING -> VERIFIED
    const updatedRecord = await prisma.$transaction(async (tx) => {
      const verified = await tx.exitVerification.update({
        where: { id: exitRecord.id },
        data: {
          status: "VERIFIED",
          verifiedByUserId: params.verifiedByUserId,
          verifiedAt: new Date(),
        },
      });

      await tx.purchase.update({
        where: { id: exitRecord.purchaseId },
        data: { orderStatus: "VERIFIED_EXIT" },
      });

      return verified;
    });

    // 7. Audit Log Entry for Successful Exit Verification
    await this.logAudit({
      userId: params.verifiedByUserId,
      storeId: params.storeId,
      purchaseId: purchase.id,
      orderNumber: purchase.orderNumber,
      verificationCode: cleanCode,
      valid: true,
      reason: "VERIFIED",
      message: "ORDER VERIFIED • CUSTOMER MAY EXIT",
    });

    return {
      valid: true,
      reason: "VERIFIED",
      orderStatusText: "ORDER VERIFIED",
      paymentConfirmedText: "PAYMENT CONFIRMED",
      customerExitText: "CUSTOMER MAY EXIT",
      message: "Customer exit verified successfully! Wish customer a good day.",
      customerName: purchase.user.name,
      orderNumber: purchase.orderNumber,
      itemCount: purchase.items.length,
      grandTotal: purchase.grandTotal,
      verifiedAt: updatedRecord.verifiedAt!,
    };
  }

  /**
   * Helper: Log audit entry for exit verification attempt
   */
  private static async logAudit(params: {
    userId: string;
    storeId: string;
    purchaseId?: string;
    orderNumber?: string;
    verificationCode: string;
    valid: boolean;
    reason: string;
    message: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: "EXIT_VERIFICATION",
          entityType: "EXIT_VERIFICATION",
          entityId: params.purchaseId || params.verificationCode,
          payload: JSON.stringify({
            storeId: params.storeId,
            orderNumber: params.orderNumber,
            verificationCode: params.verificationCode,
            valid: params.valid,
            reason: params.reason,
            message: params.message,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (e) {
      console.error("Failed to log exit verification audit entry:", e);
    }
  }
}
