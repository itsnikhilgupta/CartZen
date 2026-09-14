import { NextResponse } from "next/server";
import { RequestEmailVerificationSchema } from "@/server/validations";
import { AuthService } from "@/server/services/auth.service";
import { checkRateLimit } from "@/server/security/rate-limiter";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimit = checkRateLimit(`verify-email-req:${ip}`, 5, 60000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many email verification requests." }, { status: 429 });
    }

    const body = await req.json();
    const { email } = RequestEmailVerificationSchema.parse(body);

    const result = await AuthService.requestEmailVerification(email);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Email verification request failed";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
