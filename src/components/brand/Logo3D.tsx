"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";

type Props = {
  href?: string;
  wordmark?: string;
  tagline?: string;
  className?: string;
  markClassName?: string;
  tone?: "light" | "dark";
  /** Master switch — respects prefers-reduced-motion internally. */
  animated?: boolean;
  /** Hero-sized variant with orbit rings and a full 3D tilt. */
  variant?: "header" | "hero" | "compact" | "lockup";
};

/**
 * Logo3D — animated, pointer-reactive 3D emblem + wordmark.
 *
 * Motion layers (all optional, all disabled for prefers-reduced-motion):
 *  1. intro      — badge rises and flips into place once on mount
 *  2. idle float — slow vertical drift + subtle Y-axis sway
 *  3. pointer    — the badge tilts toward the cursor (rAF throttled, CSS vars)
 *  4. sheen      — a specular sweep crosses the letterforms every few seconds
 *  5. orbit      — hero variant shows two slow rotating rings
 */
export function Logo3D({
  href = "/",
  wordmark = "DM News",
  tagline,
  className,
  markClassName,
  tone = "light",
  animated = true,
  variant = "header",
}: Props) {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const frame = useRef<number | null>(null);
  const [pressed, setPressed] = useState(false);
  // Lazily read the media query during render (client-only) so the first paint
  // already respects reduced-motion without a cascading effect.
  const [motionOk, setMotionOk] = useState(() =>
    typeof window === "undefined" ? true : !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setMotionOk(!mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // pointer-reactive tilt
  useEffect(() => {
    if (!animated || !motionOk) return;
    const wrap = wrapRef.current;
    const badge = badgeRef.current;
    if (!wrap || !badge) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const onMove = (event: PointerEvent) => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const rect = wrap.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        badge.style.setProperty("--rx", `${(-py * 22).toFixed(2)}deg`);
        badge.style.setProperty("--ry", `${(px * 30).toFixed(2)}deg`);
        badge.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
        badge.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`);
      });
    };
    const onLeave = () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      badge.style.setProperty("--rx", "0deg");
      badge.style.setProperty("--ry", "0deg");
      badge.style.setProperty("--gx", "38%");
      badge.style.setProperty("--gy", "22%");
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [animated, motionOk]);

  const inner = (
    <span
      ref={wrapRef}
      className={cn(
        "logo3d group/logo inline-flex max-w-full min-w-0 items-center gap-3",
        `logo3d--${variant}`,
        variant === "hero" && "logo3d--hero flex-col gap-5 text-center",
        variant === "lockup" && "gap-4",
        variant === "compact" && "gap-2",
        !animated && "logo3d--static",
        className,
      )}
    >
      <span
        className={cn(
          "logo3d-scene relative shrink-0",
          variant === "hero"
            ? "h-[132px] w-[132px]"
            : variant === "lockup"
              ? "h-[92px] w-[92px] sm:h-[104px] sm:w-[104px]"
              : variant === "compact"
                ? "h-9 w-9"
                : "h-11 w-11 sm:h-[52px] sm:w-[52px]",
          markClassName,
        )}
      >
        {(variant === "hero" || variant === "lockup") ? (
          <>
            <span aria-hidden className="logo3d-ring logo3d-ring--outer" />
            <span aria-hidden className="logo3d-ring logo3d-ring--inner" />
          </>
        ) : null}
        <span
          data-logo-badge
          ref={badgeRef}
          className={cn("logo3d-badge block h-full w-full", animated && motionOk && "logo3d-badge--live", pressed && "logo3d-badge--press")}
          style={{ ["--rx" as string]: "0deg", ["--ry" as string]: "0deg", ["--gx" as string]: "38%", ["--gy" as string]: "22%" }}
        >
          <BrandMark className="drop-shadow-[0_10px_18px_rgba(4,12,26,0.35)]" title={undefined} />
          <span aria-hidden className="logo3d-sheen" />
        </span>
      </span>

      {variant !== "compact" ? (
        <span className="logo3d-words min-w-0 leading-none">
          <span
            className={cn(
              "logo3d-word block whitespace-nowrap font-display font-bold tracking-[-0.015em]",
              variant === "hero"
                ? "text-[1.55rem] sm:text-[1.9rem]"
                : variant === "lockup"
                  ? "text-[1.4rem] sm:text-[1.8rem]"
                  : "text-[1.12rem] sm:text-[1.3rem]",
              tone === "dark" ? "text-white" : "text-[var(--ink)]",
            )}
          >
            {wordmark}
            <span aria-hidden className="logo3d-word-accent">.</span>
          </span>
          <span
            className={cn(
              "kicker mt-1 hidden items-center gap-1.5 whitespace-nowrap text-[0.56rem] min-[380px]:flex sm:mt-1.5",
              tone === "dark" ? "text-white/55" : "text-[#8b95a3]",
            )}
          >
            <span aria-hidden className="inline-block h-[3px] w-2 shrink-0 sm:w-3" style={{ background: "var(--accent)" }} />
            {tagline || "Independent newsroom"}
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return inner;

  return (
    <Link
      href={href}
      aria-label={`${wordmark} home`}
      className="min-w-0 shrink outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onFocus={() => setPressed(true)}
      onBlur={() => setPressed(false)}
    >
      {inner}
    </Link>
  );
}
