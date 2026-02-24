import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { fail, ok } from "@/lib/http";
import { archiveTabCreateSchema } from "@/lib/validation";
import {
  archiveRuntimeNotReadyResult,
  getArchivePrisma,
  isArchiveRuntimeError,
  isArchiveTabRuntimeReady,
  mapArchiveTab,
  normalizeArchiveSlug,
  safeListArchiveTabs,
} from "@/lib/archive";

const prisma = getArchivePrisma();

function archiveRuntimeFailResponse() {
  const status = archiveRuntimeNotReadyResult();
  return fail(status.errorCode, status.message, 503);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  const tabsResult = await safeListArchiveTabs({
    includeInactive: auth.user!.role === "admin",
  });
  if (!tabsResult.ok) {
    return fail(tabsResult.errorCode, tabsResult.message, 503);
  }

  return ok(tabsResult.data);
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

  const parsed = archiveTabCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Ogiltiga falt for arkivflik.", 400, parsed.error.flatten());
  }

  try {
    const nextOrder = await prisma.archiveTab!.count();
    const created = await prisma.archiveTab!.create({
      data: {
        title: parsed.data.title,
        slug: normalizeArchiveSlug(parsed.data.slug, parsed.data.title),
        description: parsed.data.description ?? null,
        introMarkdown: parsed.data.introMarkdown ?? null,
        isActive: parsed.data.isActive ?? true,
        order: nextOrder,
      },
    });
    return ok(mapArchiveTab(created), { status: 201 });
  } catch (error) {
    if (isArchiveRuntimeError(error)) {
      return archiveRuntimeFailResponse();
    }
    return fail("INVALID_INPUT", "Kunde inte skapa arkivflik. Kontrollera slug och falt.", 400);
  }
}

