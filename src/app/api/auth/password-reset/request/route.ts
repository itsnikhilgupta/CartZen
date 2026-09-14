import { NextResponse } from "next/server";
import { RequestPasswordResetSchema } from "@/server/validations";
import { AuthService } from "@/server/services/auth.service";
import { checkRateLimit } from "@/server/security/rate-limiter";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimit = checkRateLimit(`pwd-reset-req:${ip}`, 5, 60000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many password reset requests. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { email } = RequestPasswordResetSchema.parse(body);

    const result = await AuthService.requestPasswordReset(email);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Password reset request failed";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
