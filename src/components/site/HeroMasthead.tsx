import Link from "next/link";
import { ArrowUpRight, Radio, Zap } from "lucide-react";
import type { ArticleSummary } from "@/lib/queries";
import type { SettingsRow } from "@/db/schema";
import { Logo3D } from "@/components/brand/Logo3D";
import { formatDate, timeAgo } from "@/lib/utils";

/**
 * HeroMasthead — the front page's opening statement.
 *
 * Left: a live "newsroom deck" with the animated 3D emblem, the strapline and
 * a small live-metrics rail. Right: the lead story rendered as an editorial
 * card. Everything degrades to a single column on mobile.
 */
export function HeroMasthead({
  settings,
  lead,
  secondary,
  liveHref,
  stats,
}: {
  settings: SettingsRow;
  lead?: ArticleSummary;
  secondary: ArticleSummary[];
  liveHref: string | null;
  stats: { published: number; sections: number };
}) {
  const today = formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <section className="hero-shell relative isolate overflow-hidden border-b border-[#dde3ec]">
      {/* layered background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_18%_-10%,color-mix(in_srgb,var(--brand)_16%,transparent),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_88%_0%,color-mix(in_srgb,var(--accent)_13%,transparent),transparent_58%)]" />
        <div className="hero-grid absolute inset-0 opacity-[0.55]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f5f6f8] to-transparent" />
      </div>

      <div className="container-site grid items-center gap-8 py-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:gap-14 lg:py-14">
        {/* ---------------- left: the newsroom deck ---------------- */}
        <div className="hero-copy min-w-0">
          <p className="hero-eyebrow kicker inline-flex items-center gap-2 border border-[#d7dee9] bg-white/70 px-2.5 py-1.5 text-[0.56rem] leading-tight text-[#4a5563] backdrop-blur sm:text-[0.6rem]">
            <span aria-hidden className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            <span>Live desk</span>
            <span aria-hidden className="hidden text-[#9aa4b2] sm:inline">·</span>
            <span className="hidden sm:inline">{today}</span>
          </p>

          <div className="mt-6 flex items-center gap-5">
            <Logo3D
              href="/"
              variant="hero"
              wordmark={settings.logoWordmark || "DM News"}
              tagline="Independent · Verified · 24/7"
              markClassName="shrink-0"
              className="logo3d--masthead items-start"
            />
          </div>

          <p className="mt-5 max-w-xl border-l-[3px] border-[var(--accent)] pl-3.5 font-display text-[0.98rem] leading-relaxed text-[#3c4757] sm:mt-6 sm:pl-4 sm:text-[1.08rem]">
            {settings.siteDescription ||
              "Verified breaking news from Pakistan and the world — politics, business, technology, sport and culture, reported as it happens."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-7">
            <Link
              href="/latest"
              className="group inline-flex items-center gap-2 bg-[var(--ink)] px-5 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[var(--brand)]"
            >
              <Zap className="h-3.5 w-3.5" aria-hidden />
              Read the latest
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </Link>
            {liveHref ? (
              <Link
                href={liveHref}
                className="inline-flex items-center gap-2 border border-[var(--accent)] px-5 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white"
              >
                <Radio className="h-3.5 w-3.5" aria-hidden />
                {settings.watchLiveLabel}
              </Link>
            ) : (
              <Link
                href="/videos"
                className="inline-flex items-center gap-2 border border-[#cfd6e1] bg-white/70 px-5 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#2c3644] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
              >
                Video reports
              </Link>
            )}
          </div>

          <dl className="mt-7 grid w-full max-w-xl grid-cols-3 divide-x divide-[#dde3ec] border-y border-[#dde3ec] bg-white/55 backdrop-blur sm:mt-9">
            {[
              { label: "Stories online", value: stats.published },
              { label: "Sections", value: stats.sections },
              { label: "Since 2026", value: "24/7" },
            ].map((item) => (
              <div key={item.label} className="px-3 py-4 first:pl-4">
                <dd className="font-cond text-[2rem] font-bold leading-none text-[var(--ink)] sm:text-[2.15rem]">{item.value}</dd>
                <dt className="kicker mt-1.5 text-[0.5rem] leading-tight text-[#8b95a3] sm:text-[0.54rem]">{item.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* ---------------- right: lead story ---------------- */}
        {lead ? (
          <div className="hero-lead min-w-0">
            <article className="group relative">
              <Link href={`/news/${lead.slug}`} className="block overflow-hidden">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0d1a2d]">
                  {lead.featuredImageUrl ? (
                    <img
                      src={lead.featuredImageUrl}
                      alt={lead.imageAlt || lead.title}
                      width={1200}
                      height={750}
                      fetchPriority="high"
                      decoding="async"
                      className="img-zoom h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-[linear-gradient(135deg,#0b1b33,#12294a)]" />
                  )}
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(4,10,20,0.7),transparent_52%)]" />
                  <span className="absolute left-4 top-4 kicker inline-flex items-center gap-1.5 bg-[var(--accent)] px-2 py-1 text-[0.58rem] text-white">
                    <span aria-hidden className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-white" />
                    Top story
                  </span>
                </div>
              </Link>
              <div className="relative -mt-16 px-4 sm:px-6">
                <div className="border border-[#e3e7ee] bg-white p-5 shadow-[0_18px_40px_-24px_rgba(7,16,31,0.45)] sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {lead.category ? (
                      <span className="kicker text-[0.6rem]" style={{ color: lead.category.color || "var(--accent)" }}>
                        {lead.category.name}
                      </span>
                    ) : null}
                    <span className="text-[0.66rem] uppercase tracking-[0.1em] text-[#9aa4b2]">
                      {lead.publishedAt ? timeAgo(lead.publishedAt) : ""}
                    </span>
                  </div>
                  <h1 className="headline mt-2 text-[clamp(1.4rem,2.6vw,2rem)]">
                    <Link href={`/news/${lead.slug}`} className="hover:text-[var(--accent)]">
                      {lead.title}
                    </Link>
                  </h1>
                  {lead.excerpt ? (
                    <p className="mt-2.5 line-clamp-2 text-[0.9rem] leading-relaxed text-[#5b6779]">{lead.excerpt}</p>
                  ) : null}
                  <Link
                    href={`/news/${lead.slug}`}
                    className="kicker mt-4 inline-flex items-center gap-1.5 text-[var(--accent)] hover:gap-2.5 transition-all"
                  >
                    Full story <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>

                {secondary.length ? (
                  <ul className="mt-4 divide-y divide-[#e3e7ee] border-y border-[#e3e7ee] bg-white/70">
                    {secondary.slice(0, 2).map((item) => (
                      <li key={item.id}>
                        <Link href={`/news/${item.slug}`} className="group flex items-start gap-3 px-4 py-3">
                          <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rotate-45 bg-[var(--accent)]" />
                          <span className="min-w-0">
                            <span className="line-clamp-2 block text-[0.9rem] font-semibold leading-snug group-hover:text-[var(--accent)]">
                              {item.title}
                            </span>
                            <span className="kicker mt-1 block text-[0.54rem] text-[#9aa4b2]">
                              {item.category?.name ?? "News"} · {item.publishedAt ? timeAgo(item.publishedAt) : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}
