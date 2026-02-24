import { requireServerUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { NewsManager } from "@/components/admin/news-manager";

export default async function AdminNewsPage() {
  await requireServerUser(["admin"]);
  const rows = await db.newsPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, slug: true, title: true, status: true, createdAt: true },
  });

  return (
    <NewsManager
      initialRows={rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
