# CartZen System Architecture

## 🏛️ Modular System Design

CartZen separates UI presentation, business rules, security, and data access into clean modular layers:

```
                  ┌──────────────────────────────────────────────┐
                  │          Client Web Layer (Browsers)          │
                  │   Mobile Chrome / Safari iOS / Desktop Web   │
                  └──────────────────────┬───────────────────────┘
                                         │ HTTP REST / Server Actions
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │         Next.js App Router (src/app)         │
                  │    Route Handlers & Security Middleware      │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │       Server Business Services (src/server)  │
                  │  CartService  │ ScannerService │ PaymentService│
                  │  ReceiptService │ ExitService │ PrivacyService │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │        Prisma Data Layer & PostgreSQL        │
                  │      Entities, FKs, Indexes, UUIDs           │
                  └──────────────────────────────────────────────┘
```

## 🔄 End-to-End Supermarket Customer Journey

1. **Store Arrival**: Customer opens CartZen in mobile web browser -> Selects Store #101 -> `POST /api/session/start`.
2. **Barcode Scan**: Point smartphone camera or click Web Barcode Simulator -> `POST /api/scan` -> `ScannerService.scanBarcode` -> Product details & nutrition displayed.
3. **Cart Addition**: Add product -> `POST /api/cart` -> `CartService.addItemToCart` -> Server matches store list price, verifies stock, updates cart totals.
4. **Smart Picks**: Browse `/smart-picks` -> `GET /api/recommendations` -> AI recommendation engine evaluates basket association rules & dietary filters while respecting privacy consent.
5. **Checkout & Payment**: Review cart -> `POST /api/checkout/initiate` -> `POST /api/checkout/pay` -> `PaymentService.processPayment` verifies HMAC SHA-256 signature, deducts stock, sets status to `PAID`.
6. **E-Bill & Exit QR**: `ReceiptService` generates digital E-Bill and 4-hour cryptographic Exit QR Code.
7. **Gatekeeper Exit**: Customer presents Exit QR at gate -> Store staff scans or enters code on `/admin/exit-verify` -> `ExitService.verifyExitCode` verifies validity, marks exit complete.
