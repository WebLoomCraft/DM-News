"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/admin-api";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/password-reset/confirm", { method: "POST", json: { token, password } });
      setDone(true);
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset the password");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="border border-white/10 bg-white p-6 text-center">
        <p className="text-sm font-semibold text-emerald-700">Password updated. Redirecting to the newsroom…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 border border-white/10 bg-white p-6">
      <div>
        <h1 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-800">Choose a new password</h1>
        <p className="mt-1 text-xs text-slate-500">Use at least 8 characters. You will be signed in automatically.</p>
      </div>
      {error ? <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        autoComplete="new-password"
        className="w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#0b1b33]"
      />
      <input
        type="password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        autoComplete="new-password"
        className="w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#0b1b33]"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Update password
      </button>
      <Link href="/admin/login" className="block text-center text-xs text-slate-500 underline">
        Back to sign in
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#07101f] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center bg-[var(--accent)] font-cond text-xl font-bold text-white">DM</span>
          <h2 className="mt-4 font-display text-xl font-bold text-white">Password reset</h2>
        </div>
        <Suspense fallback={<p className="text-center text-xs text-white/50">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
