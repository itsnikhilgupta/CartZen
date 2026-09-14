import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { ShoppingSessionService } from "@/server/services/session.service";
import { z } from "zod";

const StartSessionSchema = z.object({
  storeId: z.string().uuid("Invalid store ID"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const body = await req.json();
    const { storeId } = StartSessionSchema.parse(body);

    const shoppingSession = await ShoppingSessionService.startSession(session.user.id, storeId);

    return NextResponse.json({ success: true, session: shoppingSession });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to start shopping session";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
