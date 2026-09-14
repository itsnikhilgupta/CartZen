import { describe, it, expect } from "vitest";
import { generateHMACSignature, verifyHMACSignature, generateSecureToken } from "../../src/server/security/crypto";

describe("Payment Cryptography & Signature Verification", () => {
  it("should generate valid HMAC SHA-256 signatures for payment payloads", () => {
    const payload = "PURCHASE-101:500.00:TXN-998822:UPI";
    const sig = generateHMACSignature(payload);

    expect(sig).toBeDefined();
    expect(sig.length).toBe(64); // SHA-256 hex length
  });

  it("should verify valid signature with timing-safe comparison", () => {
    const payload = "PURCHASE-101:500.00:TXN-998822:UPI";
    const sig = generateHMACSignature(payload);

    const isValid = verifyHMACSignature(payload, sig);
    expect(isValid).toBe(true);
  });

  it("should reject tampered payment payloads", () => {
    const payload = "PURCHASE-101:500.00:TXN-998822:UPI";
    const tamperedPayload = "PURCHASE-101:1.00:TXN-998822:UPI"; // Client tried price tampering
    const sig = generateHMACSignature(payload);

    const isValid = verifyHMACSignature(tamperedPayload, sig);
    expect(isValid).toBe(false);
  });

  it("should generate secure format tokens with custom prefix", () => {
    const token = generateSecureToken("EXIT");
    expect(token).toMatch(/^EXIT-[A-Z0-9]+-[A-Z0-9]+$/);
  });
});
