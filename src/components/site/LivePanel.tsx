"use client";

import { useState } from "react";
import { Radio } from "lucide-react";
import { parseYouTubeId, youtubeEmbedUrl } from "@/lib/utils";

export default function LivePanel({
  streamUrl,
  label,
  compact,
}: {
  streamUrl: string | null;
  label: string;
  compact?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const ytId = parseYouTubeId(streamUrl);
  const embed = ytId ? youtubeEmbedUrl(streamUrl || "", { autoplay: true }) : null;
  const direct = !ytId && streamUrl && /^(https?:)?\/\//.test(streamUrl) ? streamUrl : null;

  if (!streamUrl) {
    return (
      <div className="relative grid min-h-[320px] place-items-center overflow-hidden bg-[linear-gradient(135deg,#07101f,#12294a)] text-center">
        <div className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.08)_0_2px,transparent_2px_12px)]" />
        <div className="relative px-6 py-12">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/5">
            <Radio className="h-6 w-6 text-white/70" />
          </span>
          <p className="kicker mt-5 text-white/50">Broadcast window</p>
          <h3 className="headline mt-2 text-2xl text-white">{label}</h3>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
            Our live stream is currently off air. The broadcast player appears here automatically as soon as a live URL is
            published from the newsroom dashboard.
          </p>
          <p className="kicker mt-5 text-[0.62rem] text-white/35">Check back for the next scheduled broadcast</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
      {playing ? (
        embed ? (
          <iframe
            src={embed}
            title={label}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <iframe src={direct || streamUrl} title={label} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
        )
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full" aria-label={`Play live stream: ${label}`}>
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(11,27,51,0.55),rgba(7,16,31,0.95))]" />
          {ytId ? (
            <img
              src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-60"
              loading="lazy"
            />
          ) : null}
          <span className="relative flex h-full flex-col items-center justify-center gap-3 text-white">
            <span className="flex items-center gap-2 bg-[var(--accent)] px-3 py-1.5">
              <span aria-hidden className="live-dot inline-block h-2 w-2 rounded-full bg-white" />
              <span className="kicker text-[0.68rem]">Live</span>
            </span>
            <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-white/70 transition-transform group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-current" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="font-cond text-lg uppercase tracking-[0.18em]">{label}</span>
            {compact ? null : <span className="text-xs text-white/60">Click to start the broadcast player</span>}
          </span>
        </button>
      )}
    </div>
  );
}
