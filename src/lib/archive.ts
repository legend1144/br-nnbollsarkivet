import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { ArchiveRuntimeStatus, ArchiveTabDto } from "@/lib/ui-types";

type ArchiveTabRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  introMarkdown: string | null;
  order: number;
  isActive: boolean;
};

type ArchiveTabModel = {
  findMany: (args?: unknown) => Promise<ArchiveTabRecord[]>;
  findUnique: (args: unknown) => Promise<ArchiveTabRecord | null>;
  create: (args: unknown) => Promise<ArchiveTabRecord>;
  update: (args: unknown) => Promise<ArchiveTabRecord>;
  delete: (args: unknown) => Promise<ArchiveTabRecord>;
  count: (args?: unknown) => Promise<number>;
};

export type ArchivePrismaClient = {
  archiveTab?: ArchiveTabModel;
};

export type SafeArchiveResult<T> =
  | {
      ok: true;
      runtimeStatus: ArchiveRuntimeStatus;
      data: T;
    }
  | {
      ok: false;
      runtimeStatus: ArchiveRuntimeStatus;
      errorCode: "ARCHIVE_RUNTIME_NOT_READY";
      message: string;
    };

export type ArchiveRuntimeNotReady = {
  ok: false;
  runtimeStatus: "not_ready";
  errorCode: "ARCHIVE_RUNTIME_NOT_READY";
  message: string;
};

const runtimeErrorMessage =
  "Arkivets nya datamodell ar inte redo i denna miljo. Kor prisma:generate, prisma:migrate och archive:backfill-tabs.";

export function getArchivePrisma() {
  return db as unknown as ArchivePrismaClient;
}

export function isArchiveTabRuntimeReady() {
  const prisma = getArchivePrisma();
  return Boolean(prisma.archiveTab);
}

export function normalizeArchiveSlug(value: string | undefined, fallback: string) {
  return slugify(value?.trim() || fallback) || "flik";
}

export function isArchiveRuntimeError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: string; message?: string };
  const msg = String(record.message ?? "").toLowerCase();
  if (record.code === "P2021") return true;
  return (
    msg.includes("archivetab") ||
    msg.includes("does not exist") ||
    msg.includes("unknown arg") ||
    msg.includes("cannot read properties of undefined")
  );
}

export function archiveRuntimeNotReadyResult(): ArchiveRuntimeNotReady {
  return {
    ok: false,
    runtimeStatus: "not_ready",
    errorCode: "ARCHIVE_RUNTIME_NOT_READY",
    message: runtimeErrorMessage,
  };
}

export function mapArchiveTab(tab: ArchiveTabRecord): ArchiveTabDto {
  return {
    id: tab.id,
    slug: tab.slug,
    title: tab.title,
    description: tab.description ?? null,
    introMarkdown: tab.introMarkdown ?? null,
    order: tab.order,
    isActive: Boolean(tab.isActive),
  };
}

export async function safeListArchiveTabs(opts: { includeInactive: boolean }): Promise<SafeArchiveResult<ArchiveTabDto[]>> {
  const prisma = getArchivePrisma();
  if (!prisma.archiveTab) {
    return archiveRuntimeNotReadyResult();
  }
  try {
    const tabs = await prisma.archiveTab.findMany({
      where: opts.includeInactive ? {} : { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return {
      ok: true,
      runtimeStatus: "ready",
      data: tabs.map(mapArchiveTab),
    };
  } catch (error) {
    if (isArchiveRuntimeError(error)) {
      return archiveRuntimeNotReadyResult();
    }
    throw error;
  }
}
