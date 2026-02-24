import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { archiveCreateSchema } from "@/lib/validation";

type Context = {
  params: Promise<{ slug: string }>;
};

// Legacy endpoint: retained for backward compatibility while archive tabs migrate.
export async function GET(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  const { slug } = await context.params;
  const article = await db.archiveArticle.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!article) {
    return fail("NOT_FOUND", "Artikeln hittades inte.", 404);
  }
  if (auth.user!.role !== "admin" && article.status !== "published") {
    return fail("NOT_FOUND", "Artikeln hittades inte.", 404);
  }

  return ok(article);
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  const { slug } = await context.params;
  const existing = await db.archiveArticle.findUnique({ where: { slug } });
  if (!existing) {
    return fail("NOT_FOUND", "Artikeln hittades inte.", 404);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("INVALID_INPUT", "Felaktig payload.", 400);
  }
  const parsed = archiveCreateSchema.partial().safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Ogiltiga arkivfält.", 400, parsed.error.flatten());
  }

  const tags = parsed.data.tags
    ? Array.from(new Set(parsed.data.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)))
    : undefined;

  const updated = await db.archiveArticle.update({
    where: { slug },
    data: {
      title: parsed.data.title ?? undefined,
      content: parsed.data.content ?? undefined,
      category: parsed.data.category ?? undefined,
      status: parsed.data.status ?? undefined,
      publishedAt:
        parsed.data.status === "published" && existing.publishedAt == null
          ? new Date()
          : existing.publishedAt,
      tags:
        tags !== undefined
          ? {
              deleteMany: {},
              create: tags.map((name) => ({
                tag: {
                  connectOrCreate: {
                    where: { name },
                    create: { name },
                  },
                },
              })),
            }
          : undefined,
    },
    include: {
      tags: { include: { tag: true } },
    },
  });

  return ok(updated);
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  const { slug } = await context.params;
  await db.archiveArticle.delete({
    where: { slug },
  });
  return ok({ ok: true });
}
