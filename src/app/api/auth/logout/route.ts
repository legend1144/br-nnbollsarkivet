import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { clearSessionCookie } from "@/lib/auth/session";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { db } from "@/lib/db";
import { logAuthEvent } from "@/lib/auth/audit";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  const meta = getRequestMeta(request);
  await db.session.updateMany({
    where: {
      id: auth.user!.sessionId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  await logAuthEvent({
    type: "logout",
    outcome: "success",
    actorUserId: auth.user!.id,
    email: auth.user!.email,
    ipHash: meta.ipHash,
    userAgentHash: meta.userAgentHash,
    riskScore: 0,
  });

  const response = NextResponse.json({ data: { ok: true } });
  clearSessionCookie(response);
  return response;
}
