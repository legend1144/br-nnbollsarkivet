import { db } from "@/lib/db";
import { requireServerUser } from "@/lib/auth/guards";
import { formatStockholm } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

export default async function NyheterPage() {
  const user = await requireServerUser();
  const posts = await db.newsPost.findMany({
    where: user.role === "admin" ? {} : { status: "published" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { name: true, email: true } },
    },
  });

  return (
    <section className="view-stack">
      <PageHeader eyebrow="Nyheter" title="Nyhetsflode" description="Hall dig uppdaterad med de senaste nyheterna." />

      {posts.length === 0 ? (
        <p className="panel panel-row p-5 text-slate-300">Inga nyheter an.</p>
      ) : (
        <div className="view-stack-tight">
          {posts.map((post) => (
            <article key={post.id} className="panel panel--elevated panel-row p-5 reveal-up">
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {formatStockholm(post.publishedAt ?? post.createdAt)} av {post.author.name ?? post.author.email}
                {user.role === "admin" ? ` - ${post.status}` : ""}
              </p>
              {post.excerpt ? <p className="mt-3 text-slate-200">{post.excerpt}</p> : null}
              <div className="prose prose-invert mt-4 max-w-none whitespace-pre-wrap text-slate-100">{post.content}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
