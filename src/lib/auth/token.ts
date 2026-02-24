import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { env } from "@/lib/env";
import { SESSION_TTL_SECONDS } from "@/lib/auth/constants";

export type SessionTokenPayload = {
  sub: string;
  role: Role;
  email: string;
  sid: string;
};

function sessionSecret() {
  return new TextEncoder().encode(env.AUTH_SESSION_SECRET);
}

export async function signSessionToken(payload: SessionTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const result = await jwtVerify<SessionTokenPayload>(token, sessionSecret());
    return result.payload;
  } catch {
    return null;
  }
}
