import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { buildUniqueSlug } from "@/lib/content";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { newsCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  const where = auth.user!.role === "admin" ? {} : { status: "published" as const };
  const posts = await db.newsPost.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });
  return ok(posts);
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
  const parsed = newsCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Ogiltiga nyhetsfalt.", 400, parsed.error.flatten());
  }

  const payloadStatus =
    payload && typeof payload === "object" && "status" in payload
      ? (payload as { status?: unknown }).status
      : undefined;
  const status = payloadStatus === "draft" || payloadStatus === "published" ? payloadStatus : "published";

  const slug = await buildUniqueSlug(parsed.data.title, "news");
  const post = await db.newsPost.create({
    data: {
      slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content,
      coverImageUrl: parsed.data.coverImageUrl,
      status,
      publishedAt: status === "published" ? new Date() : null,
      authorId: auth.user!.id,
    },
  });

  revalidatePath("/nyheter");
  revalidatePath("/admin/news");

  return ok(post, { status: 201 });
}
