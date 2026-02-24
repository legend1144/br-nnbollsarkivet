import { randomInt } from "node:crypto";
import { OTP_LENGTH } from "@/lib/auth/constants";
import { env } from "@/lib/env";
import { hmacSha256, normalizeEmail, safeEqualHex } from "@/lib/utils";

export function generateOtpCode() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(randomInt(min, max + 1));
}

export function hashOtp(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  return hmacSha256(`${normalizedEmail}:${code}`, env.OTP_HASH_SECRET);
}

export function verifyOtpHash(email: string, code: string, expectedHash: string) {
  const candidate = hashOtp(email, code);
  return safeEqualHex(candidate, expectedHash);
}
