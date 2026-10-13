import { useState } from "react";

type EventImageProps = {
  src: string | null;
  title: string;
  className: string;
  fit?: "cover" | "contain";
  showPlaceholder?: boolean;
};

export function EventImage({
  src,
  title,
  className,
  fit = "cover",
  showPlaceholder = true,
}: EventImageProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const hasImage = !!src && src !== failedImageUrl;

  if (!hasImage && !showPlaceholder) return null;

  return (
    <div className={`bg-[#D4A017] ${className}`} aria-hidden={!hasImage}>
      {hasImage && (
        <img
          src={src}
          alt={`${title} event`}
          className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
          onError={() => setFailedImageUrl(src)}
        />
      )}
    </div>
  );
}
