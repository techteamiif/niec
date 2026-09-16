import { initials } from "@/lib/niec";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name, src, size = 36, className,
}: { name: string; src?: string | null; size?: number; className?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className={cn("rounded-full object-cover ring-1 ring-border", className)}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary font-semibold text-primary-foreground",
        className,
      )}
    >
      {initials(name || "?")}
    </div>
  );
}
