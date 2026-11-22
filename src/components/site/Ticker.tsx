import Link from "next/link";
import type { ArticleSummary } from "@/lib/queries";

export function Ticker({
  items,
  label,
  speed,
  liveHref,
  showLive,
}: {
  items: ArticleSummary[];
  label: string;
  speed: number;
  liveHref?: string | null;
  showLive?: boolean;
}) {
  if (!items.length) return null;
  const loop = [...items, ...items];
  const duration = Math.max(20, Math.round((items.length * 800) / Math.max(10, speed)));

  return (
    <div className="ticker-wrap relative z-30 flex items-stretch border-y border-[#0a1526] bg-[var(--ink)] text-white">
      <div className="flex shrink-0 items-center gap-2 bg-[var(--accent)] px-3 py-2 sm:px-4">
        <span aria-hidden className="live-dot inline-block h-2 w-2 rounded-full bg-white" />
        <span className="kicker text-[0.68rem] text-white sm:text-[0.72rem]">{label}</span>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden py-2">
        <div className="ticker-track" style={{ animationDuration: `${duration}s` }}>
          {loop.map((item, index) => (
            <Link
              key={`${item.id}-${index}`}
              href={`/news/${item.slug}`}
              className="mx-4 inline-flex max-w-[70vw] items-center gap-2 truncate text-[0.85rem] text-white/85 hover:text-white sm:mx-6 sm:text-sm"
            >
              <span aria-hidden className="inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="truncate">{item.title}</span>
            </Link>
          ))}
        </div>
      </div>
      {showLive && liveHref ? (
        <Link
          href={liveHref}
          className="hidden shrink-0 items-center gap-2 border-l border-white/10 px-4 text-[0.7rem] uppercase tracking-[0.14em] text-white/70 hover:text-white md:flex"
        >
          <span aria-hidden className="live-dot inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
          Live
        </Link>
      ) : null}
    </div>
  );
}
