"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Facebook, Instagram, Menu, Radio, Search, X, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo3D } from "@/components/brand/Logo3D";

export type NavItem = { label: string; href: string; enabled?: boolean };

export type SocialLink = { key: string; label: string; href: string };

export type HeaderData = {
  siteName: string;
  logoUrl: string | null;
  logoMarkText: string;
  logoWordmark: string;
  nav: NavItem[];
  watchLiveLabel: string;
  showSearchIcon: boolean;
  showWatchLiveButton: boolean;
  liveStreamUrl: string | null;
  liveStreamEnabled: boolean;
  showLiveIndicator: boolean;
  showLanguageSelector: boolean;
  socials: SocialLink[];
};

const SOCIAL_ICONS: Record<string, (props: { className?: string }) => React.ReactElement> = {
  facebook: (p) => <Facebook {...p} />,
  youtube: (p) => <Youtube {...p} />,
  instagram: (p) => <Instagram {...p} />,
  tiktok: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={p.className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.04.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 21.54a6.34 6.34 0 0 0 10.86-4.43V9.66a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-1.09z" />
    </svg>
  ),
  x: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={p.className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
};

function Logo({ data }: { data: HeaderData }) {
  // The 3D emblem replaces the flat image/wordmark. An admin-uploaded logoUrl
  // still wins, so a custom brand image can be restored from Settings any time.
  if (data.logoUrl) {
    return (
      <img
        src={data.logoUrl}
        alt={`${data.siteName} logo`}
        className="h-9 w-auto object-contain sm:h-11"
        width={180}
        height={44}
      />
    );
  }
  return (
    <Logo3D
      href="/"
      wordmark={data.logoWordmark || data.siteName}
      tagline="Independent newsroom"
      variant="header"
    />
  );
}

export default function SiteHeader({ data }: { data: HeaderData }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [now, setNow] = useState<string>("");
  const [lang, setLang] = useState<string>("en");
  const [scrolled, setScrolled] = useState(false);

  const nav = useMemo(() => data.nav.filter((n) => n.enabled !== false), [data.nav]);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      document.documentElement.style.setProperty("--dm-scroll", progress.toFixed(4));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const cookieLang = document.cookie.split("; ").find((c) => c.startsWith("dm_lang="))?.split("=")[1];
    if (cookieLang) setLang(cookieLang);
    const render = () => {
      const locale = (document.cookie.split("; ").find((c) => c.startsWith("dm_lang="))?.split("=")[1] || "en") === "ur" ? "ur-PK" : "en-GB";
      setNow(
        new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()),
      );
    };
    render();
    const id = window.setInterval(render, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const q = term.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
  };

  const switchLang = (value: string) => {
    setLang(value);
    document.cookie = `dm_lang=${value}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = value === "ur" ? "ur" : "en";
    const locale = value === "ur" ? "ur-PK" : "en-GB";
    setNow(new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()));
  };

  const liveHref = data.liveStreamUrl ? "/live" : null;

  return (
    <>
      {/* ---------- Top information bar ---------- */}
      <div className="hidden bg-[var(--ink)] text-white/75 md:block">
        <div className="container-site flex h-9 items-center justify-between gap-4 text-[0.72rem]">
          <div className="flex items-center gap-4">
            <span className="font-medium tracking-wide">{now}</span>
            {data.showLiveIndicator && liveHref ? (
              <Link href={liveHref} className="flex items-center gap-1.5 text-white/80 hover:text-white">
                <Radio className="h-3 w-3 text-[var(--accent)]" />
                <span className="uppercase tracking-[0.14em]">On air</span>
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {data.socials.map((social) => {
              const Icon = SOCIAL_ICONS[social.key];
              if (!Icon) return null;
              return (
                <a
                  key={social.key}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={social.label}
                  className="text-white/60 transition-colors hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              );
            })}
            {data.showLanguageSelector ? (
              <span className="ml-1 flex items-center gap-1 border-l border-white/15 pl-3">
                <button
                  type="button"
                  onClick={() => switchLang("en")}
                  className={cn("uppercase tracking-[0.12em] hover:text-white", lang === "en" ? "text-white" : "text-white/50")}
                >
                  EN
                </button>
                <span className="text-white/25">/</span>
                <button
                  type="button"
                  onClick={() => switchLang("ur")}
                  className={cn("uppercase tracking-[0.12em] hover:text-white", lang === "ur" ? "text-white" : "text-white/50")}
                >
                  اردو
                </button>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ---------- Main header ---------- */}
      <header
        className={cn(
          "sticky top-0 z-40 border-b bg-white/97 backdrop-blur transition-[border-color,box-shadow] duration-300",
          scrolled ? "border-[#e3e7ee] shadow-[0_10px_28px_-20px_rgba(7,16,31,0.6)]" : "border-[#e3e7ee]",
        )}
      >
        <div className={cn("container-site flex items-center justify-between gap-3 transition-[height] duration-300 sm:gap-4", scrolled ? "h-[62px] md:h-[70px]" : "h-16 md:h-[84px]")}>
          <div className="min-w-0 shrink [@media(min-width:768px)]:shrink-0">
            <Logo data={data} />
          </div>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {nav.slice(0, 9).map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={cn(
                    "kicker relative whitespace-nowrap px-2 py-2 text-[0.68rem] transition-colors xl:px-2.5 xl:text-[0.72rem]",
                    active ? "text-[var(--accent)]" : "text-[#2c3644] hover:text-[var(--accent)]",
                  )}
                >
                  {item.label}
                  {active ? <span aria-hidden className="absolute inset-x-2 -bottom-[1px] h-[2px] bg-[var(--accent)]" /> : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {data.showSearchIcon ? (
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Search the site"
                aria-expanded={searchOpen}
                className="grid h-9 w-9 place-items-center border border-[#e3e7ee] text-[#2c3644] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </button>
            ) : null}
            {data.showWatchLiveButton && liveHref ? (
              <Link
                href={liveHref}
                className="hidden items-center gap-2 whitespace-nowrap bg-[var(--accent)] px-3.5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90 xl:flex"
              >
                <span aria-hidden className="live-dot inline-block h-2 w-2 rounded-full bg-white" />
                {data.watchLiveLabel}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="grid h-9 w-9 place-items-center border border-[#e3e7ee] text-[#2c3644] lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>

        {searchOpen ? (
          <div className="border-t border-[#e3e7ee] bg-white">
            <form onSubmit={submitSearch} className="container-site flex items-center gap-3 py-3">
              <Search className="h-4 w-4 shrink-0 text-[#8b95a3]" />
              <input
                autoFocus
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search headlines, topics, tags…"
                className="w-full border-0 bg-transparent py-1 text-[0.95rem] outline-none placeholder:text-[#9aa4b2]"
                aria-label="Search"
              />
              <button type="submit" className="kicker shrink-0 bg-[var(--ink)] px-3 py-2 text-white hover:bg-[var(--brand)]">
                Search
              </button>
            </form>
          </div>
        ) : null}

        {/* Secondary nav strip on larger desktops */}
        <div className={cn("hidden border-t border-[#eef0f4] lg:block", scrolled && "lg:hidden")}>
          <div className="container-site flex items-center gap-5 overflow-x-auto py-2">
            {nav.slice(9).map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className="kicker shrink-0 text-[0.68rem] text-[#5b6779] hover:text-[var(--accent)]"
              >
                {item.label}
              </Link>
            ))}
            {data.showWatchLiveButton && liveHref ? (
              <Link href={liveHref} className="kicker ml-auto shrink-0 text-[0.68rem] text-[var(--accent)] sm:hidden">
                {data.watchLiveLabel}
              </Link>
            ) : null}
          </div>
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-[linear-gradient(90deg,var(--accent),color-mix(in_srgb,var(--accent)_40%,transparent))] transition-transform duration-150"
          style={{ transform: "scaleX(var(--dm-scroll,0))" }}
        />
      </header>

      {/* ---------- Mobile drawer ---------- */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-[rgba(7,16,31,0.55)]" onClick={() => setMenuOpen(false)} />
          <div className="fade-up absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e7eaf0] px-4 py-3">
              <span className="kicker text-[var(--ink)]">Menu</span>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="grid h-9 w-9 place-items-center border border-[#e3e7ee]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitSearch} className="flex items-center gap-2 border-b border-[#e7eaf0] px-4 py-3">
              <Search className="h-4 w-4 text-[#8b95a3]" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search…"
                aria-label="Search"
                className="w-full border-0 bg-transparent text-sm outline-none"
              />
            </form>
            <nav className="flex-1 overflow-y-auto px-2 py-2">
              {nav.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="block border-b border-[#f0f2f6] px-3 py-3 text-[0.95rem] font-medium text-[var(--ink)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-[#e7eaf0] p-4">
              {liveHref ? (
                <Link href={liveHref} className="flex items-center justify-center gap-2 bg-[var(--accent)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  <span aria-hidden className="live-dot inline-block h-2 w-2 rounded-full bg-white" />
                  {data.watchLiveLabel}
                </Link>
              ) : null}
              <div className="mt-4 flex items-center justify-center gap-4 text-[#5b6779]">
                {data.socials.map((social) => {
                  const Icon = SOCIAL_ICONS[social.key];
                  if (!Icon) return null;
                  return (
                    <a key={social.key} href={social.href} target="_blank" rel="noopener noreferrer nofollow" aria-label={social.label}>
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
