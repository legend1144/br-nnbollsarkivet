import { describe, expect, it } from "vitest";
import { decideRisk } from "@/lib/auth/risk";

describe("risk decision", () => {
  it("adds soft delay for heavy shared IP activity without hard block", () => {
    const decision = decideRisk({
      ipSoftLimited: true,
      emailLimited: false,
      emailFailuresLastHour: 0,
      ipFailuresLastHour: 0,
      uaFailuresLastHour: 0,
    });

    expect(decision.softDelayMs).toBeGreaterThan(0);
    expect(decision.hardBlock).toBe(false);
  });

  it("hard blocks only under clearly abusive combined signals", () => {
    const decision = decideRisk({
      ipSoftLimited: true,
      emailLimited: true,
      emailFailuresLastHour: 10,
      ipFailuresLastHour: 30,
      uaFailuresLastHour: 10,
    });

    expect(decision.score).toBeGreaterThanOrEqual(95);
    expect(decision.hardBlock).toBe(true);
  });
});
