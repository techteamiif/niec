import { cn } from "@/lib/utils";
import { NiecMark } from "./NiecMark";

type Variant = "horizontal" | "stacked" | "mark";
type Theme = "dark" | "light";

export function NiecLogo({
  variant = "horizontal",
  theme = "dark",
  size = 40,
  withTagline = false,
  className,
}: {
  variant?: Variant;
  theme?: Theme;
  size?: number;
  withTagline?: boolean;
  className?: string;
}) {
  const word = theme === "dark" ? "text-white" : "text-foreground";
  const tagline = theme === "dark" ? "text-white/55" : "text-muted-foreground";

  if (variant === "mark") return <NiecMark size={size} theme={theme} className={className} />;

  if (variant === "stacked") {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <NiecMark size={size} theme={theme} />
        <div className="text-center leading-tight">
          <div className={cn("font-display text-2xl tracking-tight", word)}>NIEC</div>
          {withTagline && (
            <div className={cn("mt-1 text-[10px] uppercase tracking-[0.2em]", tagline)}>
              Nigeria Impact Economy Community
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <NiecMark size={size} theme={theme} />
      <div className="leading-tight">
        <div className={cn("font-display text-xl tracking-tight", word)}>NIEC</div>
        {withTagline && (
          <div className={cn("mt-0.5 text-[9px] uppercase tracking-[0.22em]", tagline)}>
            Nigeria Impact Economy
          </div>
        )}
      </div>
    </div>
  );
}
