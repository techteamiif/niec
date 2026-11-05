import { useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";

type EventImageProps = {
  src: string | null;
  title: string;
  className: string;
  alt?: string;
  fit?: "cover" | "contain";
  showPlaceholder?: boolean;
  placeholderIcon?: "file" | "image";
};

export function EventImage({
  src,
  title,
  className,
  alt = `${title} event`,
  fit = "cover",
  showPlaceholder = true,
  placeholderIcon = "image",
}: EventImageProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const hasImage = !!src && src !== failedImageUrl;
  const PlaceholderIcon = placeholderIcon === "file" ? FileText : ImageIcon;

  if (!hasImage && !showPlaceholder) return null;

  return (
    <div className={`bg-[#E5ECDC] ${className}`} aria-hidden={!hasImage}>
      {hasImage && (
        <img
          src={src}
          alt={alt}
          className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
          onError={() => setFailedImageUrl(src)}
        />
      )}
      {!hasImage && showPlaceholder && (
        <div className="grid h-full w-full place-items-center text-[#73816B]">
          <PlaceholderIcon aria-hidden="true" className="h-8 w-8" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
