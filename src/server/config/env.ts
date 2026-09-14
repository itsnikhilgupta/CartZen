import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET must be at least 16 characters in production").optional(),
  NEXTAUTH_URL: z.string().optional(),
  CARTZEN_HMAC_SECRET: z.string().min(16, "CARTZEN_HMAC_SECRET must be at least 16 characters").default("default_super_secret_cartzen_key_2026"),
  RATE_LIMIT_WINDOW_SEC: z.string().default("60"),
  RATE_LIMIT_MAX_REQUESTS: z.string().default("100"),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid Environment Configuration:", result.error.format());
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid Environment Variables in Production");
    }
  }
  return result.data || {
    NODE_ENV: "development",
    DATABASE_URL: "file:./dev.db",
    CARTZEN_HMAC_SECRET: "default_super_secret_cartzen_key_2026",
    RATE_LIMIT_WINDOW_SEC: "60",
    RATE_LIMIT_MAX_REQUESTS: "100",
  };
}

export const env = validateEnv();
