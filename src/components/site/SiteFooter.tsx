import Link from "next/link";
import { ArrowUpRight, Facebook, Instagram, Youtube } from "lucide-react";
import type { Settings } from "@/lib/settings";
import { getFooterColumns, getNavItems, type FooterColumn, type NavItem } from "@/lib/settings";
import NewsletterForm from "./NewsletterForm";
import { Logo3D } from "@/components/brand/Logo3D";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.04.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 21.54a6.34 6.34 0 0 0 10.86-4.43V9.66a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-1.09z" />
    </svg>
  );
}

export default function SiteFooter({ settings }: { settings: Settings }) {
  const nav: NavItem[] = getNavItems(settings);
  const columns: FooterColumn[] = getFooterColumns(settings);
  const socials = [
    { key: "facebook", href: settings.facebookUrl, label: "Facebook", Icon: Facebook },
    { key: "tiktok", href: settings.tiktokUrl, label: "TikTok", Icon: TikTokIcon },
    { key: "youtube", href: settings.youtubeUrl, label: "YouTube", Icon: Youtube },
    { key: "instagram", href: settings.instagramUrl, label: "Instagram", Icon: Instagram },
  ].filter((s) => Boolean(s.href)) as Array<{ key: string; href: string; label: string; Icon: (p: { className?: string }) => React.ReactElement }>;

  return (
    <footer className="mt-16 bg-[var(--ink)] text-white/70">
      {settings.newsletterEnabled ? (
        <div className="border-b border-white/10">
          <div className="container-site grid gap-6 py-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="kicker text-[var(--accent)]">Newsletter</p>
              <h2 className="headline mt-2 text-2xl text-white sm:text-3xl">{settings.newsletterTitle}</h2>
              <p className="mt-2 max-w-lg text-sm text-white/60">{settings.newsletterDescription}</p>
            </div>
            <NewsletterForm variant="dark" />
          </div>
        </div>
      ) : null}

      <div className="container-site grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          {settings.logoUrl ? (
            <Link href="/" className="inline-flex items-center gap-2.5">
              <img src={settings.logoUrl} alt={`${settings.siteName} logo`} className="h-10 w-auto object-contain" width={160} height={40} />
              <span className="font-display text-xl font-bold text-white">{settings.logoWordmark}</span>
            </Link>
          ) : (
            <Logo3D
              href="/"
              tone="dark"
              wordmark={settings.logoWordmark || settings.siteName}
              tagline="Independent · Verified · 24/7"
            />
          )}
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">{settings.footerAbout}</p>
          {socials.length ? (
            <div className="mt-5 flex items-center gap-3">
              {socials.map(({ key, href, label, Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center border border-white/15 text-white/70 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          ) : null}
          {settings.contactEmail ? (
            <p className="mt-5 text-sm text-white/55">
              Newsroom:{" "}
              <a className="text-white/80 underline decoration-white/25 hover:text-white" href={`mailto:${settings.contactEmail}`}>
                {settings.contactEmail}
              </a>
            </p>
          ) : null}
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="kicker text-white">{column.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label + link.href}>
                  <Link href={link.href} className="text-sm text-white/55 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* WebLoom attribution — DM News Network is a WebLoom project. */}
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col items-start justify-between gap-4 py-7 sm:flex-row sm:items-center">
          <p className="text-sm text-white/55">
            <span className="font-semibold text-white">DM News Network</span> is a project of{" "}
            <a
              href="https://web-loom.vercel.app"
              target="_blank"
              rel="noopener"
              className="group inline-flex items-center gap-1.5 align-baseline font-semibold text-white underline decoration-[var(--accent)] decoration-2 underline-offset-4 transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              WebLoom
              <ArrowUpRight
                className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden
              />
              <span className="sr-only">(opens the WebLoom website in a new tab)</span>
            </a>
            .
          </p>
          <a
            href="https://web-loom.vercel.app"
            target="_blank"
            rel="noopener"
            className="kicker inline-flex shrink-0 items-center gap-2 border border-white/15 px-3.5 py-2 text-[0.58rem] text-white/60 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
          >
            Designed &amp; built by WebLoom
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </a>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[color-mix(in_srgb,var(--ink)_88%,#000)]">
        <div className="container-site flex flex-col items-start justify-between gap-3 py-5 text-xs text-white/45 sm:flex-row sm:items-center">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{settings.copyright}</span>
            <span aria-hidden className="hidden h-3 w-px bg-white/15 sm:inline-block" />
            <span className="text-white/35">Report an error: corrections are published with a timestamp.</span>
          </p>
          <nav className="flex flex-wrap items-center gap-4" aria-label="Footer legal">
            <Link href="/about" className="hover:text-white">
              About Us
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms &amp; Conditions
            </Link>
            <Link href="/admin" className="hover:text-white">
              Newsroom login
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
