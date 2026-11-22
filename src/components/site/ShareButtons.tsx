"use client";

import { useState } from "react";
import { Check, Facebook, Link2, Linkedin, MessageCircle, Printer, Twitter } from "lucide-react";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    { key: "facebook", label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, Icon: Facebook },
    { key: "x", label: "Share on X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, Icon: Twitter },
    { key: "whatsapp", label: "Share on WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, Icon: MessageCircle },
    { key: "linkedin", label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, Icon: Linkedin },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="kicker mr-1 text-[#8b95a3]">Share</span>
      {links.map(({ key, label, href, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="grid h-9 w-9 place-items-center border border-[#e3e7ee] text-[#3c4655] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        aria-label="Copy link"
        className="grid h-9 w-9 place-items-center border border-[#e3e7ee] text-[#3c4655] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        aria-label="Print this article"
        className="grid h-9 w-9 place-items-center border border-[#e3e7ee] text-[#3c4655] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <Printer className="h-4 w-4" />
      </button>
    </div>
  );
}
