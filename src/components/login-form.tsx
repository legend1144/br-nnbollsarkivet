"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = {
  type: "idle" | "success" | "error";
  message?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function requestCode() {
    setLoading(true);
    setStatus({ type: "idle" });
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { data?: { message?: string } };
      if (!response.ok) {
        setStatus({ type: "error", message: "Kunde inte skicka kod just nu." });
        return;
      }
      setStep("code");
      setStatus({
        type: "success",
        message: payload.data?.message ?? "Om adressen ar godkand har en kod skickats.",
      });
    } catch {
      setStatus({ type: "error", message: "Kunde inte skicka kod just nu." });
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setStatus({ type: "idle" });

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setStatus({ type: "error", message: payload.error?.message ?? "Fel kod eller for manga forsok." });
        return;
      }
      setStatus({ type: "success", message: "Inloggning lyckades." });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setStatus({ type: "error", message: "Nagot gick fel vid verifiering." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel panel--elevated login-form w-full p-6 md:p-8">
      <h2 className="text-2xl font-bold">Logga in</h2>
      <p className="mt-2 text-slate-300 text-body">
        Steg {step === "email" ? "1 av 2" : "2 av 2"}: {step === "email" ? "ange e-post" : "verifiera kod"}.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-slate-200">E-post</span>
          <input
            className="input"
            type="email"
            placeholder="fornamn@forening.se"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading || step === "code"}
          />
        </label>

        {step === "code" ? (
          <label className="block">
            <span className="mb-2 block text-sm text-slate-200">Verifieringskod</span>
            <input
              className="input"
              type="text"
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={6}
              disabled={loading}
            />
          </label>
        ) : null}

        {status.message ? (
          <p className={`${status.type === "error" ? "text-red-300" : "text-cyan-200"} login-form__status text-body`}>{status.message}</p>
        ) : null}

        {step === "email" ? (
          <button type="button" className="btn-primary w-full" disabled={loading || !email} onClick={requestCode}>
            {loading ? "Skickar..." : "Skicka kod"}
          </button>
        ) : (
          <div className="login-form__actions grid gap-3">
            <button
              type="button"
              className="btn-secondary"
              disabled={loading}
              onClick={() => {
                setStep("email");
                setCode("");
                setStatus({ type: "idle" });
              }}
            >
              Andra e-post
            </button>
            <button type="button" className="btn-secondary" disabled={loading} onClick={requestCode}>
              Ny kod
            </button>
            <button type="button" className="btn-primary" disabled={loading || code.length < 6} onClick={verifyCode}>
              {loading ? "Verifierar..." : "Verifiera"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
