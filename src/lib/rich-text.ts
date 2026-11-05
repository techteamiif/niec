import DOMPurify from "dompurify";

const RICH_TEXT_TAGS = [
  "blockquote",
  "br",
  "b",
  "div",
  "em",
  "h2",
  "h3",
  "i",
  "li",
  "ol",
  "p",
  "strong",
  "u",
  "ul",
];

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: RICH_TEXT_TAGS,
    ALLOWED_ATTR: [],
  });
}

export function richTextToPlainText(html: string) {
  return html.replace(/<[^>]*>/g, " ");
}
