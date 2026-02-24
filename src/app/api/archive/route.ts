import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { buildUniqueSlug } from "@/lib/content";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { archiveCreateSchema } from "@/lib/validation";

// Legacy endpoint: retained for backward compatibility while archive tabs migrate.
export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("query")?.trim();
  const category = searchParams.get("category")?.trim();
  const tag = searchParams.get("tag")?.trim();

  const where = {
    status: auth.user!.role === "admin" ? undefined : ("published" as const),
    category: category || undefined,
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { content: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(tag
      ? {
          tags: {
            some: {
              tag: {
                name: { equals: tag, mode: "insensitive" as const },
              },
            },
          },
        }
      : {}),
  };

  const articles = await db.archiveArticle.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { id: true, name: true, email: true } },
      tags: {
        include: { tag: true },
      },
    },
  });

  return ok(articles);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("INVALID_INPUT", "Felaktig payload.", 400);
  }
  const parsed = archiveCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Ogiltiga arkivfält.", 400, parsed.error.flatten());
  }

  const slug = await buildUniqueSlug(parsed.data.title, "archive");
  const tags = Array.from(new Set(parsed.data.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)));

  const created = await db.archiveArticle.create({
    data: {
      slug,
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category,
      status: parsed.data.status,
      publishedAt: parsed.data.status === "published" ? new Date() : null,
      authorId: auth.user!.id,
      tags: {
        create: tags.map((name) => ({
          tag: {
            connectOrCreate: {
              where: { name },
              create: { name },
            },
          },
        })),
      },
    },
    include: {
      tags: { include: { tag: true } },
    },
  });

  return ok(created, { status: 201 });
}
