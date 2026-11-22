import Link from "next/link";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  href,
  linkLabel = "View all",
  className,
  accent,
  tone = "light",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  accent?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "mb-5 flex items-end justify-between gap-4 border-b-2 pb-2",
        dark ? "border-white/25" : "border-[var(--ink)]",
        className,
      )}
    >
      <h2 className={cn("section-title flex items-center gap-2 text-[1.05rem] sm:text-[1.2rem]", dark ? "text-white" : "text-[var(--ink)]")}>
        <span aria-hidden className="inline-block h-[18px] w-[4px]" style={{ background: accent || "var(--accent)" }} />
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className={cn(
            "kicker shrink-0 border-b border-transparent pb-0.5 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]",
            dark ? "text-white/55" : "text-[#5b6779]",
          )}
        >
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, hint, className }: { title: string; hint?: string; className?: string }) {
  return (
    <div className={cn("border border-dashed border-[#d5dae2] bg-white px-6 py-10 text-center", className)}>
      <p className="font-cond text-sm uppercase tracking-[0.14em] text-[#8b95a3]">Nothing published yet</p>
      <p className="headline mt-2 text-lg text-[var(--ink)]">{title}</p>
      {hint ? <p className="mx-auto mt-2 max-w-md text-sm text-[#5b6779]">{hint}</p> : null}
    </div>
  );
}
