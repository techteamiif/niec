import { useState } from "react";

type EventImageProps = {
  src: string | null;
  title: string;
  className: string;
};

export function EventImage({ src, title, className }: EventImageProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const hasImage = !!src && src !== failedImageUrl;

  return (
    <div className={`bg-[#D4A017] ${className}`} aria-hidden={!hasImage}>
      {hasImage && (
        <img
          src={src}
          alt={`${title} event`}
          className="h-full w-full object-cover"
          onError={() => setFailedImageUrl(src)}
        />
      )}
    </div>
  );
}
