"use client";

import { useState } from "react";

type ProfileFormProps = {
  initial: {
    name: string;
    strengths: string;
    weaknesses: string;
    otherInfo: string;
    profileImageUrl: string;
  };
};

export function ProfileForm({ initial }: ProfileFormProps) {
  const [name, setName] = useState(initial.name);
  const [strengths, setStrengths] = useState(initial.strengths);
  const [weaknesses, setWeaknesses] = useState(initial.weaknesses);
  const [otherInfo, setOtherInfo] = useState(initial.otherInfo);
  const [profileImageUrl, setProfileImageUrl] = useState(initial.profileImageUrl);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function saveProfile() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          strengths,
          weaknesses,
          otherInfo,
          profileImageUrl: profileImageUrl || null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        setStatus(payload.error?.message ?? "Kunde inte spara profil.");
        return;
      }
      setStatus("Profil sparad.");
    } catch {
      setStatus("Kunde inte spara profil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel panel--elevated panel-row p-5">
      <h2 className="text-2xl font-bold">Redigera profil</h2>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm text-slate-200">Namn</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span className="mb-2 block text-sm text-slate-200">Profilbild URL</span>
          <input
            className="input"
            value={profileImageUrl}
            onChange={(event) => setProfileImageUrl(event.target.value)}
            placeholder="https://..."
          />
        </label>
        <label>
          <span className="mb-2 block text-sm text-slate-200">Styrkor</span>
          <textarea className="input min-h-24" value={strengths} onChange={(event) => setStrengths(event.target.value)} />
        </label>
        <label>
          <span className="mb-2 block text-sm text-slate-200">Svagheter</span>
          <textarea className="input min-h-24" value={weaknesses} onChange={(event) => setWeaknesses(event.target.value)} />
        </label>
        <label className="xl:col-span-2">
          <span className="mb-2 block text-sm text-slate-200">Ovrigt</span>
          <textarea className="input min-h-28" value={otherInfo} onChange={(event) => setOtherInfo(event.target.value)} />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button className="btn-primary" type="button" onClick={saveProfile} disabled={loading}>
          {loading ? "Sparar..." : "Spara profil"}
        </button>
        {status && <p className="text-sm text-cyan-200">{status}</p>}
      </div>
    </div>
  );
}
