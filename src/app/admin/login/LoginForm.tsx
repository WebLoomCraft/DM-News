"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Lock, Mail } from "lucide-react";
import { api } from "@/lib/admin-api";

const DEMO_HINT = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS !== "false";

export default function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetResult, setResetResult] = useState<{ message: string; resetUrl?: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", json: form });
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ message: string; resetUrl?: string }>("/api/auth/password-reset", {
        method: "POST",
        json: { email: resetEmail },
      });
      setResetResult({ message: data.message, resetUrl: data.resetUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the reset");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#07101f] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center bg-[var(--accent)] font-cond text-xl font-bold text-white">DM</span>
          <h1 className="mt-4 font-display text-2xl font-bold text-white">DM News Network</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">Newsroom sign in</p>
        </div>

        <div className="border border-white/10 bg-white p-6 shadow-2xl">
          {showReset ? (
            <form onSubmit={requestReset} className="space-y-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-800">Reset password</h2>
                <p className="mt-1 text-xs text-slate-500">Enter your newsroom email and we will issue a reset link.</p>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0b1b33]"
                    placeholder="you@dmnewsnetwork.com"
                  />
                </div>
              </label>
              {resetResult ? (
                <div className="border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <p>{resetResult.message}</p>
                  {resetResult.resetUrl ? (
                    <>
                      <p className="mt-2 font-semibold text-slate-700">Reset link (no mail provider configured):</p>
                      <a href={resetResult.resetUrl} className="mt-1 block break-all text-[var(--accent)] underline">
                        {resetResult.resetUrl}
                      </a>
                    </>
                  ) : null}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 bg-[#0b1b33] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12294a] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send reset link
              </button>
              <button type="button" onClick={() => { setShowReset(false); setResetResult(null); }} className="w-full text-center text-xs text-slate-500 underline">
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error ? (
                <p className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                </p>
              ) : null}
              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0b1b33]"
                    placeholder="you@dmnewsnetwork.com"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Password</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0b1b33]"
                    placeholder="••••••••"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sign in to newsroom
              </button>
              <button type="button" onClick={() => setShowReset(true)} className="w-full text-center text-xs text-slate-500 underline">
                Forgot password?
              </button>
            </form>
          )}
        </div>

        {DEMO_HINT && !showReset ? (
          <div className="mt-4 border border-white/10 bg-white/5 p-4 text-xs text-white/55">
            <p className="font-semibold uppercase tracking-[0.12em] text-white/70">Seeded preview accounts</p>
            <ul className="mt-2 space-y-1 font-mono">
              <li>admin@dmnewsnetwork.com — DMnews@2026 (Super Admin)</li>
              <li>newsroom@dmnewsnetwork.com — Newsroom@2026 (Admin)</li>
              <li>editor@dmnewsnetwork.com — Editor@2026 (Editor)</li>
              <li>reporter@dmnewsnetwork.com — Reporter@2026 (Author)</li>
            </ul>
            <p className="mt-2 text-white/35">Change these passwords immediately after first sign-in. Hide this panel with NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false.</p>
          </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-white/35">
          <Link href="/" className="underline hover:text-white">
            ← Back to the website
          </Link>
        </p>
      </div>
    </div>
  );
}
