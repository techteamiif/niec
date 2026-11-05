import { useEffect, useState } from "react";
import { richTextToPlainText, sanitizeRichText } from "@/lib/rich-text";

export function RichTextContent({ content, className }: { content: string; className?: string }) {
  const [sanitized, setSanitized] = useState<{ source: string; html: string } | null>(null);

  useEffect(() => {
    setSanitized({ source: content, html: sanitizeRichText(content) });
  }, [content]);

  if (sanitized?.source === content) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized.html }} />;
  }

  return <div className={className}>{richTextToPlainText(content)}</div>;
}
