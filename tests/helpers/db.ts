import { prisma } from "@/server/db/prisma";

export async function cleanDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.exitVerification.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.scanEvent.deleteMany();
  await prisma.recommendationEvent.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.behaviourEvent.deleteMany();
  await prisma.customerPreference.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.shoppingSession.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productPrice.deleteMany();
  await prisma.productBarcode.deleteMany();
  await prisma.productNutrition.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.storeMembership.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
}
