"use client";

import { useState } from "react";

type NewsRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  createdAt: string;
};

type Props = {
  initialRows: NewsRow[];
};

export function NewsManager({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  function normalizeRow(input: NewsRow | Record<string, unknown>): NewsRow {
    const row = input as {
      id: string;
      slug: string;
      title: string;
      status: "draft" | "published";
      createdAt: string | Date;
    };
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    };
  }

  async function createPost() {
    setMessage("");
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (cleanTitle.length < 3) {
      setMessage("Titel maste vara minst 3 tecken.");
      return;
    }
    if (cleanContent.length < 20) {
      setMessage("Artikelinnehall maste vara minst 20 tecken.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleanTitle, content: cleanContent, status: "published" }),
      });
      const payload = (await response.json()) as { data?: NewsRow; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        setMessage(payload.error?.message ?? "Kunde inte skapa nyhet.");
        return;
      }
      setRows((current) => [normalizeRow(payload.data!), ...current]);
      setTitle("");
      setContent("");
      setMessage("Nyhet publicerad.");
    } catch {
      setMessage("Kunde inte skapa nyhet.");
    } finally {
      setLoading(false);
    }
  }

  async function removePost(slug: string) {
    setDeletingSlug(slug);
    setMessage("");
    try {
      const response = await fetch(`/api/news/${slug}`, { method: "DELETE" });
      if (!response.ok) {
        setMessage("Kunde inte ta bort nyhet.");
        return;
      }
      setRows((current) => current.filter((row) => row.slug !== slug));
      setMessage("Nyhet borttagen.");
    } catch {
      setMessage("Kunde inte ta bort nyhet.");
    } finally {
      setDeletingSlug(null);
    }
  }

  async function updateStatus(slug: string, status: "draft" | "published") {
    setPublishingSlug(slug);
    setMessage("");
    try {
      const response = await fetch(`/api/news/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as { data?: NewsRow; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        setMessage(payload.error?.message ?? "Kunde inte uppdatera publiceringsstatus.");
        return;
      }
      const next = normalizeRow(payload.data);
      setRows((current) => current.map((row) => (row.slug === slug ? { ...row, status: next.status } : row)));
      setMessage(status === "published" ? "Nyhet publicerad." : "Nyhet avpublicerad.");
    } catch {
      setMessage("Kunde inte uppdatera publiceringsstatus.");
    } finally {
      setPublishingSlug(null);
    }
  }

  return (
    <section className="panel panel-row p-5">
      <h1 className="text-2xl font-bold">Nyheter</h1>
      <div className="mt-4 grid gap-3">
        <input className="input" placeholder="Titel" value={title} onChange={(event) => setTitle(event.target.value)} />
        <textarea
          className="input min-h-40"
          placeholder="Artikelinnehall"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <button
          className="btn-primary w-full md:w-fit"
          type="button"
          onClick={createPost}
          disabled={loading}
        >
          {loading ? "Publicerar..." : "Publicera nyhet"}
        </button>
        {message && <p className="text-sm text-cyan-200">{message}</p>}
      </div>

      <ul className="admin-list mt-5 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="admin-row card-minimal rounded-sm border border-slate-700/80 p-3">
            <div>
              <p className="font-medium">{row.title}</p>
              <p className="text-xs text-slate-400">{row.status} - {new Date(row.createdAt).toLocaleString("sv-SE")}</p>
            </div>
            <div className="admin-row__actions inline-actions">
              {row.status === "draft" ? (
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => updateStatus(row.slug, "published")}
                  disabled={publishingSlug === row.slug}
                >
                  {publishingSlug === row.slug ? "Publicerar..." : "Publicera"}
                </button>
              ) : (
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => updateStatus(row.slug, "draft")}
                  disabled={publishingSlug === row.slug}
                >
                  {publishingSlug === row.slug ? "Uppdaterar..." : "Avpublicera"}
                </button>
              )}
              <button className="btn-secondary" type="button" onClick={() => removePost(row.slug)} disabled={deletingSlug === row.slug}>
                {deletingSlug === row.slug ? "Tar bort..." : "Ta bort"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}


