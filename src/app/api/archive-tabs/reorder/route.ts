import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http";
import { archiveTabsReorderSchema } from "@/lib/validation";
import {
  archiveRuntimeNotReadyResult,
  getArchivePrisma,
  isArchiveRuntimeError,
  isArchiveTabRuntimeReady,
} from "@/lib/archive";

const prisma = getArchivePrisma();

function archiveRuntimeFailResponse() {
  const status = archiveRuntimeNotReadyResult();
  return fail(status.errorCode, status.message, 503);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;
  if (!isArchiveTabRuntimeReady()) {
    return archiveRuntimeFailResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("INVALID_INPUT", "Felaktig payload.", 400);
  }

  const parsed = archiveTabsReorderSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Ogiltig tab-ordning.", 400, parsed.error.flatten());
  }

  try {
    const rows = await prisma.archiveTab!.findMany({
      where: { id: { in: parsed.data.tabIds } },
      select: { id: true },
    });
    if (rows.length !== parsed.data.tabIds.length) {
      return fail("INVALID_INPUT", "Ett eller flera tab-id saknas.", 400);
    }

    await Promise.all(
      parsed.data.tabIds.map((tabId, index) =>
        prisma.archiveTab!.update({
          where: { id: tabId },
          data: { order: index },
        }),
      ),
    );
  } catch (error) {
    if (isArchiveRuntimeError(error)) {
      return archiveRuntimeFailResponse();
    }
    throw error;
  }

  return ok({ ok: true });
}

