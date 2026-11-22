import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { sanitizeRichText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Terms & Conditions", description: "Terms of use for DM News Network." };

export default async function TermsPage() {
  const settings = await getSettings();
  const content = settings.termsContent || "<p>These terms can be written in Admin → Settings → Pages.</p>";

  return (
    <div className="container-site py-10">
      <header className="mb-8 border-b-2 border-[var(--ink)] pb-5">
        <p className="kicker text-[var(--accent)]">Legal</p>
        <h1 className="headline mt-1 text-[clamp(2rem,5vw,2.8rem)]">Terms &amp; Conditions</h1>
      </header>
      <div className="article-body max-w-3xl" dangerouslySetInnerHTML={{ __html: sanitizeRichText(content) }} />
      <p className="mt-10 text-sm text-[#5b6779]">
        Need clarification? <Link className="text-[var(--accent)] hover:underline" href="/contact">Contact the newsroom</Link>.
      </p>
    </div>
  );
}
