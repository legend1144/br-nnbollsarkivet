import { describe, expect, it } from "vitest";
import { generateOtpCode, hashOtp, verifyOtpHash } from "@/lib/auth/otp";

describe("otp", () => {
  it("generates a 6 digit code", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("validates hash for the same email and code", () => {
    const email = "member@example.se";
    const code = "123456";
    const hash = hashOtp(email, code);

    expect(verifyOtpHash(email, code, hash)).toBe(true);
    expect(verifyOtpHash(email, "999999", hash)).toBe(false);
  });
});
