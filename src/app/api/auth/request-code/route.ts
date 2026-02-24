import { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { requestCodeSchema } from "@/lib/validation";

const GENERIC_MESSAGE = "Om adressen är godkänd har en kod skickats.";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return ok({ message: GENERIC_MESSAGE });
  }

  const parsed = requestCodeSchema.safeParse(payload);
  if (!parsed.success) {
    return ok({ message: GENERIC_MESSAGE });
  }

  try {
    const [
      { RATE_LIMITS, OTP_TTL_MS },
      { sendOtpEmail },
      { generateOtpCode, hashOtp },
      { getRequestMeta, normalizeEmailForKey },
      { checkRateLimit },
      { decideRisk, loadRecentFailures },
      { db },
      { logAuthEvent },
      { sleep },
    ] = await Promise.all([
      import("@/lib/auth/constants"),
      import("@/lib/auth/email"),
      import("@/lib/auth/otp"),
      import("@/lib/auth/request-meta"),
      import("@/lib/auth/rate-limit"),
      import("@/lib/auth/risk"),
      import("@/lib/db"),
      import("@/lib/auth/audit"),
      import("@/lib/utils"),
    ]);

    const email = normalizeEmailForKey(parsed.data.email);
    const meta = getRequestMeta(request);

    const [byEmail15m, byEmailDay, byEmailIp15m, byIp10mSoft] = await Promise.all([
      checkRateLimit(`request:email:${email}`, RATE_LIMITS.requestCodeByEmail15m.limit, RATE_LIMITS.requestCodeByEmail15m.windowMs),
      checkRateLimit(`request:email-day:${email}`, RATE_LIMITS.requestCodeByEmailDay.limit, RATE_LIMITS.requestCodeByEmailDay.windowMs),
      checkRateLimit(
        `request:email-ip:${email}:${meta.ipHash}`,
        RATE_LIMITS.requestCodeByEmailIp15m.limit,
        RATE_LIMITS.requestCodeByEmailIp15m.windowMs,
      ),
      checkRateLimit(`request:ip:${meta.ipHash}`, RATE_LIMITS.requestCodeByIp10mSoft.limit, RATE_LIMITS.requestCodeByIp10mSoft.windowMs),
    ]);

    const emailLimited = !byEmail15m.allowed || !byEmailDay.allowed || !byEmailIp15m.allowed;
    const ipSoftLimited = !byIp10mSoft.allowed;
    const recentFailures = await loadRecentFailures(email, meta.ipHash, meta.userAgentHash);
    const risk = decideRisk({
      ipSoftLimited,
      emailLimited,
      ...recentFailures,
    });

    if (risk.softDelayMs > 0) {
      await sleep(risk.softDelayMs);
    }

    if (risk.hardBlock || emailLimited) {
      await logAuthEvent({
        type: "request_code",
        outcome: "blocked",
        email,
        ipHash: meta.ipHash,
        userAgentHash: meta.userAgentHash,
        riskScore: risk.score,
        meta: {
          reason: risk.hardBlock ? "risk-hard-block" : "email-rate-limited",
        },
      });
      return ok({ message: GENERIC_MESSAGE });
    }

    const allowedEmail = await db.allowedEmail.findFirst({
      where: { email, active: true },
    });

    if (!allowedEmail) {
      await logAuthEvent({
        type: "request_code",
        outcome: "failure",
        email,
        ipHash: meta.ipHash,
        userAgentHash: meta.userAgentHash,
        riskScore: risk.score,
        meta: { reason: "email-not-allowlisted" },
      });
      return ok({ message: GENERIC_MESSAGE });
    }

    const code = generateOtpCode();
    const codeHash = hashOtp(email, code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await db.$transaction([
      db.otpCode.updateMany({
        where: { email, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      db.otpCode.create({
        data: { email, codeHash, expiresAt },
      }),
    ]);

    await sendOtpEmail(email, code);

    await logAuthEvent({
      type: "request_code",
      outcome: "success",
      email,
      ipHash: meta.ipHash,
      userAgentHash: meta.userAgentHash,
      riskScore: risk.score,
    });
  } catch (error) {
    console.error("[auth/request-code] Failed to handle request code flow", error);
  }

  return ok({ message: GENERIC_MESSAGE });
}
