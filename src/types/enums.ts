export const Role = {
  CUSTOMER: "CUSTOMER",
  STORE_ADMIN: "STORE_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const StoreStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MAINTENANCE: "MAINTENANCE",
} as const;

export type StoreStatus = (typeof StoreStatus)[keyof typeof StoreStatus];

export const ProductStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  DISCONTINUED: "DISCONTINUED",
} as const;

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const NutritionTag = {
  HIGH_PROTEIN: "HIGH_PROTEIN",
  LOW_SUGAR: "LOW_SUGAR",
  HIGH_FIBRE: "HIGH_FIBRE",
  LOW_CALORIE: "LOW_CALORIE",
} as const;

export type NutritionTag = (typeof NutritionTag)[keyof typeof NutritionTag];

export const SessionStatus = {
  ACTIVE: "ACTIVE",
  CHECKOUT_PENDING: "CHECKOUT_PENDING",
  COMPLETED: "COMPLETED",
  ABANDONED: "ABANDONED",
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const PaymentStatus = {
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const OrderStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  VERIFIED_EXIT: "VERIFIED_EXIT",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ExitStatus = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  EXPIRED: "EXPIRED",
  FLAGGED: "FLAGGED",
} as const;

export type ExitStatus = (typeof ExitStatus)[keyof typeof ExitStatus];
