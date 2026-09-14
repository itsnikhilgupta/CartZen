import { NextResponse } from "next/server";
import { RegisterUserSchema } from "@/server/validations";
import { prisma } from "@/server/db/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@/types/enums";
import { checkRateLimit } from "@/server/security/rate-limiter";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimit = checkRateLimit(`register:${ip}`, 10, 60000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const validated = RegisterUserSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account with this email address already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        email: validated.email.toLowerCase().trim(),
        passwordHash,
        name: validated.name,
        phone: validated.phone || null,
        role: Role.CUSTOMER,
        consent: {
          create: {
            personalizationOptIn: true,
            behaviouralTrackingOptIn: true,
            marketingOptIn: false,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
