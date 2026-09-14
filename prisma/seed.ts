import { PrismaClient } from "@prisma/client";
import { Role, StoreStatus } from "../src/types/enums";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding CartZen Supermarket Database...");

  // Clean existing tables
  await prisma.verificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.customerPreference.deleteMany();
  await prisma.recommendationEvent.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.exitVerification.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.scanEvent.deleteMany();
  await prisma.behaviourEvent.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.shoppingSession.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productPrice.deleteMany();
  await prisma.productNutrition.deleteMany();
  await prisma.productBarcode.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.storeMembership.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  // Create Password Hashes
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create Users
  const superAdmin = await prisma.user.create({
    data: {
      email: "admin@cartzen.com",
      emailVerified: new Date(),
      passwordHash,
      name: "CartZen Super Admin",
      phone: "+18005550199",
      role: Role.SUPER_ADMIN,
    },
  });

  const storeAdmin101 = await prisma.user.create({
    data: {
      email: "manager101@cartzen.com",
      emailVerified: new Date(),
      passwordHash,
      name: "Store Manager Sarah (101)",
      phone: "+18005550188",
      role: Role.STORE_ADMIN,
    },
  });

  const storeAdmin103 = await prisma.user.create({
    data: {
      email: "manager103@cartzen.com",
      emailVerified: new Date(),
      passwordHash,
      name: "Store Manager Dave (103)",
      phone: "+18005550189",
      role: Role.STORE_ADMIN,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: "customer@cartzen.com",
      emailVerified: new Date(),
      passwordHash,
      name: "Alex Customer",
      phone: "+18005550177",
      role: Role.CUSTOMER,
      consent: {
        create: {
          personalizationOptIn: true,
          behaviouralTrackingOptIn: true,
          marketingOptIn: false,
        },
      },
      preference: {
        create: {
          preferredCategories: JSON.stringify(["Dairy & Eggs", "Bakery"]),
          dietaryFlags: JSON.stringify(["Organic"]),
          maxBudgetAlert: 2000,
        },
      },
    },
  });

  console.log(`✅ Created Users: SuperAdmin (${superAdmin.email}), StoreAdmins (101, 103), Customer (${customerUser.email})`);

  // 2. Create Stores
  const store101 = await prisma.store.create({
    data: {
      name: "CartZen Central Supermarket #101",
      code: "STORE-101",
      address: "100 Hill Road, Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      timezone: "Asia/Kolkata",
      currency: "INR",
      status: StoreStatus.ACTIVE,
      isMarketActive: true,
      memberships: {
        create: [
          { userId: storeAdmin101.id, role: Role.STORE_ADMIN },
          { userId: superAdmin.id, role: Role.SUPER_ADMIN },
        ],
      },
    },
  });

  const store102Inactive = await prisma.store.create({
    data: {
      name: "CartZen Metro Store #102 (Inactive)",
      code: "STORE-102",
      address: "500 Koramangala 5th Block",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      timezone: "Asia/Kolkata",
      currency: "INR",
      status: StoreStatus.INACTIVE,
      isMarketActive: false,
    },
  });

  const store103 = await prisma.store.create({
    data: {
      name: "CartZen Connaught Market #103",
      code: "STORE-103",
      address: "88 Connaught Place",
      city: "New Delhi",
      state: "Delhi",
      country: "India",
      timezone: "Asia/Kolkata",
      currency: "INR",
      status: StoreStatus.ACTIVE,
      isMarketActive: true,
      memberships: {
        create: [
          { userId: storeAdmin103.id, role: Role.STORE_ADMIN },
          { userId: superAdmin.id, role: Role.SUPER_ADMIN },
        ],
      },
    },
  });

  console.log(`✅ Created Stores: ${store101.code} (Active), ${store102Inactive.code} (Inactive), ${store103.code} (Active)`);

  // 3. Create Product Categories
  const catDairy = await prisma.productCategory.create({
    data: { name: "Dairy & Eggs", slug: "dairy-eggs", description: "Fresh milk, cheese, yogurt, and farm eggs" },
  });
  const catBakery = await prisma.productCategory.create({
    data: { name: "Bakery", slug: "bakery", description: "Freshly baked bread, rolls, and pastries" },
  });
  const catSnacks = await prisma.productCategory.create({
    data: { name: "Snacks & Beverages", slug: "snacks-beverages", description: "Chips, chocolates, sodas, and juices" },
  });
  const catProduce = await prisma.productCategory.create({
    data: { name: "Fresh Produce", slug: "fresh-produce", description: "Organic fruits, vegetables, and greens" },
  });
  const catPantry = await prisma.productCategory.create({
    data: { name: "Pantry & Groceries", slug: "pantry", description: "Oils, spices, grains, and coffee" },
  });

  // 4. Products Data List
  const productsData = [
    {
      sku: "SKU-MILK-001",
      name: "Organic Whole Milk 1L",
      brand: "CartZen Dairy",
      description: "Pasteurized organic farm fresh whole milk.",
      categoryId: catDairy.id,
      unit: "L",
      status: "ACTIVE",
      isAgeRestricted: false,
      barcodes: [
        { barcode: "8901030000012", isPrimary: true },
        { barcode: "8901030000013", isPrimary: false },
      ],
      listPrice: 75.0,
      salePrice: 69.0,
      aisle: "Aisle 1",
      shelf: "Shelf B2",
      qty: 150,
      nutrition: {
        calories: 150,
        protein: 8,
        carbohydrates: 12,
        totalSugar: 12,
        addedSugar: 0,
        fat: 8,
        saturatedFat: 5,
        fibre: 0,
        sodium: 120,
        servingSize: 240,
        servingUnit: "ml",
        organic: true,
        vegan: false,
        glutenFree: true,
        allergens: "Milk",
      },
    },
    {
      sku: "SKU-BREAD-001",
      name: "Artisan Whole Wheat Bread 400g",
      brand: "Bakers Choice",
      description: "100% stone-ground whole wheat loaf.",
      categoryId: catBakery.id,
      unit: "g",
      status: "ACTIVE",
      isAgeRestricted: false,
      barcodes: [
        { barcode: "8901234567890", isPrimary: true },
      ],
      listPrice: 50.0,
      salePrice: 45.0,
      aisle: "Aisle 2",
      shelf: "Shelf A1",
      qty: 80,
      nutrition: {
        calories: 220,
        protein: 9,
        carbohydrates: 40,
        totalSugar: 4,
        addedSugar: 2,
        fat: 2.5,
        saturatedFat: 0.5,
        fibre: 7,
        sodium: 380,
        servingSize: 50,
        servingUnit: "g",
        organic: false,
        vegan: true,
        glutenFree: false,
        allergens: "Wheat, Gluten",
      },
    },
    {
      sku: "SKU-ALMOND-001",
      name: "Silk Unsweetened Almond Milk 1L",
      brand: "Silk",
      description: "Plant-based lactose-free almond beverage.",
      categoryId: catDairy.id,
      unit: "L",
      status: "ACTIVE",
      isAgeRestricted: false,
      barcodes: [
        { barcode: "8901050000115", isPrimary: true },
      ],
      listPrice: 260.0,
      salePrice: 240.0,
      aisle: "Aisle 1",
      shelf: "Shelf B3",
      qty: 90,
      nutrition: {
        calories: 40,
        protein: 1.5,
        carbohydrates: 1,
        totalSugar: 0,
        addedSugar: 0,
        fat: 3,
        saturatedFat: 0.2,
        fibre: 1,
        sodium: 170,
        servingSize: 240,
        servingUnit: "ml",
        organic: true,
        vegan: true,
        glutenFree: true,
        allergens: "Almond/Tree Nuts",
      },
    },
    {
      sku: "SKU-EGGS-001",
      name: "Fresh Farm Eggs 12 Pack",
      brand: "Country Pastures",
      description: "Grade A Large cage-free eggs.",
      categoryId: catDairy.id,
      unit: "pack",
      status: "ACTIVE",
      isAgeRestricted: false,
      barcodes: [
        { barcode: "8901020000331", isPrimary: true },
      ],
      listPrice: 95.0,
      salePrice: 90.0,
      aisle: "Aisle 1",
      shelf: "Shelf C1",
      qty: 120,
      nutrition: {
        calories: 140,
        protein: 12,
        carbohydrates: 1,
        totalSugar: 0,
        addedSugar: 0,
        fat: 10,
        saturatedFat: 3,
        fibre: 0,
        sodium: 140,
        servingSize: 100,
        servingUnit: "g",
        organic: true,
        vegan: false,
        glutenFree: true,
        allergens: "Egg",
      },
    },
    {
      sku: "SKU-OIL-001",
      name: "Extra Virgin Olive Oil 500ml",
      brand: "Monini",
      description: "Cold-pressed extra virgin olive oil.",
      categoryId: catPantry.id,
      unit: "ml",
      status: "ACTIVE",
      isAgeRestricted: false,
      barcodes: [
        { barcode: "8901060000442", isPrimary: true },
      ],
      listPrice: 690.0,
      salePrice: 650.0,
      aisle: "Aisle 4",
      shelf: "Shelf D3",
      qty: 60,
      nutrition: {
        calories: 884,
        protein: 0,
        carbohydrates: 0,
        totalSugar: 0,
        addedSugar: 0,
        fat: 100,
        saturatedFat: 14,
        fibre: 0,
        sodium: 0,
        servingSize: 15,
        servingUnit: "ml",
        organic: true,
        vegan: true,
        glutenFree: true,
        allergens: "None",
      },
    },
    {
      sku: "SKU-CHOC-001",
      name: "Dark Chocolate Bar 70% 100g",
      brand: "Lindt",
      description: "Rich Swiss dark chocolate bar.",
      categoryId: catSnacks.id,
      unit: "g",
      status: "ACTIVE",
      isAgeRestricted: false,
      barcodes: [
        { barcode: "8901080000553", isPrimary: true },
      ],
      listPrice: 160.0,
      salePrice: 150.0,
      aisle: "Aisle 3",
      shelf: "Shelf A4",
      qty: 200,
      nutrition: {
        calories: 550,
        protein: 7.8,
        carbohydrates: 45,
        totalSugar: 28,
        addedSugar: 24,
        fat: 37,
        saturatedFat: 22,
        fibre: 11,
        sodium: 20,
        servingSize: 30,
        servingUnit: "g",
        organic: false,
        vegan: true,
        glutenFree: true,
        allergens: "Soy, Milk traces",
      },
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        sku: item.sku,
        name: item.name,
        brand: item.brand,
        description: item.description,
        categoryId: item.categoryId,
        unit: item.unit,
        status: item.status,
        isAgeRestricted: item.isAgeRestricted,
        imageUrl: `/images/products/${item.sku.toLowerCase()}.jpg`,
        barcodes: {
          create: item.barcodes,
        },
        prices: {
          create: [
            { storeId: store101.id, currency: "USD", listPrice: item.listPrice, salePrice: item.salePrice },
            { storeId: store103.id, currency: "USD", listPrice: item.listPrice, salePrice: item.salePrice },
          ],
        },
        inventories: {
          create: [
            { storeId: store101.id, quantity: item.qty, reservedQty: 0, aisle: item.aisle, shelf: item.shelf },
            { storeId: store103.id, quantity: item.qty, reservedQty: 0, aisle: item.aisle, shelf: item.shelf },
          ],
        },
        nutrition: {
          create: item.nutrition,
        },
      },
    });
    console.log(`   📦 Seeded product: ${product.name} (${item.barcodes.length} barcodes)`);
  }

  console.log("\n✅ Database Seed Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error Seeding Database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
