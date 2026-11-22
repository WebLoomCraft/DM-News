"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: event.target.value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.name.trim().length < 2) nextErrors.name = "Please enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email)) nextErrors.email = "Please enter a valid email address";
    if (form.message.trim().length < 10) nextErrors.message = "Please write at least 10 characters";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Could not send your message.");
        return;
      }
      setStatus("success");
      setMessage(data.message || "Message sent.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  const field =
    "w-full border border-[#d5dae2] bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent)]";

  return (
    <form onSubmit={submit} noValidate className="border border-[#e3e7ee] bg-white p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="kicker block pb-1.5 text-[#5b6779]">
            Your name *
          </label>
          <input id="cf-name" value={form.name} onChange={update("name")} className={field} autoComplete="name" />
          {errors.name ? <p className="mt-1 text-xs text-red-700">{errors.name}</p> : null}
        </div>
        <div>
          <label htmlFor="cf-email" className="kicker block pb-1.5 text-[#5b6779]">
            Email *
          </label>
          <input id="cf-email" type="email" value={form.email} onChange={update("email")} className={field} autoComplete="email" />
          {errors.email ? <p className="mt-1 text-xs text-red-700">{errors.email}</p> : null}
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="cf-subject" className="kicker block pb-1.5 text-[#5b6779]">
          Subject
        </label>
        <input id="cf-subject" value={form.subject} onChange={update("subject")} className={field} />
      </div>
      <div className="mt-4">
        <label htmlFor="cf-message" className="kicker block pb-1.5 text-[#5b6779]">
          Message *
        </label>
        <textarea id="cf-message" rows={6} value={form.message} onChange={update("message")} className={field} />
        {errors.message ? <p className="mt-1 text-xs text-red-700">{errors.message}</p> : null}
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="kicker mt-5 inline-flex items-center gap-2 bg-[var(--ink)] px-7 py-3 text-white transition-colors hover:bg-[var(--brand)] disabled:opacity-60"
      >
        {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Send message
      </button>
      {message ? (
        <p
          role="status"
          className={`mt-4 flex items-center gap-2 text-sm ${status === "success" ? "text-emerald-700" : "text-red-700"}`}
        >
          {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : null}
          {message}
        </p>
      ) : null}
    </form>
  );
}
