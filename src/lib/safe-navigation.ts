export function safeInternalPath(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }

  try {
    return new URL(value, "https://internal.invalid").origin === "https://internal.invalid"
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

export function pathWithNext(path: string, next?: string): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
