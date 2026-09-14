import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { ProductService } from "@/server/services/product.service";
import { AdminProductUpdateSchema, ProductBarcodeSchema } from "@/server/validations";
import { assertStoreAdminAccess } from "@/server/security/rbac";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    assertStoreAdminAccess(session.user);

    const product = await ProductService.getProductById(params.id);
    return NextResponse.json(product);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Product not found";
    return NextResponse.json({ error: errMessage }, { status: 404 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    assertStoreAdminAccess(session.user);

    const body = await req.json();

    // Check if adding a barcode
    if (body.newBarcode) {
      const barcodeValidated = ProductBarcodeSchema.parse(body.newBarcode);
      const addedBarcode = await ProductService.addBarcode(
        params.id,
        barcodeValidated.barcode,
        barcodeValidated.isPrimary
      );
      return NextResponse.json({ success: true, barcode: addedBarcode });
    }

    // Otherwise update product fields
    const validated = AdminProductUpdateSchema.parse({ ...body, id: params.id });

    // Update Product & associated Price/Inventory/Nutrition
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.brand && { brand: validated.brand }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.categoryId && { categoryId: validated.categoryId }),
        ...(validated.unit && { unit: validated.unit }),
        ...(validated.status && { status: validated.status }),
        ...(validated.isAgeRestricted !== undefined && { isAgeRestricted: validated.isAgeRestricted }),
        ...(validated.imageUrl && { imageUrl: validated.imageUrl }),
      },
      include: {
        barcodes: true,
        category: true,
        nutrition: true,
        prices: true,
        inventories: true,
      },
    });

    // Update price if provided
    if (validated.storeId && (validated.listPrice !== undefined || validated.salePrice !== undefined)) {
      const existingPrice = await prisma.productPrice.findFirst({
        where: { productId: params.id, storeId: validated.storeId },
      });

      if (existingPrice) {
        await prisma.productPrice.update({
          where: { id: existingPrice.id },
          data: {
            ...(validated.listPrice !== undefined && { listPrice: validated.listPrice }),
            ...(validated.salePrice !== undefined && { salePrice: validated.salePrice }),
          },
        });
      } else if (validated.listPrice !== undefined && validated.salePrice !== undefined) {
        await prisma.productPrice.create({
          data: {
            productId: params.id,
            storeId: validated.storeId,
            listPrice: validated.listPrice,
            salePrice: validated.salePrice,
          },
        });
      }
    }

    // Update inventory if provided
    if (validated.storeId && validated.quantity !== undefined) {
      const existingInventory = await prisma.inventory.findFirst({
        where: { productId: params.id, storeId: validated.storeId },
      });

      if (existingInventory) {
        await prisma.inventory.update({
          where: { id: existingInventory.id },
          data: { quantity: validated.quantity },
        });
      } else {
        await prisma.inventory.create({
          data: {
            productId: params.id,
            storeId: validated.storeId,
            quantity: validated.quantity,
          },
        });
      }
    }

    // Update nutrition if provided
    if (validated.nutrition) {
      await prisma.productNutrition.upsert({
        where: { productId: params.id },
        create: {
          productId: params.id,
          calories: validated.nutrition.calories,
          protein: validated.nutrition.protein,
          carbohydrates: validated.nutrition.carbohydrates,
          totalSugar: validated.nutrition.totalSugar,
          addedSugar: validated.nutrition.addedSugar,
          fat: validated.nutrition.fat,
          saturatedFat: validated.nutrition.saturatedFat,
          fibre: validated.nutrition.fibre,
          sodium: validated.nutrition.sodium,
          servingSize: validated.nutrition.servingSize || 100,
          servingUnit: validated.nutrition.servingUnit || "g",
          allergens: validated.nutrition.allergens || "",
          organic: validated.nutrition.organic || false,
          vegan: validated.nutrition.vegan || false,
          glutenFree: validated.nutrition.glutenFree || false,
        },
        update: {
          calories: validated.nutrition.calories,
          protein: validated.nutrition.protein,
          carbohydrates: validated.nutrition.carbohydrates,
          totalSugar: validated.nutrition.totalSugar,
          addedSugar: validated.nutrition.addedSugar,
          fat: validated.nutrition.fat,
          saturatedFat: validated.nutrition.saturatedFat,
          fibre: validated.nutrition.fibre,
          sodium: validated.nutrition.sodium,
          servingSize: validated.nutrition.servingSize,
          servingUnit: validated.nutrition.servingUnit,
          allergens: validated.nutrition.allergens,
          organic: validated.nutrition.organic,
          vegan: validated.nutrition.vegan,
          glutenFree: validated.nutrition.glutenFree,
        },
      });
    }

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to update product";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    assertStoreAdminAccess(session.user);

    // Soft delete product
    await prisma.product.update({
      where: { id: params.id },
      data: { isSoftDeleted: true, status: "DISCONTINUED" },
    });

    return NextResponse.json({ success: true, message: "Product deactivated/deleted successfully" });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to delete product";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
