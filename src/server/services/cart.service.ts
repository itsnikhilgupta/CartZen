import { prisma } from "@/server/db/prisma";
import { EventTrackingService } from "./event-tracking.service";

export const TAX_RATE = 0.05; // 5% Supermarket GST / Sales Tax

export class CartService {
  /**
   * Recalculate authoritative total amount, taxes, and item line totals for a cart
   */
  static async recalculateCart(cartId: string) {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: true,
      },
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    let subtotal = 0;
    for (const item of cart.items) {
      subtotal += item.lineTotal;
    }

    const totalTax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const totalAmount = Math.round((subtotal + totalTax) * 100) / 100;

    const updatedCart = await prisma.cart.update({
      where: { id: cartId },
      data: {
        totalAmount,
        totalTax,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                nutrition: true,
              },
            },
          },
        },
      },
    });

    return updatedCart;
  }

  /**
   * Add a product to the active cart using server-authoritative pricing
   */
  static async addItemToCart(params: {
    shoppingSessionId: string;
    userId: string;
    barcode: string;
    quantity: number;
  }) {
    if (params.quantity <= 0) {
      throw new Error("Quantity must be a positive integer greater than 0");
    }

    // 1. Fetch Session & Store
    const session = await prisma.shoppingSession.findUnique({
      where: { id: params.shoppingSessionId },
      include: { cart: true },
    });

    if (!session || session.status !== "ACTIVE") {
      throw new Error("Invalid or inactive shopping session");
    }

    // Validate Session Ownership
    if (session.userId !== params.userId) {
      throw new Error("Unauthorized: Cross-customer cart access denied");
    }

    // 2. Find Product by Barcode
    const productBarcode = await prisma.productBarcode.findUnique({
      where: { barcode: params.barcode },
      include: {
        product: {
          include: {
            prices: {
              where: { storeId: session.storeId },
            },
            inventories: {
              where: { storeId: session.storeId },
            },
          },
        },
      },
    });

    if (!productBarcode || !productBarcode.product || productBarcode.product.isSoftDeleted) {
      throw new Error("Product barcode not found in store catalog");
    }

    const product = productBarcode.product;

    // Check Inventory
    const inventory = product.inventories[0];
    if (!inventory || inventory.quantity < params.quantity) {
      throw new Error(`Insufficient stock available for ${product.name}`);
    }

    // Check Authoritative Price
    const priceRecord = product.prices[0];
    if (!priceRecord) {
      throw new Error("Product price is not configured for this store");
    }

    const unitPrice = priceRecord.salePrice || priceRecord.listPrice;
    const lineTotal = Math.round(unitPrice * params.quantity * 100) / 100;

    // 3. Ensure Cart exists
    let cart = session.cart;
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          shoppingSessionId: session.id,
          userId: params.userId,
          storeId: session.storeId,
          totalAmount: lineTotal,
          totalTax: Math.round(lineTotal * TAX_RATE * 100) / 100,
        },
      });
    }

    // Enforce Cart Ownership
    if (cart.userId !== params.userId) {
      throw new Error("Unauthorized: Cart ownership mismatch");
    }

    // 4. Upsert Cart Item
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: product.id,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + params.quantity;
      const newLineTotal = Math.round(unitPrice * newQuantity * 100) / 100;

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          unitPrice,
          lineTotal: newLineTotal,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: params.quantity,
          unitPrice,
          discountAmount: priceRecord.listPrice > priceRecord.salePrice ? priceRecord.listPrice - priceRecord.salePrice : 0,
          lineTotal,
        },
      });
    }

    // Log Privacy-Conscious ADD_TO_CART Event
    await EventTrackingService.logEvent({
      userId: params.userId,
      eventType: "ADD_TO_CART",
      productId: product.id,
      barcode: params.barcode,
      quantity: params.quantity,
    });

    // 5. Recalculate Cart Totals
    return this.recalculateCart(cart.id);
  }

  /**
   * Update item quantity in cart with ownership check
   */
  static async updateItemQuantity(cartItemId: string, userId: string, quantity: number) {
    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!item) {
      throw new Error("Cart item not found");
    }

    if (item.cart.userId !== userId) {
      throw new Error("Unauthorized: Cross-customer cart access denied");
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({
        where: { id: cartItemId },
      });

      // Log REMOVE_FROM_CART event
      await EventTrackingService.logEvent({
        userId,
        eventType: "REMOVE_FROM_CART",
        productId: item.productId,
      });
    } else {
      const newLineTotal = Math.round(item.unitPrice * quantity * 100) / 100;
      await prisma.cartItem.update({
        where: { id: cartItemId },
        data: {
          quantity,
          lineTotal: newLineTotal,
        },
      });
    }

    return this.recalculateCart(item.cartId);
  }

  /**
   * Fetch active cart for user
   */
  static async getActiveCart(userId: string) {
    const cart = await prisma.cart.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                nutrition: true,
                category: true,
              },
            },
          },
        },
      },
    });

    return cart;
  }
}
