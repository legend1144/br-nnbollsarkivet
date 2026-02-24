import type { AuthEventType, AuthOutcome, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type AuditEventInput = {
  type: AuthEventType;
  outcome: AuthOutcome;
  email?: string | null;
  actorUserId?: string | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
  riskScore?: number;
  meta?: Record<string, unknown>;
};

export async function logAuthEvent(input: AuditEventInput) {
  await db.authEvent.create({
    data: {
      type: input.type,
      outcome: input.outcome,
      email: input.email ?? null,
      actorUserId: input.actorUserId ?? null,
      ipHash: input.ipHash ?? null,
      userAgentHash: input.userAgentHash ?? null,
      riskScore: input.riskScore ?? 0,
      meta: (input.meta ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
