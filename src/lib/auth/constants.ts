export const SESSION_COOKIE = "ba_session";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export const RATE_LIMITS = {
  requestCodeByEmail15m: { limit: 5, windowMs: 15 * 60 * 1000 },
  requestCodeByEmailDay: { limit: 20, windowMs: 24 * 60 * 60 * 1000 },
  requestCodeByEmailIp15m: { limit: 8, windowMs: 15 * 60 * 1000 },
  requestCodeByIp10mSoft: { limit: 200, windowMs: 10 * 60 * 1000 },
  verifyCodeByEmail15m: { limit: 20, windowMs: 15 * 60 * 1000 },
};
