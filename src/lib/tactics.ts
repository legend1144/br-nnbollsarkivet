import type { TacticCone, TacticPassChain, TacticPlayer } from "@/lib/types";

type BurnerValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_BURNER_SELECTION";
      message: string;
    };

type PassChainValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_PASS_CHAIN";
      message: string;
    };

export type TacticPassSegment = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function clampRadius(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 0.5) return 0.5;
  return value;
}

export const defaultCones: TacticCone[] = [
  { id: "cone-1", x: 0.34, y: 0.5 },
  { id: "cone-2", x: 0.66, y: 0.5 },
  { id: "cone-3", x: 0.66, y: 0.82 },
  { id: "cone-4", x: 0.34, y: 0.82 },
];

export function normalizeTacticPlayers(value: unknown): TacticPlayer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: TacticPlayer[] = [];
  for (const [index, entry] of value.entries()) {
    const record = asRecord(entry);
    if (!record) continue;

    const id = readString(record.id) ?? `player-${index + 1}`;
    const name = readString(record.name) ?? `Spelare ${index + 1}`;
    const number = readString(record.number);
    const role = readString(record.role);
    const x = clamp01(readNumber(record.x) ?? 0.5);
    const y = clamp01(readNumber(record.y) ?? 0.5);
    const radius = clampRadius(readNumber(record.radius) ?? 0);
    const isBurner = record.isBurner === true || role?.toLowerCase() === "brannare";

    const player: TacticPlayer = {
      id,
      name,
      x,
      y,
      radius,
      isBurner,
    };
    if (number !== undefined) {
      player.number = number;
    }
    if (role !== undefined) {
      player.role = role;
    }
    normalized.push(player);
  }

  return normalized;
}

export function normalizePassChains(value: unknown, players: TacticPlayer[]): TacticPassChain[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const playerIds = new Set(players.map((player) => player.id));
  const normalized: TacticPassChain[] = [];

  for (const [index, entry] of value.entries()) {
    const record = asRecord(entry);
    if (!record) continue;

    const idsRaw = Array.isArray(record.playerIds) ? record.playerIds : [];
    const chainPlayerIds = idsRaw
      .map((id) => readString(id))
      .filter((id): id is string => Boolean(id && playerIds.has(id)));

    if (chainPlayerIds.length < 2) continue;

    normalized.push({
      id: readString(record.id) ?? `chain-${index + 1}`,
      name: readString(record.name) ?? `Kedja ${index + 1}`,
      playerIds: chainPlayerIds,
    });
  }

  return normalized;
}

export function normalizeCones(value: unknown): TacticCone[] {
  const fallback = defaultCones.map((cone) => ({ ...cone }));
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = fallback.map((fallbackCone, index) => {
    const entry = value[index];
    const record = asRecord(entry);
    if (!record) return fallbackCone;
    return {
      id: readString(record.id) ?? fallbackCone.id,
      x: clamp01(readNumber(record.x) ?? fallbackCone.x),
      y: clamp01(readNumber(record.y) ?? fallbackCone.y),
    };
  });

  return normalized;
}

export function countBurners(players: TacticPlayer[]) {
  return players.filter((player) => player.isBurner).length;
}

export function validateBurnerSelection(players: TacticPlayer[]): BurnerValidationResult {
  if (players.length === 0) {
    return { ok: true };
  }
  if (countBurners(players) === 1) {
    return { ok: true };
  }
  return {
    ok: false,
    code: "INVALID_BURNER_SELECTION",
    message: "Spelplan med spelare maste ha exakt en brannare.",
  };
}

export function validatePassChains(chains: TacticPassChain[], players: TacticPlayer[]): PassChainValidationResult {
  const playerIds = new Set(players.map((player) => player.id));
  for (const chain of chains) {
    if (chain.playerIds.length < 2) {
      return {
        ok: false,
        code: "INVALID_PASS_CHAIN",
        message: "Alla passningskedjor maste innehalla minst tva spelare.",
      };
    }
    if (chain.playerIds.some((id) => !playerIds.has(id))) {
      return {
        ok: false,
        code: "INVALID_PASS_CHAIN",
        message: "Passningskedjor innehaller spelare som inte finns pa planen.",
      };
    }
  }
  return { ok: true };
}

export function resolveRemainingPassSegments(
  chains: TacticPassChain[],
  players: TacticPlayer[],
  focusedPlayerId: string | null | undefined,
): TacticPassSegment[] {
  if (!focusedPlayerId) {
    return [];
  }

  const playerMap = new Map(players.map((player) => [player.id, player]));
  const segments: TacticPassSegment[] = [];

  for (const chain of chains) {
    const chainPlayers = chain.playerIds
      .map((playerId) => playerMap.get(playerId))
      .filter((player): player is TacticPlayer => Boolean(player));

    if (chainPlayers.length < 2) {
      continue;
    }

    const focusIndex = chainPlayers.findIndex((player) => player.id === focusedPlayerId);
    if (focusIndex === -1) {
      continue;
    }

    const burnerIndex = chainPlayers.findIndex((player, index) => index >= focusIndex && player.isBurner === true);
    const endExclusive = burnerIndex === -1 ? chainPlayers.length : burnerIndex + 1;

    if (endExclusive - focusIndex < 2) {
      continue;
    }

    for (let index = focusIndex; index < endExclusive - 1; index += 1) {
      const from = chainPlayers[index]!;
      const to = chainPlayers[index + 1]!;
      segments.push({
        key: `${chain.id}-${from.id}-${to.id}-${index}`,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
      });
    }
  }

  return segments;
}
