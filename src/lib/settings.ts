import { db } from "@/db";
import { siteSettings, type SettingsRow } from "@/db/schema";
import { asc } from "drizzle-orm";

export type NavItem = { label: string; href: string; enabled?: boolean };
export type FooterColumn = { title: string; links: { label: string; href: string }[] };
export type Settings = SettingsRow;

export const DEFAULT_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Latest News", href: "/latest" },
  { label: "Pakistan", href: "/category/pakistan" },
  { label: "World", href: "/category/world" },
  { label: "Politics", href: "/category/politics" },
  { label: "Business", href: "/category/business" },
  { label: "Technology", href: "/category/technology" },
  { label: "Sports", href: "/category/sports" },
  { label: "Entertainment", href: "/category/entertainment" },
  { label: "Videos", href: "/videos" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Sections",
    links: [
      { label: "Pakistan", href: "/category/pakistan" },
      { label: "World", href: "/category/world" },
      { label: "Politics", href: "/category/politics" },
      { label: "Business", href: "/category/business" },
    ],
  },
  {
    title: "More",
    links: [
      { label: "Technology", href: "/category/technology" },
      { label: "Sports", href: "/category/sports" },
      { label: "Entertainment", href: "/category/entertainment" },
      { label: "Videos", href: "/videos" },
    ],
  },
  {
    title: "Network",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Watch Live", href: "/live" },
      { label: "Latest News", href: "/latest" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/privacy" },
      { label: "Editorial Policy", href: "/about" },
    ],
  },
];

const CACHE_TTL = 20_000;
const globalForSettings = globalThis as typeof globalThis & {
  __dmSettingsCache?: { value: Settings; at: number };
};

export function invalidateSettingsCache() {
  globalForSettings.__dmSettingsCache = undefined;
}

/** Used only when the database is unreachable (e.g. during a static build). */
export const FALLBACK_SETTINGS: Settings = {
  id: 0,
  siteName: "DM News Network",
  tagline: "Truth. Speed. Trust.",
  siteDescription: "DM News Network delivers verified breaking news from Pakistan and around the world.",
  siteUrl: "http://localhost:3000",
  logoUrl: null,
  logoMarkText: "DM",
  logoWordmark: "DM News Network",
  faviconUrl: null,
  colorPrimary: "#0B1B33",
  colorAccent: "#D81F2A",
  colorInk: "#07101F",
  colorPaper: "#FFFFFF",
  navItems: DEFAULT_NAV,
  showSearchIcon: true,
  showWatchLiveButton: true,
  watchLiveLabel: "Watch Live",
  liveStreamUrl: null,
  liveStreamEnabled: true,
  showLiveIndicator: true,
  showLanguageSelector: true,
  tickerEnabled: true,
  tickerLabel: "Breaking News",
  tickerSpeed: 40,
  facebookUrl: "https://www.facebook.com/share/1FaNf7Nj6t/",
  tiktokUrl: "https://www.tiktok.com/@dmnewsnetwork?_r=1&_t=ZS-9BcDLFbjrUr",
  youtubeUrl: null,
  xUrl: null,
  instagramUrl: null,
  contactEmail: null,
  contactPhone: null,
  contactAddress: null,
  footerAbout: "DM News Network is an independent digital newsroom reporting from Pakistan and the world.",
  footerColumns: DEFAULT_FOOTER_COLUMNS,
  copyright: `© ${new Date().getFullYear()} DM News Network. All rights reserved.`,
  newsletterEnabled: true,
  newsletterTitle: "The DM Evening Briefing",
  newsletterDescription: "One concise briefing each evening — the stories that moved Pakistan and the world.",
  defaultSeoTitle: "DM News Network — Breaking News from Pakistan & the World",
  defaultSeoDescription: "Latest breaking news, politics, business, technology, sports and entertainment coverage.",
  defaultSocialImage: null,
  adSlotHtml: null,
  showAdSlots: true,
  aboutContent: null,
  privacyContent: null,
  termsContent: null,
  analyticsSnippet: null,
  updatedAt: new Date(),
};

export async function getSettings(): Promise<Settings> {
  const cached = globalForSettings.__dmSettingsCache;
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.value;

  let rows: Settings[] = [];
  try {
    rows = await db.select().from(siteSettings).orderBy(asc(siteSettings.id)).limit(1);
  } catch (error) {
    console.error("[settings] database unavailable, using fallback settings:", (error as Error).message);
    return FALLBACK_SETTINGS;
  }
  let settings = rows[0];
  if (!settings) {
    const [created] = await db
      .insert(siteSettings)
      .values({
        navItems: DEFAULT_NAV,
        footerColumns: DEFAULT_FOOTER_COLUMNS,
        siteDescription:
          "DM News Network delivers verified breaking news from Pakistan and around the world — politics, business, technology, sports and entertainment.",
        footerAbout:
          "DM News Network is an independent digital newsroom reporting from Pakistan and the world with accuracy, speed and accountability.",
        copyright: `© ${new Date().getFullYear()} DM News Network. All rights reserved.`,
        newsletterDescription:
          "One concise briefing each evening — the stories that moved Pakistan and the world, handpicked by our editors.",
        defaultSeoTitle: "DM News Network — Breaking News from Pakistan & the World",
        defaultSeoDescription:
          "Latest breaking news, politics, business, technology, sports and entertainment coverage from DM News Network.",
      })
      .returning();
    settings = created!;
  }
  globalForSettings.__dmSettingsCache = { value: settings, at: Date.now() };
  return settings;
}

export function getNavItems(settings: Settings): NavItem[] {
  const items = Array.isArray(settings.navItems) ? settings.navItems : [];
  const cleaned = items.filter((item) => item && item.label && item.href);
  return cleaned.length ? cleaned : DEFAULT_NAV;
}

export function getFooterColumns(settings: Settings): FooterColumn[] {
  const cols = Array.isArray(settings.footerColumns) ? settings.footerColumns : [];
  return cols.length ? cols : DEFAULT_FOOTER_COLUMNS;
}

export function themeVariables(settings: Settings): Record<string, string> {
  return {
    "--brand": settings.colorPrimary,
    "--accent": settings.colorAccent,
    "--ink": settings.colorInk,
    "--paper": settings.colorPaper,
  };
}
