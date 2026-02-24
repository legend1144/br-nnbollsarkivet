"use client";

import { useState } from "react";

type EventRow = {
  id: string;
  title: string;
  eventType: "training" | "match";
  startAt: string;
  endAt: string;
  location: string | null;
};

type Props = {
  initialRows: EventRow[];
};

export function CalendarManager({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<"training" | "match">("training");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function createEvent() {
    setMessage("");
    const cleanTitle = title.trim();
    if (cleanTitle.length < 2) {
      setMessage("Ange en titel med minst 2 tecken.");
      return;
    }
    if (!startAt || !endAt) {
      setMessage("Ange bade start- och sluttid.");
      return;
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
      setMessage("Ogiltigt datumformat.");
      return;
    }
    if (endDate.getTime() <= startDate.getTime()) {
      setMessage("Sluttid maste vara efter starttid.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          eventType,
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          location: location.trim() || null,
          description: description.trim() || null,
        }),
      });
      const payload = (await response.json()) as { data?: EventRow; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        setMessage(payload.error?.message ?? "Kunde inte publicera handelsen.");
        return;
      }
      setRows((current) => [...current, payload.data!].sort((a, b) => a.startAt.localeCompare(b.startAt)));
      setTitle("");
      setStartAt("");
      setEndAt("");
      setLocation("");
      setDescription("");
      setMessage("Handelse publicerad.");
    } catch {
      setMessage("Kunde inte publicera handelsen.");
    } finally {
      setLoading(false);
    }
  }

  async function removeEvent(id: string) {
    setDeletingId(id);
    setMessage("");
    try {
      const response = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setMessage("Kunde inte ta bort handelsen.");
        return;
      }
      setRows((current) => current.filter((row) => row.id !== id));
      setMessage("Handelse borttagen.");
    } catch {
      setMessage("Kunde inte ta bort handelsen.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="panel panel-row p-5">
      <h1 className="text-2xl font-bold">Kalender</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input className="input" placeholder="Titel" value={title} onChange={(event) => setTitle(event.target.value)} />
        <select className="input" value={eventType} onChange={(event) => setEventType(event.target.value as "training" | "match")}>
          <option value="training">training</option>
          <option value="match">match</option>
        </select>
        <input className="input" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
        <input className="input" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
        <input className="input md:col-span-2 xl:col-span-2" placeholder="Plats" value={location} onChange={(event) => setLocation(event.target.value)} />
        <textarea className="input md:col-span-2 xl:col-span-4" placeholder="Beskrivning" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button className="btn-primary" type="button" onClick={createEvent} disabled={loading}>
          {loading ? "Publicerar..." : "Publicera handelse"}
        </button>
        {message && <p className="text-sm text-cyan-200">{message}</p>}
      </div>

      <ul className="admin-list mt-5 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="admin-row card-minimal rounded-sm border border-slate-700/80 p-3">
            <div>
              <p className="font-medium">{row.title}</p>
              <p className="text-xs text-slate-400">{row.eventType} - {new Date(row.startAt).toLocaleString("sv-SE")}</p>
            </div>
            <button className="btn-secondary" type="button" onClick={() => removeEvent(row.id)} disabled={deletingId === row.id}>
              {deletingId === row.id ? "Tar bort..." : "Ta bort"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}


