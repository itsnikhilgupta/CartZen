import { describe, it, expect } from "vitest";
import { generateHMACSignature, verifyHMACSignature, generateSecureToken } from "@/server/security/crypto";
import { checkRateLimit } from "@/server/security/rate-limiter";
import {
  AddToCartSchema,
  ScanBarcodeSchema,
  PaymentProcessSchema,
  ExitVerifySchema,
  RegisterUserSchema,
} from "@/server/validations";
import { validateEnv } from "@/server/config/env";

describe("Phase 10: Defensive Security Hardening & Controls", () => {
  describe("Cryptographic Integrity & Timing-Safe Comparisons", () => {
    it("1. Should generate valid HMAC SHA-256 signatures and verify timing-safely", () => {
      const payload = JSON.stringify({ orderId: "ORD-123", amount: 250, storeId: "store-456" });
      const signature = generateHMACSignature(payload, "secret_key_123");

      const isValid = verifyHMACSignature(payload, signature, "secret_key_123");
      expect(isValid).toBe(true);
    });

    it("2. Should reject tampered payload in HMAC verification", () => {
      const payload = JSON.stringify({ orderId: "ORD-123", amount: 250 });
      const signature = generateHMACSignature(payload, "secret_key_123");

      const tamperedPayload = JSON.stringify({ orderId: "ORD-123", amount: 25 }); // Amount modified!
      const isValid = verifyHMACSignature(tamperedPayload, signature, "secret_key_123");

      expect(isValid).toBe(false);
    });

    it("3. Should generate secure non-predictable token strings", () => {
      const token1 = generateSecureToken("EXIT");
      const token2 = generateSecureToken("EXIT");

      expect(token1).toContain("EXIT-");
      expect(token1).not.toEqual(token2);
    });
  });

  describe("Token Bucket Rate Limiter Controls", () => {
    it("4. Should allow requests under max bucket limit and block when depleted", () => {
      const testKey = `test-ip-${Date.now()}`;
      const maxTokens = 3;

      const req1 = checkRateLimit(testKey, maxTokens, 60000);
      expect(req1.success).toBe(true);
      expect(req1.remaining).toBe(2);

      const req2 = checkRateLimit(testKey, maxTokens, 60000);
      expect(req2.success).toBe(true);
      expect(req2.remaining).toBe(1);

      const req3 = checkRateLimit(testKey, maxTokens, 60000);
      expect(req3.success).toBe(true);
      expect(req3.remaining).toBe(0);

      // 4th request -> Should fail (bucket depleted)
      const req4 = checkRateLimit(testKey, maxTokens, 60000);
      expect(req4.success).toBe(false);
      expect(req4.remaining).toBe(0);
    });
  });

  describe("Server Input Validation (Zod Schemas)", () => {
    it("5. Should reject negative or zero cart item quantities", () => {
      const invalidZero = AddToCartSchema.safeParse({
        shoppingSessionId: "123e4567-e89b-12d3-a456-426614174000",
        barcode: "8901040001",
        quantity: 0,
      });
      expect(invalidZero.success).toBe(false);

      const invalidNegative = AddToCartSchema.safeParse({
        shoppingSessionId: "123e4567-e89b-12d3-a456-426614174000",
        barcode: "8901040001",
        quantity: -5,
      });
      expect(invalidNegative.success).toBe(false);
    });

    it("6. Should validate valid cart item additions", () => {
      const validCart = AddToCartSchema.safeParse({
        shoppingSessionId: "123e4567-e89b-12d3-a456-426614174000",
        barcode: "8901040001",
        quantity: 3,
      });
      expect(validCart.success).toBe(true);
    });

    it("7. Should reject weak passwords during user registration", () => {
      const weakReg = RegisterUserSchema.safeParse({
        email: "user@cartzen.com",
        password: "123", // Too short!
        name: "Alice",
      });
      expect(weakReg.success).toBe(false);
    });

    it("8. Should reject malformed verification codes", () => {
      const malformed = ExitVerifySchema.safeParse({
        verificationCode: "123", // Too short
        storeId: "invalid-uuid",
      });
      expect(malformed.success).toBe(false);
    });
  });

  describe("Environment Configuration Security", () => {
    it("9. Should validate environment configuration cleanly", () => {
      const envConfig = validateEnv();
      expect(envConfig).toBeDefined();
      expect(envConfig.CARTZEN_HMAC_SECRET.length).toBeGreaterThanOrEqual(16);
    });
  });
});
