import type { ReactNode } from "react";
import { getSettings, getNavItems } from "@/lib/settings";
import { getBreakingArticles } from "@/lib/queries";
import SiteHeader, { type HeaderData, type SocialLink } from "@/components/site/SiteHeader";
import { Ticker } from "@/components/site/Ticker";
import SiteFooter from "@/components/site/SiteFooter";

export const dynamic = "force-dynamic";

export async function buildHeaderData(): Promise<HeaderData> {
  const settings = await getSettings();
  const socials: SocialLink[] = [
    { key: "facebook", label: "DM News Network on Facebook", href: settings.facebookUrl || "" },
    { key: "tiktok", label: "DM News Network on TikTok", href: settings.tiktokUrl || "" },
    { key: "youtube", label: "DM News Network on YouTube", href: settings.youtubeUrl || "" },
    { key: "x", label: "DM News Network on X", href: settings.xUrl || "" },
    { key: "instagram", label: "DM News Network on Instagram", href: settings.instagramUrl || "" },
  ].filter((s) => Boolean(s.href));

  return {
    siteName: settings.siteName,
    logoUrl: settings.logoUrl,
    logoMarkText: settings.logoMarkText,
    logoWordmark: settings.logoWordmark,
    nav: getNavItems(settings),
    watchLiveLabel: settings.watchLiveLabel,
    showSearchIcon: settings.showSearchIcon,
    showWatchLiveButton: settings.showWatchLiveButton,
    liveStreamUrl: settings.liveStreamUrl,
    liveStreamEnabled: settings.liveStreamEnabled,
    showLiveIndicator: settings.showLiveIndicator,
    showLanguageSelector: settings.showLanguageSelector,
    socials,
  };
}

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [settings, header, breaking] = await Promise.all([getSettings(), buildHeaderData(), getBreakingArticles(8)]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader data={header} />
      {settings.tickerEnabled ? (
        <Ticker
          items={breaking}
          label={settings.tickerLabel}
          speed={settings.tickerSpeed}
          liveHref={settings.liveStreamUrl && settings.liveStreamEnabled ? "/live" : null}
          showLive={settings.showLiveIndicator}
        />
      ) : null}
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
