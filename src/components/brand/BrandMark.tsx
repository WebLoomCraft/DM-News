"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * BrandMark — the DM News Network 3D emblem.
 *
 * A pure-SVG/CSS "extruded metal" badge that mirrors the brand renders in
 * /public/brand: brushed gun-metal bezel, deep navy face, extruded DM
 * letterforms with a red base and a glowing accent bar. Every colour is
 * derived from the live theme (--brand / --accent) so the emblem follows the
 * brand settings saved in the admin panel.
 *
 * Nothing here animates by default — the animated wrapper in <Logo3D /> applies
 * the motion so this stays safe for favicons, OG cards and the admin panel.
 */
export function BrandMark({
  className,
  title = "DM News Network",
  glow = true,
}: {
  className?: string;
  title?: string;
  /** Soft red bloom under the badge. Disable on dark low-contrast surfaces. */
  glow?: boolean;
}) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (part: string) => `dm3d-${raw}-${part}`;

  return (
    <span className={cn("brandmark relative inline-block select-none", className)} aria-hidden={title ? undefined : true}>
      <svg
        viewBox="0 0 120 120"
        role={title ? "img" : "presentation"}
        aria-label={title || undefined}
        className="brandmark-svg h-full w-full overflow-visible"
      >
        <defs>
          {/* Brushed metal bezel */}
          <linearGradient id={id("bezel")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4f7fb" />
            <stop offset="18%" stopColor="#9aa7b8" />
            <stop offset="42%" stopColor="#516073" />
            <stop offset="60%" stopColor="#d5dee8" />
            <stop offset="82%" stopColor="#6d7c8f" />
            <stop offset="100%" stopColor="#e9eef5" />
          </linearGradient>
          {/* Bezel inner shade for the bevel */}
          <linearGradient id={id("bevel")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </linearGradient>
          {/* Navy face */}
          <linearGradient id={id("face")} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--brand) 72%, #7d95bd)" />
            <stop offset="38%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--brand) 78%, #000)" />
          </linearGradient>
          {/* Face glass reflection */}
          <linearGradient id={id("glass")} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.30" />
            <stop offset="42%" stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
          </linearGradient>
          {/* Letter front face */}
          <linearGradient id={id("letter")} x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--brand) 55%, #93a9cc)" />
            <stop offset="30%" stopColor="color-mix(in srgb, var(--brand) 88%, #ffffff)" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--brand) 85%, #000)" />
          </linearGradient>
          {/* Metallic edge on the letters */}
          <linearGradient id={id("edge")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fdfefe" />
            <stop offset="50%" stopColor="#93a2b5" />
            <stop offset="100%" stopColor="#eef3f9" />
          </linearGradient>
          {/* Extrusion side */}
          <linearGradient id={id("extrude")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#16294a" />
            <stop offset="100%" stopColor="#050d1a" />
          </linearGradient>
          {/* Red base + neon bar */}
          <linearGradient id={id("red")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 70%, #ff9a9a)" />
            <stop offset="45%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--accent) 62%, #2a0000)" />
          </linearGradient>
          <linearGradient id={id("neon")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="20%" stopColor="#ff8f96" />
            <stop offset="50%" stopColor="#fff2f3" />
            <stop offset="80%" stopColor="#ff8f96" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.35" />
          </linearGradient>

          <radialGradient id={id("bloom")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>

          <filter id={id("shadow")} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="4.5" floodColor="#03070f" floodOpacity="0.42" />
          </filter>
          <filter id={id("soft")} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <filter id={id("neonblur")} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
        </defs>

        {/* ground bloom */}
        {glow ? <ellipse cx="60" cy="112" rx="42" ry="7.5" fill={`url(#${id("bloom")})`} className="brandmark-glow" /> : null}

        <g filter={`url(#${id("shadow")})`}>
          {/* extrusion of the badge (depth) */}
          <rect x="12.5" y="15.5" width="95" height="95" rx="24" fill="#040b16" opacity="0.9" />
          <rect x="10.5" y="12.5" width="95" height="95" rx="24" fill={`url(#${id("extrude")})`} />

          {/* brushed bezel */}
          <rect x="8" y="8" width="95" height="95" rx="24" fill={`url(#${id("bezel")})`} />
          {/* bezel inner bevel */}
          <rect x="8" y="8" width="95" height="95" rx="24" fill={`url(#${id("bevel")})`} opacity="0.55" />
          {/* navy face */}
          <rect x="13.5" y="13.5" width="84" height="84" rx="19.5" fill={`url(#${id("face")})`} />
          {/* glass reflection on face */}
          <rect x="13.5" y="13.5" width="84" height="84" rx="19.5" fill={`url(#${id("glass")})`} />
          {/* hairline */}
          <rect
            x="13.5"
            y="13.5"
            width="84"
            height="84"
            rx="19.5"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.22"
            strokeWidth="0.7"
          />

          {/* ---------------- DM letterforms ---------------- */}
          {/* Extruded copy: same paths, offset down-right, dark navy */}
          <g transform="translate(2.6,3.4)" opacity="0.95">
            <path d={D_PATH} fill={`url(#${id("extrude")})`} />
            <path d={M_PATH} fill={`url(#${id("extrude")})`} />
            <path d={BASE_D} fill={`url(#${id("red")})`} />
            <path d={BASE_M} fill={`url(#${id("red")})`} />
          </g>

          {/* Red base under the letters */}
          <g className="brandmark-base">
            <path d={BASE_D} fill={`url(#${id("red")})`} />
            <path d={BASE_M} fill={`url(#${id("red")})`} />
            <path d={BASE_D} fill="none" stroke="#ffd7da" strokeOpacity="0.5" strokeWidth="0.5" />
            <path d={BASE_M} fill="none" stroke="#ffd7da" strokeOpacity="0.5" strokeWidth="0.5" />
          </g>

          {/* Face of the letters: metal outline + navy fill + highlight */}
          <g className="brandmark-letters">
            <path d={D_PATH} fill={`url(#${id("edge")})`} />
            <path d={M_PATH} fill={`url(#${id("edge")})`} />
            <path d={D_INNER} fill={`url(#${id("letter")})`} />
            <path d={M_INNER_A} fill={`url(#${id("letter")})`} />
            <path d={M_INNER_B} fill={`url(#${id("letter")})`} />
            <path d={M_INNER_C} fill={`url(#${id("letter")})`} />
            <path d={M_INNER_D} fill={`url(#${id("letter")})`} />
            {/* specular streak across the D + M */}
            <path d={D_INNER} fill="#ffffff" opacity="0.18" className="brandmark-sheen" />
            <path d={M_INNER_A} fill="#ffffff" opacity="0.16" className="brandmark-sheen" />
          </g>

          {/* neon accent bar */}
          <g className="brandmark-neon">
            <rect x="44" y="91.5" width="30" height="4.2" rx="2.1" fill={`url(#${id("neon")})`} filter={`url(#${id("soft")})`} opacity="0.85" />
            <rect x="45" y="92.2" width="28" height="3.1" rx="1.55" fill={`url(#${id("neon")})`} />
            <rect x="49" y="92.8" width="20" height="1.5" rx="0.75" fill="#fffdfd" opacity="0.9" />
          </g>
        </g>

        {/* neon bloom under the bar */}
        {glow ? (
          <ellipse
            cx="59"
            cy="96"
            rx="26"
            ry="6"
            fill="var(--accent)"
            opacity="0.28"
            filter={`url(#${id("neonblur")})`}
            className="brandmark-neonbloom"
          />
        ) : null}
      </svg>
    </span>
  );
}

/* ---------- Geometry: condensed grotesque "DM", extrude-friendly ---------- */
const D_PATH =
  "M26 28h17.4c11.4 0 19.2 7.1 19.2 18.1v9.5c0 11-7.8 18.1-19.2 18.1H26V28zm11.3 8.6v28.5h5.4c5.2 0 8.3-3.1 8.3-8.6v-11.3c0-5.5-3.1-8.6-8.3-8.6h-5.4z";
const D_INNER =
  "M28.4 29.9h15c10.7 0 17.7 6.3 17.7 16.2v9.5c0 9.9-7 16.2-17.7 16.2h-15V29.9zm9 7.2v27.5h6c5.4 0 8.8-3.4 8.8-9.1V46.1c0-5.7-3.4-9.1-8.8-9.1h-6z";
const M_PATH =
  "M67 28h11.6l9.6 23.1L97.8 28h11.6v45.7h-10.9V51.4l-7.4 17.1h-6l-7.2-17v22.2H67V28z";
const M_INNER_A =
  "M68.8 29.9h8.6l10.8 26.2 10.8-26.2h8.6v41.9h-7.2V48.4h-.3l-7.6 17.6h-6.6l-7.6-17.6h-.3v23.4h-7.2V29.9z";
const M_INNER_B = "M68.8 29.9h8.6l2.4 5.8h-11V29.9z";
const M_INNER_C = "M68.8 46.4h7.2v25.4h-7.2V46.4z";
const M_INNER_D = "M100.3 29.9h8.6v41.9h-7.3V48.4h-1.3V29.9z";
/* red base slabs: simple horizontal blocks under the letter counters */
const BASE_D = "M26 83.4h21.2l-2 5.4H26z";
const BASE_M = "M51.6 83.4h57.9v5.4H53.6z";
