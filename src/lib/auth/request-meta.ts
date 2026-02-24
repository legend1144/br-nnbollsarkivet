import type { NextRequest } from "next/server";
import { hashIdentifier, normalizeEmail } from "@/lib/utils";

export type RequestMeta = {
  ip: string;
  ipHash: string;
  userAgent: string;
  userAgentHash: string;
};

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function getRequestMeta(request: NextRequest): RequestMeta {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return {
    ip,
    ipHash: hashIdentifier(ip),
    userAgent,
    userAgentHash: hashIdentifier(userAgent),
  };
}

export function normalizeEmailForKey(email: string) {
  return normalizeEmail(email);
}
