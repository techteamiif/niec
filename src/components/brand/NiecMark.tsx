import { cn } from "@/lib/utils";

/**
 * NIEC brand mark — a stylised network/agora.
 * - Outer hex: connective tissue (IIF Green)
 * - Centre node: anchor / convening (IIF Gold)
 * - Six satellite nodes: the 6 Communities of Practice (Ecosystem Teal)
 */
export function NiecMark({
  size = 40,
  className,
  theme = "dark",
}: {
  size?: number;
  className?: string;
  theme?: "dark" | "light";
}) {
  const green = "#117A3D";
  const gold = "#C9A368";
  const teal = "#4FC3A0";
  const surface = theme === "dark" ? "#0F2A1A" : "#FDFCFA";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="NIEC"
    >
      <defs>
        <linearGradient id="niec-hex" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={green} />
          <stop offset="100%" stopColor="#0A4524" />
        </linearGradient>
        <radialGradient id="niec-core" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0%" stopColor="#F2D27A" />
          <stop offset="100%" stopColor={gold} />
        </radialGradient>
      </defs>

      {/* Hex tile */}
      <path
        d="M32 2 L58 17 V47 L32 62 L6 47 V17 Z"
        fill="url(#niec-hex)"
        stroke={gold}
        strokeWidth="1.25"
      />

      {/* Connection lines from centre to each satellite */}
      <g stroke={teal} strokeWidth="1.4" strokeLinecap="round" opacity="0.85">
        <line x1="32" y1="32" x2="32" y2="13" />
        <line x1="32" y1="32" x2="48.5" y2="22" />
        <line x1="32" y1="32" x2="48.5" y2="42" />
        <line x1="32" y1="32" x2="32" y2="51" />
        <line x1="32" y1="32" x2="15.5" y2="42" />
        <line x1="32" y1="32" x2="15.5" y2="22" />
      </g>

      {/* 6 CoP satellite nodes */}
      <g fill={teal} stroke={surface} strokeWidth="1.25">
        <circle cx="32" cy="13" r="3.2" />
        <circle cx="48.5" cy="22" r="3.2" />
        <circle cx="48.5" cy="42" r="3.2" />
        <circle cx="32" cy="51" r="3.2" />
        <circle cx="15.5" cy="42" r="3.2" />
        <circle cx="15.5" cy="22" r="3.2" />
      </g>

      {/* Anchor / convening core */}
      <circle cx="32" cy="32" r="6.5" fill="url(#niec-core)" stroke={surface} strokeWidth="1.5" />
    </svg>
  );
}
