import crypto from "crypto";

const HMAC_SECRET = process.env.CARTZEN_HMAC_SECRET || "default_super_secret_cartzen_key_2026";

/**
 * Generate HMAC SHA-256 signature for server-authoritative payment payload or exit QR verification payload
 */
export function generateHMACSignature(payload: string, secret?: string): string {
  const keyToUse = secret || HMAC_SECRET;
  return crypto.createHmac("sha256", keyToUse).update(payload).digest("hex");
}

/**
 * Verify HMAC SHA-256 signature with timing-safe comparison to prevent side-channel attacks
 */
export function verifyHMACSignature(payload: string, expectedSignature: string, secret?: string): boolean {
  const actualSignature = generateHMACSignature(payload, secret);
  const bufferA = Buffer.from(actualSignature, "hex");
  const bufferB = Buffer.from(expectedSignature, "hex");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Generate cryptographically secure reference numbers (Order number, receipt code, exit code)
 */
export function generateSecureToken(prefix: string = "CZ"): string {
  const randomHex = crypto.randomBytes(6).toString("hex").toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}-${randomHex}`;
}
