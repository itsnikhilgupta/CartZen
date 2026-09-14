import { NextResponse } from "next/server";
import { ConfirmPasswordResetSchema } from "@/server/validations";
import { AuthService } from "@/server/services/auth.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, newPassword } = ConfirmPasswordResetSchema.parse(body);

    const result = await AuthService.confirmPasswordReset(token, newPassword);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Password reset confirmation failed";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
