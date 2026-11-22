"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewsletterForm({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.message || data.error || "Subscription failed.");
        return;
      }
      setStatus("success");
      setMessage(data.message || "Subscribed.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  const dark = variant === "dark";

  return (
    <form onSubmit={submit} className="w-full">
      <div className={cn("flex flex-col gap-2 sm:flex-row", dark ? "" : "")}>
        <label className="sr-only" htmlFor={`newsletter-${variant}`}>
          Email address
        </label>
        <input
          id={`newsletter-${variant}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className={cn(
            "min-w-0 flex-1 border px-4 py-3 text-sm outline-none transition-colors",
            dark
              ? "border-white/20 bg-white/10 text-white placeholder:text-white/45 focus:border-white/60"
              : "border-[#d5dae2] bg-white text-[var(--ink)] placeholder:text-[#9aa4b2] focus:border-[var(--accent)]",
          )}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={cn(
            "kicker inline-flex shrink-0 items-center justify-center gap-2 px-6 py-3 text-white transition-opacity disabled:opacity-60",
            dark ? "bg-[var(--accent)] hover:opacity-90" : "bg-[var(--ink)] hover:bg-[var(--brand)]",
          )}
        >
          {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Subscribe
        </button>
      </div>
      {message ? (
        <p
          className={cn(
            "mt-3 flex items-center gap-2 text-[0.8rem]",
            status === "success" ? (dark ? "text-emerald-300" : "text-emerald-700") : dark ? "text-red-200" : "text-red-700",
          )}
          role="status"
        >
          {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : null}
          {message}
        </p>
      ) : (
        <p className={cn("mt-3 text-[0.75rem]", dark ? "text-white/50" : "text-[#6b7686]")}>
          We only use your address to send the briefing. Unsubscribe any time.
        </p>
      )}
    </form>
  );
}
