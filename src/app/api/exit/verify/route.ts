import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { ExitVerifySchema } from "@/server/validations";
import { ExitService } from "@/server/services/exit.service";
import { assertStoreAdminAccess } from "@/server/security/rbac";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in as Store Admin / Gatekeeper" }, { status: 401 });
    }

    // RBAC: Must be STORE_ADMIN or SUPER_ADMIN
    assertStoreAdminAccess(session.user);

    const body = await req.json();
    const { verificationCode, storeId } = ExitVerifySchema.parse(body);

    const verificationResult = await ExitService.verifyExitCode({
      verificationCode,
      storeId,
      verifiedByUserId: session.user.id,
    });

    return NextResponse.json(verificationResult);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Exit verification failed";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
