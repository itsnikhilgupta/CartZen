# CartZen Security & Compliance Policy (`SECURITY.md`)

CartZen is a production-ready **Scan, Pay, Go** web application engineered with a strict **Security by Design** architecture. This document outlines the defensive security controls, authorization boundaries, cryptographic mechanisms, privacy safeguards, and vulnerability management procedures enforced throughout the platform.

---

## 🌐 1. Web Platform & Browser Architecture

CartZen is strictly built and configured as a **Responsive Web Application** accessible via modern web browsers (Chrome Android, Safari iOS, Edge, Firefox, Desktop).

- **Framework**: Next.js 14 (App Router) + TypeScript + React.
- **Database Layer**: Prisma ORM with parameterized database queries.
- **Camera Barcode Scanning**: Uses browser-native HTML5 `MediaDevices/getUserMedia()` APIs and client-side barcode scanning libraries.
- **Zero Native Dependencies**: CartZen contains zero native mobile binaries (no APKs, Kotlin, React Native, or native iOS projects).

---

## 🔒 2. Authentication & Session Security

- **Authentication Framework**: Powered by Auth.js (NextAuth) with credentials provider and server-side session management.
- **Password Protection**: Passwords are hashed using bcrypt with salt rounds before database persistence. Raw passwords are never stored or logged.
- **Session Tokens**: JWT / Session tokens are transmitted exclusively over secure HTTP-only cookies with `SameSite=Lax` and `Secure` flags.
- **Session Revocation**: Logout actions destroy server-side session tokens, rendering any subsequent requests unauthenticated.

---

## 🛡️ 3. Server-Side Authorization & RBAC

All security boundaries are enforced server-side. Frontend UI visibility controls are purely advisory.

### Server Authorization Helpers (`src/server/security/rbac.ts`)
- `requireAuth()`: Verifies valid active session.
- `requireCustomer()`: Restricts access to `CUSTOMER` or `SUPER_ADMIN` roles.
- `requireStoreAdmin()`: Restricts access to `STORE_ADMIN` or `SUPER_ADMIN` roles.
- `requireSuperAdmin()`: Restricts access exclusively to `SUPER_ADMIN`.
- `requireStoreAccess(storeId)`: Validates that a `STORE_ADMIN` holds an explicit `StoreMembership` for the specified `storeId`, completely preventing cross-store data leakage.
- `assertCustomerAccess()`: Enforces ownership checks to eliminate Insecure Direct Object Reference (IDOR) vulnerabilities across customer carts, orders, receipts, and profiles.

---

## 🛒 4. Cart Integrity & Server-Authoritative Pricing

The client is **never trusted** for financial calculations.

1. **Price Validation**: Product prices, sale discounts, GST taxes, subtotal, and grand total amounts are calculated **100% server-side** by fetching authoritative price records from the database.
2. **Quantity Constraints**: Cart item quantities are constrained to positive integers ($1 \le \text{qty} \le 50$). Negative, fractional, or zero quantities are rejected with Zod schema validation.
3. **Cross-Store Prevention**: Cart items must match the user's active shopping session store location.

---

## 💳 5. Payment Security & Idempotent Webhooks

- **Payment Abstraction**: Handled via `PaymentService` supporting `MockPaymentProvider`, `RazorpayPaymentProvider`, and `StripePaymentProvider`.
- **HMAC Signatures**: Payment signatures are signed with HMAC SHA-256 and verified using `crypto.timingSafeEqual` to prevent side-channel timing attacks.
- **Webhook Idempotency**: Webhook events check `WebhookEvent` history prior to processing. Duplicate webhook deliveries are acknowledged without re-executing purchases.
- **Zero PCI Logging**: Card numbers, CVVs, and raw payment credentials are **never logged** or stored.

---

## 🚪 6. Supermarket Exit Verification Security

After successful checkout, customers receive a thermal E-Bill and an Exit Pass QR Code.

- **Cryptographic Verification**: QR payloads contain HMAC SHA-256 signatures derived from order ID and store ID.
- **Single-Use Enforcement**: Verification status transitions from `PENDING` to `VERIFIED` on first gatekeeper scan. Subsequent scans are rejected as `ALREADY_USED`.
- **Cross-Store Gatekeeping**: Gatekeepers at Store A cannot verify exit passes generated at Store B (`STORE_MISMATCH`).
- **4-Hour Window**: Exit passes expire 4 hours after purchase completion (`EXPIRED`).
- **Staff Privacy Guard**: Exit gatekeeper UI displays only verification status, order number, customer name, total items, and grand total. No payment credentials or personal identifiers are exposed.

---

## 🌿 7. Privacy & Data Minimization

- **Explicit Opt-In Controls**: Personalization and behavioral tracking require explicit customer consent (`prisma.consent`).
- **Personalization Opt-Out**: Customers can turn off personalization at any time, immediately causing the system to fall back to non-personalized store bestsellers.
- **Data Anonymization API**: Endpoint `POST /api/privacy/anonymize` soft-deletes or strips PII from historical logs upon customer request.
- **Non-Sensitive Classification**: Nutrition recommendations are based strictly on macro values (High Protein, Low Sugar, High Fibre, Low Calorie) and **never infer medical diagnoses, health conditions, or sensitive personal attributes**.

---

## ⏱️ 8. Rate Limiting & Abuse Controls

- **Token Bucket Rate Limiter** (`src/server/security/rate-limiter.ts`): Protects sensitive endpoints (`/api/auth/*`, `/api/scan`, `/api/checkout/*`, `/api/exit/verify`) against brute-force and resource exhaustion attacks.

---

## 🔑 9. Environment & Secrets Management

- **Environment Schema** (`src/server/config/env.ts`): Validates environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, `CARTZEN_HMAC_SECRET`) using Zod.
- **Zero Secrets Logging**: Secrets are never written to server logs, stdout, or client bundles.

---

## 🌐 10. Security HTTP Headers (`next.config.mjs`)

CartZen enforces strict security headers on every response:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(), geolocation=()`

---

## 📧 11. Security Vulnerability Reporting

If you discover a security vulnerability in CartZen, please submit a detailed report to the security maintainers at `security@cartzen.com`. All reports are investigated promptly.
