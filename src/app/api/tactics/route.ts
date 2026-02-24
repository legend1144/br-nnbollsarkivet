import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { tacticBoardSchema } from "@/lib/validation";
import {
  defaultCones,
  normalizeCones,
  normalizePassChains,
  normalizeTacticPlayers,
  validateBurnerSelection,
  validatePassChains,
} from "@/lib/tactics";

const TACTIC_BOARD_KEY = "default";

type TacticBoardRecord = {
  key: string;
  playersData: unknown;
  passChainsData: unknown;
  conesData: unknown;
  updatedAt: Date;
};

type TacticBoardModel = {
  findUnique: (args: unknown) => Promise<TacticBoardRecord | null>;
  create: (args: unknown) => Promise<TacticBoardRecord>;
  upsert: (args: unknown) => Promise<TacticBoardRecord>;
};

type TacticBoardSqlRow = {
  key: string;
  playersData: unknown;
  passChainsData: unknown;
  conesData: unknown;
  updatedAt: Date;
};

function getTacticBoardModel() {
  const prisma = db as unknown as { tacticBoard?: TacticBoardModel };
  return prisma.tacticBoard ?? null;
}

function toDto(board: {
  key: string;
  playersData: unknown;
  passChainsData: unknown;
  conesData: unknown;
  updatedAt: Date;
}) {
  const players = normalizeTacticPlayers(board.playersData);
  const passChains = normalizePassChains(board.passChainsData, players);
  const cones = normalizeCones(board.conesData);

  return {
    key: board.key,
    players,
    passChains,
    cones,
    updatedAt: board.updatedAt.toISOString(),
  };
}

async function ensureBoard(model: TacticBoardModel) {
  const existing = await model.findUnique({
    where: { key: TACTIC_BOARD_KEY },
  });

  if (existing) {
    return existing;
  }

  return model.create({
    data: {
      key: TACTIC_BOARD_KEY,
      playersData: [],
      passChainsData: [],
      conesData: defaultCones,
    },
  });
}

async function ensureBoardRaw() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TacticBoard" (
      "key" TEXT PRIMARY KEY,
      "playersData" JSONB NOT NULL,
      "passChainsData" JSONB NOT NULL,
      "conesData" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existing = await db.$queryRaw<TacticBoardSqlRow[]>`
    SELECT "key", "playersData", "passChainsData", "conesData", "updatedAt"
    FROM "TacticBoard"
    WHERE "key" = ${TACTIC_BOARD_KEY}
    LIMIT 1
  `;
  if (existing[0]) {
    return existing[0];
  }

  await db.$executeRaw`
    INSERT INTO "TacticBoard" ("key", "playersData", "passChainsData", "conesData")
    VALUES (
      ${TACTIC_BOARD_KEY},
      CAST(${JSON.stringify([])} AS jsonb),
      CAST(${JSON.stringify([])} AS jsonb),
      CAST(${JSON.stringify(defaultCones)} AS jsonb)
    )
  `;

  const created = await db.$queryRaw<TacticBoardSqlRow[]>`
    SELECT "key", "playersData", "passChainsData", "conesData", "updatedAt"
    FROM "TacticBoard"
    WHERE "key" = ${TACTIC_BOARD_KEY}
    LIMIT 1
  `;

  return created[0]!;
}

async function upsertBoardRaw(args: {
  players: unknown;
  passChains: unknown;
  cones: unknown;
}) {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TacticBoard" (
      "key" TEXT PRIMARY KEY,
      "playersData" JSONB NOT NULL,
      "passChainsData" JSONB NOT NULL,
      "conesData" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.$executeRaw`
    INSERT INTO "TacticBoard" ("key", "playersData", "passChainsData", "conesData", "updatedAt")
    VALUES (
      ${TACTIC_BOARD_KEY},
      CAST(${JSON.stringify(args.players)} AS jsonb),
      CAST(${JSON.stringify(args.passChains)} AS jsonb),
      CAST(${JSON.stringify(args.cones)} AS jsonb),
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("key")
    DO UPDATE SET
      "playersData" = CAST(${JSON.stringify(args.players)} AS jsonb),
      "passChainsData" = CAST(${JSON.stringify(args.passChains)} AS jsonb),
      "conesData" = CAST(${JSON.stringify(args.cones)} AS jsonb),
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  const rows = await db.$queryRaw<TacticBoardSqlRow[]>`
    SELECT "key", "playersData", "passChainsData", "conesData", "updatedAt"
    FROM "TacticBoard"
    WHERE "key" = ${TACTIC_BOARD_KEY}
    LIMIT 1
  `;

  return rows[0]!;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  const model = getTacticBoardModel();
  try {
    const board = model ? await ensureBoard(model) : await ensureBoardRaw();
    return ok(toDto(board));
  } catch {
    return fail("INTERNAL_ERROR", "Taktikdatamodellen ar inte uppdaterad. Kor prisma:migrate och prisma:generate.", 503);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("INVALID_INPUT", "Felaktig payload.", 400);
  }

  const parsed = tacticBoardSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Ogiltigt taktikschema.", 400, parsed.error.flatten());
  }

  const players = normalizeTacticPlayers(parsed.data.players);
  const burnerValidation = validateBurnerSelection(players);
  if (!burnerValidation.ok) {
    return fail("INVALID_INPUT", burnerValidation.message, 400, { code: burnerValidation.code });
  }

  const playerIds = new Set(players.map((player) => player.id));
  for (const chain of parsed.data.passChains) {
    if (chain.playerIds.some((playerId) => !playerIds.has(playerId))) {
      return fail("INVALID_INPUT", "Passningskedjor innehaller spelare som inte finns pa planen.", 400, {
        code: "INVALID_PASS_CHAIN",
      });
    }
  }

  const passChains = normalizePassChains(parsed.data.passChains, players);
  const chainValidation = validatePassChains(passChains, players);
  if (!chainValidation.ok) {
    return fail("INVALID_INPUT", chainValidation.message, 400, { code: chainValidation.code });
  }

  const cones = normalizeCones(parsed.data.cones);

  const model = getTacticBoardModel();
  let board: TacticBoardRecord | TacticBoardSqlRow;
  try {
    board = model
      ? await model.upsert({
          where: { key: TACTIC_BOARD_KEY },
          create: {
            key: TACTIC_BOARD_KEY,
            playersData: players,
            passChainsData: passChains,
            conesData: cones,
          },
          update: {
            playersData: players,
            passChainsData: passChains,
            conesData: cones,
          },
        })
      : await upsertBoardRaw({
          players,
          passChains,
          cones,
        });
  } catch {
    return fail("INTERNAL_ERROR", "Taktikdatamodellen ar inte uppdaterad. Kor prisma:migrate och prisma:generate.", 503);
  }

  revalidatePath("/arkivet");
  revalidatePath("/admin/tactics");

  return ok(toDto(board));
}
