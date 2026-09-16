import { TIER_LABELS, TIER_STYLE } from "@/lib/niec";
import { cn } from "@/lib/utils";

export function TierBadge({ tier, className }: { tier: string | null | undefined; className?: string }) {
  const t = tier ?? "observer";
  const s = TIER_STYLE[t] ?? TIER_STYLE.observer;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        s.bg, s.text, s.border, className,
      )}
    >
      <span className="text-xs leading-none">{s.icon}</span>
      {TIER_LABELS[t]}
    </span>
  );
}
