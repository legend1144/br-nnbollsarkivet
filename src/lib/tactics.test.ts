import { describe, expect, it } from "vitest";
import {
  defaultCones,
  normalizeCones,
  normalizePassChains,
  normalizeTacticPlayers,
  resolveRemainingPassSegments,
  validateBurnerSelection,
  validatePassChains,
} from "@/lib/tactics";

describe("tactics normalization", () => {
  it("parses players with radius and clamps out of range values", () => {
    const players = normalizeTacticPlayers([
      { id: "p1", name: "Anna", x: 1.8, y: -0.4, radius: 1 },
    ]);

    expect(players).toHaveLength(1);
    expect(players[0]?.radius).toBe(0.5);
    expect(players[0]?.x).toBe(1);
    expect(players[0]?.y).toBe(0);
  });

  it("normalizes chains against existing players", () => {
    const players = normalizeTacticPlayers([
      { id: "p1", name: "A", x: 0.2, y: 0.2 },
      { id: "p2", name: "B", x: 0.4, y: 0.4 },
    ]);

    const chains = normalizePassChains(
      [
        { id: "c1", playerIds: ["p1", "p2"] },
        { id: "c2", playerIds: ["p1", "p3"] },
      ],
      players,
    );

    expect(chains).toHaveLength(1);
    expect(chains[0]?.id).toBe("c1");
  });

  it("strips legacy chain style fields and keeps only ids", () => {
    const players = normalizeTacticPlayers([
      { id: "p1", name: "A", x: 0.2, y: 0.2 },
      { id: "p2", name: "B", x: 0.4, y: 0.4 },
    ]);

    const chains = normalizePassChains(
      [{ id: "c1", name: "Anfall", playerIds: ["p1", "p2"], color: "#ffffff", lineWidth: 7, showArrows: true }],
      players,
    );

    expect(chains).toEqual([{ id: "c1", name: "Anfall", playerIds: ["p1", "p2"] }]);
  });

  it("returns default cones when cone data is missing", () => {
    expect(normalizeCones(null)).toEqual(defaultCones);
  });
});

describe("burner rules", () => {
  it("allows empty player lists", () => {
    expect(validateBurnerSelection([]).ok).toBe(true);
  });

  it("requires exactly one burner when players exist", () => {
    const noBurner = validateBurnerSelection([{ id: "p1", name: "Anna", x: 0.3, y: 0.3 }]);
    expect(noBurner.ok).toBe(false);

    const oneBurner = validateBurnerSelection([
      { id: "p1", name: "Anna", x: 0.3, y: 0.3, isBurner: true },
      { id: "p2", name: "Bo", x: 0.5, y: 0.5, isBurner: false },
    ]);
    expect(oneBurner.ok).toBe(true);
  });
});

describe("pass chain rules", () => {
  it("rejects chain with missing player", () => {
    const players = [
      { id: "p1", name: "Anna", x: 0.3, y: 0.3 },
      { id: "p2", name: "Bo", x: 0.5, y: 0.5 },
    ];

    const result = validatePassChains([{ id: "c1", name: "Test", playerIds: ["p1", "p3"] }], players);
    expect(result.ok).toBe(false);
  });

  it("accepts valid chains", () => {
    const players = [
      { id: "p1", name: "Anna", x: 0.3, y: 0.3 },
      { id: "p2", name: "Bo", x: 0.5, y: 0.5 },
    ];

    const result = validatePassChains([{ id: "c1", name: "Test", playerIds: ["p1", "p2"] }], players);
    expect(result.ok).toBe(true);
  });

  it("returns only remaining segments from focused player to burner", () => {
    const players = [
      { id: "p1", name: "A", x: 0.1, y: 0.1 },
      { id: "p2", name: "B", x: 0.2, y: 0.2 },
      { id: "p3", name: "C", x: 0.3, y: 0.3 },
      { id: "p4", name: "Br", x: 0.4, y: 0.4, isBurner: true },
    ];

    const segments = resolveRemainingPassSegments(
      [{ id: "c1", name: "Kedja", playerIds: ["p1", "p2", "p3", "p4", "p1"] }],
      players,
      "p2",
    );

    expect(segments).toHaveLength(2);
    expect(segments.map((segment) => [segment.x1, segment.y1, segment.x2, segment.y2])).toEqual([
      [0.2, 0.2, 0.3, 0.3],
      [0.3, 0.3, 0.4, 0.4],
    ]);
  });

  it("returns segments to chain end when no burner exists", () => {
    const players = [
      { id: "p1", name: "A", x: 0.1, y: 0.1 },
      { id: "p2", name: "B", x: 0.2, y: 0.2 },
      { id: "p3", name: "C", x: 0.3, y: 0.3 },
    ];

    const segments = resolveRemainingPassSegments(
      [{ id: "c1", name: "Kedja", playerIds: ["p1", "p2", "p3"] }],
      players,
      "p2",
    );

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ x1: 0.2, y1: 0.2, x2: 0.3, y2: 0.3 });
  });

  it("returns empty list when focused player is burner", () => {
    const players = [
      { id: "p1", name: "A", x: 0.1, y: 0.1 },
      { id: "p2", name: "Br", x: 0.2, y: 0.2, isBurner: true },
    ];

    const segments = resolveRemainingPassSegments(
      [{ id: "c1", name: "Kedja", playerIds: ["p1", "p2"] }],
      players,
      "p2",
    );

    expect(segments).toEqual([]);
  });
});
