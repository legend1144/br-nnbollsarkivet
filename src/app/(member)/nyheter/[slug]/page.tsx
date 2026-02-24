import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireServerUser } from "@/lib/auth/guards";
import { formatStockholm } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function NyhetPage({ params }: PageProps) {
  const user = await requireServerUser();
  const { slug } = await params;

  const post = await db.newsPost.findUnique({
    where: { slug },
    include: { author: true },
  });

  if (!post) notFound();
  if (user.role !== "admin" && post.status !== "published") notFound();

  return (
    <section className="view-stack">
      <PageHeader
        eyebrow={`Nyhet / ${post.status}`}
        title={post.title}
        description={`${formatStockholm(post.publishedAt ?? post.createdAt)} av ${post.author.name ?? post.author.email}`}
      />
      <article className="panel panel--elevated panel-row p-6">
        {post.excerpt && <p className="text-lg text-slate-200">{post.excerpt}</p>}
        <div className="prose prose-invert mt-6 max-w-none whitespace-pre-wrap text-slate-100">{post.content}</div>
      </article>
    </section>
  );
}
