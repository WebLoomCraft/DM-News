import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { getVideoItems } from "@/lib/queries";
import LivePanel from "@/components/site/LivePanel";
import { SectionHeading } from "@/components/site/SectionHeading";
import { VideoCard, type VideoItem } from "@/components/site/VideoCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Videos",
  description: "Video reports, interviews and clips from the DM News Network newsroom.",
};

export default async function VideosPage() {
  const [settings, videos] = await Promise.all([getSettings(), getVideoItems(36)]);
  const items = videos as VideoItem[];
  const liveItem = items.find((v) => v.isLive);

  return (
    <div className="container-site py-10">
      <header className="mb-8 border-b-2 border-[var(--ink)] pb-4">
        <p className="kicker text-[var(--accent)]">Multimedia</p>
        <h1 className="headline mt-1 text-[clamp(2rem,5vw,2.8rem)]">Video Reports</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#5b6779]">
          Broadcast clips, interviews and on-the-ground reports published by our video desk.
        </p>
      </header>

      {settings.liveStreamEnabled || liveItem ? (
        <section className="mb-12 grid gap-6 border border-[#e3e7ee] bg-white p-3 lg:grid-cols-[1.7fr_1fr]">
          <LivePanel streamUrl={settings.liveStreamUrl} label={settings.watchLiveLabel} />
          <div className="p-4">
            <SectionHeading title="On air" />
            <p className="text-sm text-[#5b6779]">
              {settings.liveStreamUrl
                ? "The DM News Network broadcast player streams here whenever the channel is live."
                : "No live stream is configured yet. The newsroom can publish a YouTube live URL from Admin → Settings."}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#4a5563]">
              <li>• Breaking coverage goes live first on this page.</li>
              <li>• Full programmes are archived in the video grid below.</li>
              <li>• Clips are published to our social channels simultaneously.</li>
            </ul>
          </div>
        </section>
      ) : null}

      <SectionHeading title="All video reports" />
      {items.length === 0 ? (
        <p className="border border-dashed border-[#d5dae2] bg-white px-6 py-12 text-center text-sm text-[#5b6779]">
          No videos published yet. Add YouTube links or clips from Admin → Videos.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
