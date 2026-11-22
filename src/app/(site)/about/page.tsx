import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { sanitizeRichText } from "@/lib/sanitize";
import { getActiveCategories } from "@/lib/queries";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Logo3D } from "@/components/brand/Logo3D";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us",
  description: "About DM News Network — our newsroom, our standards and how we work.",
};

export default async function AboutPage() {
  const [settings, categories] = await Promise.all([getSettings(), getActiveCategories()]);
  const content =
    settings.aboutContent ||
    "<p>DM News Network is an independent digital newsroom. Add your organisation's story from Admin → Settings → Pages.</p>";

  return (
    <div className="container-site py-10">
      <header className="mb-8 border-b-2 border-[var(--ink)] pb-6">
        <p className="kicker text-[var(--accent)]">About the network</p>
        <h1 className="headline mt-1 text-[clamp(2rem,5vw,2.9rem)]">{settings.siteName}</h1>
        {settings.tagline ? <p className="mt-2 font-display text-lg text-[#4a5563]">{settings.tagline}</p> : null}
      </header>

      <section className="mb-10 grid items-center gap-8 overflow-hidden border border-[#e3e7ee] bg-[linear-gradient(135deg,#fbfcfe,#eef2f7)] p-6 sm:p-8 lg:grid-cols-[auto_1fr]">
        <div className="justify-self-center">
          <Logo3D
            variant="hero"
            href={undefined}
            wordmark={settings.logoWordmark || settings.siteName}
            tagline={settings.tagline || "Independent · Verified · 24/7"}
            className="logo3d--showcase"
          />
        </div>
        <div>
          <p className="kicker text-[var(--accent)]">The brand mark</p>
          <h2 className="headline mt-2 text-[1.4rem] sm:text-[1.7rem]">A three-dimensional take on the DM monogram</h2>
          <p className="mt-2 max-w-xl text-[0.95rem] leading-relaxed text-[#4a5563]">
            The emblem is a brushed gun-metal badge around the network initials, extruded in depth with the red accent bar
            beneath. On the site it reacts to your pointer, drifts gently while idle and settles completely still when your
            device asks for reduced motion.
          </p>
        </div>
      </section>



      <div className="grid gap-10 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="article-body max-w-3xl" dangerouslySetInnerHTML={{ __html: sanitizeRichText(content) }} />

          <div className="mt-12">
            <SectionHeading title="Our sections" />
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="group border border-[#e3e7ee] bg-white p-4 card-hover"
                >
                  <span className="kicker" style={{ color: category.color || "var(--accent)" }}>
                    {category.name}
                  </span>
                  <span className="mt-1.5 block text-sm text-[#5b6779]">{category.description}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="border-t-2 border-[var(--ink)] bg-white p-5">
            <h2 className="section-title text-[0.95rem]">Follow the network</h2>
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
              {!settings.facebookUrl && !settings.tiktokUrl && !settings.youtubeUrl ? (
                <li className="text-[#8b95a3]">Social links can be added from Admin → Settings.</li>
              ) : null}
            </ul>
          </div>
          <div className="border-t-2 border-[var(--ink)] bg-white p-5">
            <h2 className="section-title text-[0.95rem]">Contact the newsroom</h2>
            <p className="mt-3 text-sm text-[#5b6779]">
              {settings.contactEmail ? (
                <>
                  Email{" "}
                  <a className="text-[var(--accent)] hover:underline" href={`mailto:${settings.contactEmail}`}>
                    {settings.contactEmail}
                  </a>
                </>
              ) : (
                "Use the contact form — the editorial team reads every message."
              )}
            </p>
            <Link href="/contact" className="kicker mt-4 inline-block bg-[var(--ink)] px-5 py-2.5 text-white hover:bg-[var(--brand)]">
              Contact us
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
