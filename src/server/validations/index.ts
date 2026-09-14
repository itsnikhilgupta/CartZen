import { z } from "zod";

export const ScanBarcodeSchema = z.object({
  shoppingSessionId: z.string().uuid("Invalid shopping session ID"),
  barcode: z.string().min(3, "Barcode must be at least 3 characters").max(30, "Barcode too long"),
});

export const AddToCartSchema = z.object({
  shoppingSessionId: z.string().uuid("Invalid shopping session ID"),
  barcode: z.string().min(3).max(30),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(50, "Max 50 items per scan"),
});

export const UpdateCartItemSchema = z.object({
  cartItemId: z.string().uuid("Invalid cart item ID"),
  quantity: z.number().int().min(0, "Quantity cannot be negative").max(99),
});

export const RemoveCartItemSchema = z.object({
  cartItemId: z.string().uuid("Invalid cart item ID"),
});

export const InitiateCheckoutSchema = z.object({
  shoppingSessionId: z.string().uuid("Invalid shopping session ID"),
});

export const PaymentProcessSchema = z.object({
  purchaseId: z.string().uuid("Invalid purchase ID"),
  paymentMethod: z.enum(["UPI", "CARD"]),
  provider: z.string().default("CARTZEN_PAY"),
  clientTransactionRef: z.string().min(6),
  signature: z.string().optional(),
  amountPaid: z.number().optional(),
});

export const ExitVerifySchema = z.object({
  verificationCode: z.string().min(6, "Invalid verification code format"),
  storeId: z.string().uuid("Invalid store ID"),
});

export const ConsentUpdateSchema = z.object({
  personalizationOptIn: z.boolean(),
  behaviouralTrackingOptIn: z.boolean(),
  marketingOptIn: z.boolean(),
});

export const RegisterUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
});

export const RequestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const ConfirmPasswordResetSchema = z.object({
  token: z.string().min(10, "Invalid reset token"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const RequestEmailVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const ConfirmEmailVerificationSchema = z.object({
  token: z.string().min(10, "Invalid verification token"),
});

export const StoreSearchSchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
});

export const StoreCreateUpdateSchema = z.object({
  name: z.string().min(3, "Store name is required"),
  code: z.string().min(3, "Store code is required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().default("Maharashtra"),
  country: z.string().default("India"),
  timezone: z.string().default("Asia/Kolkata"),
  currency: z.string().default("INR"),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).default("ACTIVE"),
});

// --- Phase 3 Product & Nutrition Schemas ---

export const ProductQuerySchema = z.object({
  query: z.string().optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).optional(),
  classification: z.enum(["HIGH_PROTEIN", "LOW_SUGAR", "HIGH_FIBRE", "LOW_CALORIE"]).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  sortBy: z.enum(["price_asc", "price_desc", "name_asc", "newest"]).default("newest"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
  storeId: z.string().uuid("Invalid store ID").optional(),
});

export const ProductBarcodeSchema = z.object({
  barcode: z.string().min(3, "Barcode must be at least 3 characters").max(30),
  isPrimary: z.boolean().default(false),
});

export const ProductNutritionSchema = z.object({
  calories: z.number().nullable().optional(),
  protein: z.number().nullable().optional(),
  carbohydrates: z.number().nullable().optional(),
  totalSugar: z.number().nullable().optional(),
  addedSugar: z.number().nullable().optional(),
  fat: z.number().nullable().optional(),
  saturatedFat: z.number().nullable().optional(),
  fibre: z.number().nullable().optional(),
  sodium: z.number().nullable().optional(),
  servingSize: z.number().nullable().optional(),
  servingUnit: z.string().nullable().optional(),
  allergens: z.string().optional(),
  organic: z.boolean().optional(),
  vegan: z.boolean().optional(),
  glutenFree: z.boolean().optional(),
});

export const AdminProductCreateSchema = z.object({
  sku: z.string().min(3, "SKU is required"),
  name: z.string().min(2, "Product name is required"),
  brand: z.string().min(1, "Brand is required"),
  description: z.string().default(""),
  categoryId: z.string().uuid("Category ID required"),
  unit: z.string().default("pack"),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).default("ACTIVE"),
  barcode: z.string().min(3, "Primary barcode is required"),
  listPrice: z.number().positive("List price must be positive"),
  salePrice: z.number().positive("Sale price must be positive"),
  storeId: z.string().uuid("Store ID required"),
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
  isAgeRestricted: z.boolean().default(false),
  imageUrl: z.string().optional(),
  nutrition: ProductNutritionSchema.optional(),
});

export const AdminProductUpdateSchema = AdminProductCreateSchema.partial().extend({
  id: z.string().uuid(),
});
