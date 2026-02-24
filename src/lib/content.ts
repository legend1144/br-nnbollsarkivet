import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function buildUniqueSlug(baseTitle: string, type: "news" | "archive") {
  const base = slugify(baseTitle) || "artikel";
  const lookup =
    type === "news"
      ? async (slug: string) => db.newsPost.findUnique({ where: { slug }, select: { id: true } })
      : async (slug: string) => db.archiveArticle.findUnique({ where: { slug }, select: { id: true } });

  let current = base;
  let suffix = 1;
  while (await lookup(current)) {
    suffix += 1;
    current = `${base}-${suffix}`;
  }
  return current;
}
