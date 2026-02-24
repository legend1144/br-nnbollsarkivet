import { subHours } from "@/lib/dates";
import { db } from "@/lib/db";

export type RiskSignals = {
  ipSoftLimited: boolean;
  emailLimited: boolean;
  emailFailuresLastHour: number;
  ipFailuresLastHour: number;
  uaFailuresLastHour: number;
};

export type RiskDecision = {
  score: number;
  softDelayMs: number;
  hardBlock: boolean;
};

function scoreSignals(signals: RiskSignals) {
  let score = 0;
  if (signals.emailLimited) score += 35;
  if (signals.ipSoftLimited) score += 45;
  score += Math.min(25, signals.emailFailuresLastHour * 5);
  score += Math.min(25, signals.ipFailuresLastHour * 2);
  score += Math.min(15, signals.uaFailuresLastHour * 3);
  return Math.min(100, score);
}

export function decideRisk(signals: RiskSignals): RiskDecision {
  const score = scoreSignals(signals);
  const softDelayMs = score >= 40 ? Math.min(8_000, 1_000 + (score - 40) * 120) : 0;
  const hardBlock = score >= 95;
  return { score, softDelayMs, hardBlock };
}

export async function loadRecentFailures(email: string, ipHash: string, userAgentHash: string) {
  const since = subHours(new Date(), 1);

  const [emailFailuresLastHour, ipFailuresLastHour, uaFailuresLastHour] = await Promise.all([
    db.authEvent.count({
      where: {
        email,
        outcome: "failure",
        createdAt: { gte: since },
      },
    }),
    db.authEvent.count({
      where: {
        ipHash,
        outcome: "failure",
        createdAt: { gte: since },
      },
    }),
    db.authEvent.count({
      where: {
        userAgentHash,
        outcome: "failure",
        createdAt: { gte: since },
      },
    }),
  ]);

  return { emailFailuresLastHour, ipFailuresLastHour, uaFailuresLastHour };
}
