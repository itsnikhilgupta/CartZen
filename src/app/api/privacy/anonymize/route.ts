import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { PrivacyService } from "@/server/services/privacy.service";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const result = await PrivacyService.anonymizeUserHistory(session.user.id);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to anonymize user data";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
