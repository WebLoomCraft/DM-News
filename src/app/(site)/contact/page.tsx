import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import ContactForm from "@/components/site/ContactForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the DM News Network newsroom.",
};

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <div className="container-site py-10">
      <header className="mb-8 border-b-2 border-[var(--ink)] pb-5">
        <p className="kicker text-[var(--accent)]">Contact</p>
        <h1 className="headline mt-1 text-[clamp(2rem,5vw,2.8rem)]">Talk to the newsroom</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#5b6779]">
          Tips, corrections, story leads or press enquiries — send a message and the duty desk will respond.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <ContactForm />
        <aside className="space-y-6">
          <div className="border-t-2 border-[var(--ink)] bg-white p-5">
            <h2 className="section-title text-[0.95rem]">Direct details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="kicker text-[#8b95a3]">Email</dt>
                <dd className="mt-0.5">
                  {settings.contactEmail ? (
                    <a className="text-[var(--accent)] hover:underline" href={`mailto:${settings.contactEmail}`}>
                      {settings.contactEmail}
                    </a>
                  ) : (
                    <span className="text-[#8b95a3]">Not published yet — add it in Admin → Settings.</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="kicker text-[#8b95a3]">Phone</dt>
                <dd className="mt-0.5">
                  {settings.contactPhone ? (
                    <a className="text-[var(--accent)] hover:underline" href={`tel:${settings.contactPhone}`}>
                      {settings.contactPhone}
                    </a>
                  ) : (
                    <span className="text-[#8b95a3]">Not published yet.</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="kicker text-[#8b95a3]">Address</dt>
                <dd className="mt-0.5 text-[#4a5563]">{settings.contactAddress || "Not published yet."}</dd>
              </div>
            </dl>
          </div>
          <div className="border-t-2 border-[var(--ink)] bg-white p-5">
            <h2 className="section-title text-[0.95rem]">Social channels</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {settings.facebookUrl ? (
                <li>
                  <a className="text-[var(--accent)] hover:underline" href={settings.facebookUrl} target="_blank" rel="noopener noreferrer nofollow">
                    Facebook
                  </a>
                </li>
              ) : null}
              {settings.tiktokUrl ? (
                <li>
                  <a className="text-[var(--accent)] hover:underline" href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer nofollow">
                    TikTok
                  </a>
                </li>
              ) : null}
              {settings.youtubeUrl ? (
                <li>
                  <a className="text-[var(--accent)] hover:underline" href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer nofollow">
                    YouTube
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
