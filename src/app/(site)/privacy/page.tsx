import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { sanitizeRichText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Privacy Policy", description: "How DM News Network handles your data." };

export default async function PrivacyPage() {
  const settings = await getSettings();
  const content =
    settings.privacyContent ||
    "<p>This privacy policy can be written in Admin → Settings → Pages.</p>";

  return (
    <div className="container-site py-10">
      <header className="mb-8 border-b-2 border-[var(--ink)] pb-5">
        <p className="kicker text-[var(--accent)]">Legal</p>
        <h1 className="headline mt-1 text-[clamp(2rem,5vw,2.8rem)]">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#5b6779]">Last reviewed {new Date(settings.updatedAt).toUTCString().slice(0, 16)}</p>
      </header>
      <div className="article-body max-w-3xl" dangerouslySetInnerHTML={{ __html: sanitizeRichText(content) }} />
      <p className="mt-10 text-sm text-[#5b6779]">
        Questions about this policy? <Link className="text-[var(--accent)] hover:underline" href="/contact">Contact the newsroom</Link>.
      </p>
    </div>
  );
}
