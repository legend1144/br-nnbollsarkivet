import type { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { addSeconds } from "@/lib/dates";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/constants";
import type { SessionUser } from "@/lib/types";
import { signSessionToken, verifySessionToken } from "@/lib/auth/token";

export async function issueSession(input: { userId: string; email: string; role: Role; ipHash?: string; userAgentHash?: string }) {
  const expiresAt = addSeconds(new Date(), SESSION_TTL_SECONDS);
  const session = await db.session.create({
    data: {
      userId: input.userId,
      expiresAt,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
    },
  });

  const token = await signSessionToken({
    sub: input.userId,
    role: input.role,
    email: input.email,
    sid: session.id,
  });

  return { token, sessionId: session.id, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

async function loadSessionFromToken(token: string): Promise<SessionUser | null> {
  const payload = await verifySessionToken(token);
  if (!payload?.sid || !payload.sub) {
    return null;
  }

  const session = await db.session.findFirst({
    where: {
      id: payload.sid,
      userId: payload.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    sessionId: session.id,
  };
}

export async function readSessionFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return loadSessionFromToken(token);
}

export async function readSessionFromToken(token: string | undefined) {
  if (!token) return null;
  return loadSessionFromToken(token);
}
