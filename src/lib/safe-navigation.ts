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

export function safeReturnPath(value: unknown): string | undefined {
  let path = safeInternalPath(value);
  const seen = new Set<string>();

  for (let depth = 0; path && depth < 10; depth += 1) {
    let url: URL;
    try {
      url = new URL(path, "https://internal.invalid");
    } catch {
      return undefined;
    }

    if (url.pathname.replace(/\/+$/, "") !== "/login") return path;
    if (seen.has(path)) return undefined;
    seen.add(path);
    path = safeInternalPath(url.searchParams.get("next"));
  }

  return undefined;
}

export function pathWithNext(path: string, next?: string): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
