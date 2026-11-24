import greenLogo from "@/assets/NIEC Logo/NIEC Logo Green.png";
import whiteLogo from "@/assets/NIEC Logo/NIEC Logo White.png";
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
  if (variant === "mark") return <NiecMark size={size} theme={theme} className={className} />;

  return (
    <img
      src={theme === "dark" ? whiteLogo : greenLogo}
      alt={withTagline ? "NIEC — Nigeria Impact Economy Community" : "NIEC"}
      className={cn("block w-auto object-contain", className)}
      style={{ height: size * (variant === "stacked" ? 1.5 : 1) }}
    />
  );
}
