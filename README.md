# CartZen — "Scan, Pay, Go."

[![CartZen CI Pipeline](https://github.com/retailx/cartzen/actions/workflows/ci.yml/badge.svg)](https://github.com/retailx/cartzen/actions/workflows/ci.yml)
[![Strict TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Next.js App Router](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)

**CartZen** is a production-ready, security-hardened, mobile-first **scan-and-go supermarket web application**. Customers open the web application on their smartphone browser while entering a physical supermarket, select their store, scan product barcodes using their device camera or Web Barcode Simulator, view live authoritative prices, receive privacy-conscious AI Smart Picks recommendations, pay via UPI or Card, and generate a cryptographically signed Exit QR Code for store gatekeeper verification upon exiting.

---

## 🚀 Key Technical Features

1. **Single Responsive Web Architecture**: Built exclusively with Next.js App Router, TypeScript, HTML5, and Browser Web APIs (`navigator.mediaDevices.getUserMedia`). Operates seamlessly on mobile (Android Chrome, iOS Safari) and desktop browsers with zero native app dependencies.
2. **Web Camera & Barcode Simulator**: Features live camera scanning via `html5-qrcode` alongside an embedded **Web Barcode Simulator** widget stocked with real supermarket seed barcodes (`8901030000012` Organic Milk, `8901234567890` Wheat Bread, `8901050000115` Almond Milk, etc.).
3. **Server-Authoritative Cart & Pricing**: Cart totals, tax rates (5% GST), list vs. sale price matching, stock availability, and age-restriction checks are computed strictly by server services (`CartService`, `ScannerService`). Client price or total tampering is impossible.
4. **Cryptographic Payment & Exit Verification**: Implements server-side HMAC SHA-256 signature generation and timing-safe verification for payments (`PaymentService`). Generates digital E-Bill Receipts and cryptographically signed 4-hour Exit QR Codes (`ReceiptService`) verified by store gatekeeper staff (`ExitService`).
5. **Privacy-Conscious AI Smart Picks**: Market basket association rules ("Frequently Bought Together") and dietary filter matching (Organic, Vegan, Gluten-Free) with strict compliance to customer consent choices (`Consent` model, `PrivacyService`). Includes a GDPR/CCPA-grade "Purge & Anonymize My Data" feature.
6. **Server-Side RBAC**: Strict server guards (`assertCustomerAccess`, `assertStoreAdminAccess`, IDOR protection) enforcing `CUSTOMER`, `STORE_ADMIN`, and `SUPER_ADMIN` roles.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14 App Router, React 18, TypeScript (Strict Mode)
- **Styling & Components**: Tailwind CSS, shadcn/ui primitives, Lucide Icons, `tailwindcss-animate`
- **Database & ORM**: PostgreSQL / SQLite (Local Dev Fallback), Prisma ORM
- **Authentication**: Auth.js (NextAuth v5) with Credentials provider (Argon2id/Bcrypt password hashing) & JWT sessions
- **Validation**: Zod (all input parameters, API requests, and environment variables validated)
- **Barcode & QR Engine**: `html5-qrcode`, `qrcode.react`
- **Testing**: Vitest (Unit & Service tests), Playwright (Mobile & Desktop E2E tests)
- **DevOps**: Docker, Docker Compose, GitHub Actions CI

---

## 📦 Quick Start & Commands

### 1. Installation
```bash
cmd /c npm install
```

### 2. Environment Setup
Create `.env` file (copied from `.env.example`):
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="cartzen_super_secret_jwt_key_32_bytes_min_length_for_security"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
CARTZEN_HMAC_SECRET="cartzen_hmac_secret_key_8943758934758934759834758934"
```

### 3. Database Generation & Seed
```bash
cmd /c npx prisma db push
cmd /c npm run db:seed
```

### 4. Start Development Server
```bash
cmd /c npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your mobile browser or desktop.

---

## 🔑 Demo Account Credentials

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@cartzen.com` | `Password123!` | Store Selection, Barcode Scanner, Cart, Smart Picks, Checkout, Exit QR, Profile & Privacy |
| **Store Admin** | `admin@cartzen.com` | `Password123!` | Executive Dashboard, Exit QR Gatekeeper Scanner, Product Catalog, Inventory, Orders |

---

## 🧪 Testing & Verification Commands

- **TypeScript Type Check**: `cmd /c npm run typecheck` (`tsc --noEmit`)
- **ESLint Linting**: `cmd /c npm run lint`
- **Vitest Unit Tests**: `cmd /c npm run test:unit`
- **Production Build Check**: `cmd /c npm run build`
