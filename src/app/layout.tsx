import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getSettings, themeVariables } from "@/lib/settings";
import { getBaseUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const base = await getBaseUrl();
  const title = settings.defaultSeoTitle || `${settings.siteName} — Breaking News from Pakistan & the World`;
  const description =
    settings.defaultSeoDescription ||
    settings.siteDescription ||
    "Latest breaking news, politics, business, technology, sports and entertainment from DM News Network.";
  const image = settings.defaultSocialImage || settings.logoUrl || undefined;

  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s | ${settings.siteName}` },
    description,
    applicationName: settings.siteName,
    keywords: ["news", "Pakistan news", "world news", "breaking news", settings.siteName],
    openGraph: {
      type: "website",
      siteName: settings.siteName,
      title,
      description,
      url: base,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: { index: true, follow: true },
    alternates: { canonical: base },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = await getSettings();
  const vars = themeVariables(settings) as React.CSSProperties;
  const fontHref =
    "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap";

  return (
    <html lang="en" style={vars} suppressHydrationWarning>
      <head>
        {settings.faviconUrl ? <link rel="icon" href={settings.faviconUrl} /> : null}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={fontHref} />
        <meta name="theme-color" content={settings.colorPrimary} />
      </head>
      <body className="bg-[#f5f6f8] text-[var(--ink)] antialiased">
        {children}
        {settings.analyticsSnippet ? (
          <div id="analytics" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: settings.analyticsSnippet }} />
        ) : null}
      </body>
    </html>
  );
}
