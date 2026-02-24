import { z } from "zod";

function normalizeOptionalEnv(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const withoutWrappingQuotes = trimmed.replace(/^['"]|['"]$/g, "").trim();
  return withoutWrappingQuotes || undefined;
}

const optionalEnvString = z.preprocess((value) => normalizeOptionalEnv(value), z.string().optional());
const optionalUrl = z.preprocess((value) => normalizeOptionalEnv(value), z.string().url().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: optionalEnvString,
  AUTH_SESSION_SECRET: optionalEnvString,
  OTP_HASH_SECRET: optionalEnvString,
  AUDIT_HASH_SALT: optionalEnvString,
  RESEND_API_KEY: optionalEnvString,
  RESEND_FROM_EMAIL: optionalEnvString,
  UPSTASH_REDIS_REST_URL: optionalEnvString,
  UPSTASH_REDIS_REST_TOKEN: optionalEnvString,
  APP_URL: optionalUrl,
  INITIAL_ADMIN_EMAIL: optionalEnvString,
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Ogiltiga miljövariabler: ${parsed.error.message}`);
}

const sessionFallback = "dev-insecure-session-secret-change-me-please";
const otpFallback = "dev-insecure-otp-secret-change-me-please";
const auditFallback = "dev-insecure-audit-salt-change-me-please";

export const env = {
  ...parsed.data,
  AUTH_SESSION_SECRET: parsed.data.AUTH_SESSION_SECRET ?? sessionFallback,
  OTP_HASH_SECRET: parsed.data.OTP_HASH_SECRET ?? otpFallback,
  AUDIT_HASH_SALT: parsed.data.AUDIT_HASH_SALT ?? auditFallback,
  APP_URL: parsed.data.APP_URL ?? "http://localhost:3000",
};

export function assertServerEnv() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL saknas.");
  }
  if (env.NODE_ENV === "production") {
    if (env.AUTH_SESSION_SECRET === sessionFallback) {
      throw new Error("AUTH_SESSION_SECRET måste vara satt i produktion.");
    }
    if (env.OTP_HASH_SECRET === otpFallback) {
      throw new Error("OTP_HASH_SECRET måste vara satt i produktion.");
    }
    if (env.AUDIT_HASH_SALT === auditFallback) {
      throw new Error("AUDIT_HASH_SALT måste vara satt i produktion.");
    }
  }
}
