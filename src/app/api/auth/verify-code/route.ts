import { NextRequest, NextResponse } from "next/server";
import { OTP_MAX_ATTEMPTS, RATE_LIMITS } from "@/lib/auth/constants";
import { issueSession, setSessionCookie } from "@/lib/auth/session";
import { getRequestMeta, normalizeEmailForKey } from "@/lib/auth/request-meta";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { decideRisk, loadRecentFailures } from "@/lib/auth/risk";
import { verifyOtpHash } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { verifyCodeSchema } from "@/lib/validation";
import { logAuthEvent } from "@/lib/auth/audit";
import { sleep } from "@/lib/utils";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("INVALID_INPUT", "Felaktig payload.", 400);
  }

  const parsed = verifyCodeSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Felaktig e-post eller kod.", 400, parsed.error.flatten());
  }

  const email = normalizeEmailForKey(parsed.data.email);
  const code = parsed.data.code;
  const meta = getRequestMeta(request);

  const verifyLimit = await checkRateLimit(
    `verify:email:${email}`,
    RATE_LIMITS.verifyCodeByEmail15m.limit,
    RATE_LIMITS.verifyCodeByEmail15m.windowMs,
  );

  const recentFailures = await loadRecentFailures(email, meta.ipHash, meta.userAgentHash);
  const risk = decideRisk({
    emailLimited: !verifyLimit.allowed,
    ipSoftLimited: false,
    ...recentFailures,
  });

  if (risk.softDelayMs > 0) {
    await sleep(risk.softDelayMs);
  }

  if (!verifyLimit.allowed || risk.hardBlock) {
    await logAuthEvent({
      type: "verify_code",
      outcome: "blocked",
      email,
      ipHash: meta.ipHash,
      userAgentHash: meta.userAgentHash,
      riskScore: risk.score,
      meta: { reason: !verifyLimit.allowed ? "verify-rate-limit" : "risk-hard-block" },
    });

    return fail("RATE_LIMITED_SOFT", "För många försök. Vänta en stund och försök igen.", 429, {
      retryAfterMs: verifyLimit.retryAfterMs,
    });
  }

  const allowlisted = await db.allowedEmail.findFirst({
    where: { email, active: true },
    select: { id: true },
  });
  if (!allowlisted) {
    await logAuthEvent({
      type: "verify_code",
      outcome: "failure",
      email,
      ipHash: meta.ipHash,
      userAgentHash: meta.userAgentHash,
      riskScore: risk.score,
      meta: { reason: "email-not-allowlisted" },
    });
    return fail("NOT_ALLOWED_EMAIL", "E-postadressen är inte tillåten.", 403);
  }

  const latestOtp = await db.otpCode.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!latestOtp) {
    await logAuthEvent({
      type: "verify_code",
      outcome: "failure",
      email,
      ipHash: meta.ipHash,
      userAgentHash: meta.userAgentHash,
      riskScore: risk.score,
      meta: { reason: "otp-not-found" },
    });
    return fail("INVALID_CODE", "Koden är ogiltig.", 400);
  }

  if (latestOtp.expiresAt.getTime() <= Date.now()) {
    await db.otpCode.update({
      where: { id: latestOtp.id },
      data: { consumedAt: new Date() },
    });
    await logAuthEvent({
      type: "verify_code",
      outcome: "failure",
      email,
      ipHash: meta.ipHash,
      userAgentHash: meta.userAgentHash,
      riskScore: risk.score,
      meta: { reason: "otp-expired" },
    });
    return fail("CODE_EXPIRED", "Koden har gått ut. Begär en ny kod.", 400);
  }

  if (latestOtp.attemptCount >= OTP_MAX_ATTEMPTS) {
    await logAuthEvent({
      type: "verify_code",
      outcome: "blocked",
      email,
      ipHash: meta.ipHash,
      userAgentHash: meta.userAgentHash,
      riskScore: risk.score,
      meta: { reason: "otp-attempts-exceeded" },
    });
    return fail("RATE_LIMITED_SOFT", "För många kodförsök. Begär en ny kod.", 429);
  }

  const validCode = verifyOtpHash(email, code, latestOtp.codeHash);
  if (!validCode) {
    await db.otpCode.update({
      where: { id: latestOtp.id },
      data: { attemptCount: { increment: 1 } },
    });
    await logAuthEvent({
      type: "verify_code",
      outcome: "failure",
      email,
      ipHash: meta.ipHash,
      userAgentHash: meta.userAgentHash,
      riskScore: risk.score,
      meta: { reason: "otp-invalid" },
    });
    return fail("INVALID_CODE", "Koden är ogiltig.", 400);
  }

  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { email, role: "member" },
  });

  await db.otpCode.update({
    where: { id: latestOtp.id },
    data: { consumedAt: new Date() },
  });

  const session = await issueSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    ipHash: meta.ipHash,
    userAgentHash: meta.userAgentHash,
  });

  await logAuthEvent({
    type: "verify_code",
    outcome: "success",
    email,
    actorUserId: user.id,
    ipHash: meta.ipHash,
    userAgentHash: meta.userAgentHash,
    riskScore: risk.score,
  });

  const response = NextResponse.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    },
  });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
