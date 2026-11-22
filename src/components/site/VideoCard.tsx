"use client";

import { useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { cn, formatDate, parseYouTubeId, youtubeEmbedUrl } from "@/lib/utils";

export type VideoItem = {
  id: number;
  title: string;
  youtubeUrl: string;
  youtubeId?: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  kind: string;
  isLive?: boolean;
  orderIndex?: number;
  publishedAt: string | Date | null;
};

export function VideoThumb({ video, className }: { video: VideoItem; className?: string }) {
  const ytId = parseYouTubeId(video.youtubeUrl);
  const poster = video.thumbnailUrl || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null);
  return (
    <div className={cn("relative aspect-[16/9] overflow-hidden bg-[#0d1a2d]", className)}>
      {poster ? (
        <img src={poster} alt={video.title} loading="lazy" decoding="async" className="img-zoom h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#0b1b33,#12294a)]">
          <span className="font-cond text-2xl tracking-[0.3em] text-white/40">DM</span>
        </div>
      )}
      <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(4,10,20,0.7),transparent_55%)]" />
      <span className="absolute left-3 top-3 bg-[var(--accent)] px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white">
        {video.kind}
      </span>
      <span className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-white/92 text-[var(--ink)]">
        <Play className="h-4 w-4 fill-current" />
      </span>
    </div>
  );
}

export function VideoCard({ video, className }: { video: VideoItem; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const ytId = parseYouTubeId(video.youtubeUrl);
  const embed = ytId ? youtubeEmbedUrl(video.youtubeUrl, { autoplay: true }) : null;
  const directFile = !ytId && /\.(mp4|webm|mov)(\?|$)/i.test(video.youtubeUrl) ? video.youtubeUrl : null;

  return (
    <article className={cn("group flex h-full flex-col border border-[#e7eaf0] bg-white card-hover", className)}>
      <div className="relative aspect-[16/9] overflow-hidden bg-black">
        {playing ? (
          embed ? (
            <iframe
              src={embed}
              title={video.title}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : directFile ? (
            <video src={directFile} poster={video.thumbnailUrl || undefined} controls autoPlay playsInline className="absolute inset-0 h-full w-full bg-black" />
          ) : null
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 h-full w-full text-left"
            aria-label={`Play video: ${video.title}`}
          >
            <VideoThumb video={video} className="h-full w-full" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="headline text-[1.05rem] leading-snug">{video.title}</h3>
        {video.description ? <p className="mt-2 line-clamp-2 text-[0.85rem] text-[#5b6779]">{video.description}</p> : null}
        <p className="mt-auto pt-3 text-[0.7rem] uppercase tracking-[0.08em] text-[#8b95a3]">
          {video.publishedAt ? formatDate(video.publishedAt, { day: "numeric", month: "short", year: "numeric" }) : ""}
        </p>
      </div>
    </article>
  );
}

export function VideoListLink({ video }: { video: VideoItem }) {
  return (
    <Link href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="block">
      <VideoCard video={video} />
    </Link>
  );
}
