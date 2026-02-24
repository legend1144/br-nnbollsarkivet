"use client";

import { useMemo, useState } from "react";

type AllowlistRow = {
  id: string;
  email: string;
  active: boolean;
  createdAt: string;
};

type Props = {
  initialRows: AllowlistRow[];
};

export function AllowlistManager({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const activeCount = useMemo(() => rows.filter((row) => row.active).length, [rows]);

  async function addEmail() {
    if (!email) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { data?: AllowlistRow; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        setMessage(payload.error?.message ?? "Kunde inte lagga till e-post.");
        return;
      }
      setRows((current) => {
        const withoutDuplicate = current.filter((row) => row.id !== payload.data!.id);
        return [payload.data!, ...withoutDuplicate];
      });
      setEmail("");
      setMessage("E-post tillagd.");
    } catch {
      setMessage("Kunde inte lagga till e-post.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const response = await fetch(`/api/admin/allowlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!response.ok) return;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, active } : row)));
  }

  async function removeRow(id: string) {
    const response = await fetch(`/api/admin/allowlist/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <section className="panel panel-row p-5">
      <h1 className="text-2xl font-bold">Allowlist e-post</h1>
      <p className="mt-2 text-slate-300">Aktiva adresser: {activeCount}</p>

      <div className="mt-4 flex flex-wrap gap-2 xl:items-end">
        <input
          className="input min-w-[260px] flex-1"
          placeholder="fornamn@forening.se"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button className="btn-primary" type="button" onClick={addEmail} disabled={loading}>
          {loading ? "Lagger till..." : "Lagg till"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-cyan-200">{message}</p>}

      <ul className="admin-list mt-4 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="admin-row card-minimal rounded-sm border border-slate-700/80 p-3">
            <div>
              <p className="font-medium">{row.email}</p>
              <p className="text-xs text-slate-400">{row.active ? "Aktiv adress" : "Inaktiv adress"}</p>
            </div>
            <div className="admin-row__actions flex items-center gap-2">
              <button className="btn-secondary" type="button" onClick={() => toggleActive(row.id, !row.active)}>
                {row.active ? "Inaktivera" : "Aktivera"}
              </button>
              <button className="btn-secondary" type="button" onClick={() => removeRow(row.id)}>
                Ta bort
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
