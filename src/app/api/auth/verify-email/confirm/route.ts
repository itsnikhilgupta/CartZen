import { NextResponse } from "next/server";
import { ConfirmEmailVerificationSchema } from "@/server/validations";
import { AuthService } from "@/server/services/auth.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = ConfirmEmailVerificationSchema.parse(body);

    const result = await AuthService.confirmEmailVerification(token);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Email verification failed";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
