import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { ConsentUpdateSchema } from "@/server/validations";
import { PrivacyService } from "@/server/services/privacy.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const consent = await PrivacyService.getUserConsent(session.user.id);
    return NextResponse.json({ consent });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch privacy settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const validated = ConsentUpdateSchema.parse(body);

    const consent = await PrivacyService.updateConsent(session.user.id, validated);
    return NextResponse.json({ success: true, consent });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to update consent preferences";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
