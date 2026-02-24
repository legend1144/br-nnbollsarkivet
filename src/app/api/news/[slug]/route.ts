import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { newsCreateSchema } from "@/lib/validation";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  const { slug } = await context.params;
  const post = await db.newsPost.findUnique({
    where: { slug },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  if (!post) {
    return fail("NOT_FOUND", "Nyheten hittades inte.", 404);
  }
  if (auth.user!.role !== "admin" && post.status !== "published") {
    return fail("NOT_FOUND", "Nyheten hittades inte.", 404);
  }

  return ok(post);
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  const { slug } = await context.params;
  const existing = await db.newsPost.findUnique({ where: { slug } });
  if (!existing) {
    return fail("NOT_FOUND", "Nyheten hittades inte.", 404);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("INVALID_INPUT", "Felaktig payload.", 400);
  }
  const parsed = newsCreateSchema.partial().safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Ogiltiga nyhetsfalt.", 400, parsed.error.flatten());
  }

  const nextStatus = parsed.data.status ?? existing.status;
  let publishedAt = existing.publishedAt;
  if (nextStatus === "published" && existing.status !== "published") {
    publishedAt = new Date();
  }
  if (nextStatus === "draft") {
    publishedAt = null;
  }

  const post = await db.newsPost.update({
    where: { slug },
    data: {
      title: parsed.data.title ?? undefined,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content ?? undefined,
      coverImageUrl: parsed.data.coverImageUrl,
      status: nextStatus,
      publishedAt,
    },
  });

  revalidatePath("/nyheter");
  revalidatePath("/admin/news");

  return ok(post);
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  const { slug } = await context.params;
  await db.newsPost.delete({
    where: { slug },
  });

  revalidatePath("/nyheter");
  revalidatePath("/admin/news");

  return ok({ ok: true });
}
