import { describe, expect, it } from "vitest";
import { tacticBoardSchema } from "@/lib/validation";

describe("tacticBoardSchema", () => {
  it("accepts a valid board payload", () => {
    const parsed = tacticBoardSchema.safeParse({
      players: [{ id: "p1", name: "Anna", x: 0.3, y: 0.4, radius: 0.2, isBurner: true }],
      passChains: [{ id: "c1", name: "Kedja 1", playerIds: ["p1", "p1"] }],
      cones: [
        { id: "cone-1", x: 0.2, y: 0.2 },
        { id: "cone-2", x: 0.8, y: 0.2 },
        { id: "cone-3", x: 0.8, y: 0.8 },
        { id: "cone-4", x: 0.2, y: 0.8 },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects cones arrays that are not exactly four", () => {
    const parsed = tacticBoardSchema.safeParse({
      players: [],
      passChains: [],
      cones: [{ id: "cone-1", x: 0.2, y: 0.2 }],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects pass chains with fewer than two players", () => {
    const parsed = tacticBoardSchema.safeParse({
      players: [],
      passChains: [{ id: "c1", name: "Kort", playerIds: ["p1"] }],
      cones: [
        { id: "cone-1", x: 0.2, y: 0.2 },
        { id: "cone-2", x: 0.8, y: 0.2 },
        { id: "cone-3", x: 0.8, y: 0.8 },
        { id: "cone-4", x: 0.2, y: 0.8 },
      ],
    });

    expect(parsed.success).toBe(false);
  });
});
