import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { AddToCartSchema, UpdateCartItemSchema, RemoveCartItemSchema } from "@/server/validations";
import { CartService } from "@/server/services/cart.service";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const activeSession = await prisma.shoppingSession.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      include: {
        store: true,
        cart: {
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
        },
      },
    });

    if (!activeSession) {
      return NextResponse.json({ cart: null, session: null });
    }

    let cart = activeSession.cart;
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          shoppingSessionId: activeSession.id,
          userId: session.user.id,
          storeId: activeSession.storeId,
          totalAmount: 0,
          totalTax: 0,
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
    }

    return NextResponse.json({ cart, session: activeSession });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch cart";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const body = await req.json();
    const { shoppingSessionId, barcode, quantity } = AddToCartSchema.parse(body);

    const updatedCart = await CartService.addItemToCart({
      shoppingSessionId,
      userId: session.user.id,
      barcode,
      quantity,
    });

    return NextResponse.json({ success: true, cart: updatedCart });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to add product to cart";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const body = await req.json();
    const { cartItemId, quantity } = UpdateCartItemSchema.parse(body);

    const updatedCart = await CartService.updateItemQuantity(cartItemId, session.user.id, quantity);

    return NextResponse.json({ success: true, cart: updatedCart });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to update item quantity";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  return PATCH(req);
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cartItemId = searchParams.get("cartItemId");
    if (!cartItemId) {
      return NextResponse.json({ error: "cartItemId search param is required" }, { status: 400 });
    }

    const { cartItemId: validatedId } = RemoveCartItemSchema.parse({ cartItemId });
    const updatedCart = await CartService.updateItemQuantity(validatedId, session.user.id, 0);

    return NextResponse.json({ success: true, cart: updatedCart });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to remove item from cart";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
