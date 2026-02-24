import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http";
import { archiveTabUpdateSchema } from "@/lib/validation";
import {
  archiveRuntimeNotReadyResult,
  getArchivePrisma,
  isArchiveRuntimeError,
  isArchiveTabRuntimeReady,
  mapArchiveTab,
  normalizeArchiveSlug,
} from "@/lib/archive";

type Context = {
  params: Promise<{ id: string }>;
};

const prisma = getArchivePrisma();

function archiveRuntimeFailResponse() {
  const status = archiveRuntimeNotReadyResult();
  return fail(status.errorCode, status.message, 503);
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;
  if (!isArchiveTabRuntimeReady()) {
    return archiveRuntimeFailResponse();
  }

  const { id } = await context.params;
  let existing: { title: string } | null;
  try {
    existing = await prisma.archiveTab!.findUnique({
      where: { id },
      select: { title: true },
    });
  } catch (error) {
    if (isArchiveRuntimeError(error)) {
      return archiveRuntimeFailResponse();
    }
    throw error;
  }

  if (!existing) {
    return fail("NOT_FOUND", "Arkivfliken hittades inte.", 404);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("INVALID_INPUT", "Felaktig payload.", 400);
  }

  const parsed = archiveTabUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Ogiltiga falt for arkivflik.", 400, parsed.error.flatten());
  }

  try {
    const updated = await prisma.archiveTab!.update({
      where: { id },
      data: {
        title: parsed.data.title ?? undefined,
        slug:
          parsed.data.slug !== undefined || parsed.data.title !== undefined
            ? normalizeArchiveSlug(parsed.data.slug, parsed.data.title ?? existing.title)
            : undefined,
        description: parsed.data.description === undefined ? undefined : parsed.data.description,
        introMarkdown: parsed.data.introMarkdown === undefined ? undefined : parsed.data.introMarkdown,
        isActive: parsed.data.isActive ?? undefined,
        order: parsed.data.order ?? undefined,
      },
    });
    return ok(mapArchiveTab(updated));
  } catch (error) {
    if (isArchiveRuntimeError(error)) {
      return archiveRuntimeFailResponse();
    }
    return fail("INVALID_INPUT", "Kunde inte uppdatera arkivfliken.", 400);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;
  if (!isArchiveTabRuntimeReady()) {
    return archiveRuntimeFailResponse();
  }

  const { id } = await context.params;
  try {
    const existing = await prisma.archiveTab!.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return fail("NOT_FOUND", "Arkivfliken hittades inte.", 404);
    }

    await prisma.archiveTab!.delete({ where: { id } });

    const remaining = await prisma.archiveTab!.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    await Promise.all(
      remaining.map((tab, index) =>
        prisma.archiveTab!.update({
          where: { id: tab.id },
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

