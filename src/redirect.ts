import type { UserRoute } from "./store";

export function hasCustomRoute(customRoute: string | null | undefined): boolean {
  return Boolean(customRoute && customRoute.trim());
}

export function pickDestination(row: Pick<UserRoute, "default_route" | "custom_route">): string {
  if (hasCustomRoute(row.custom_route)) {
    return row.custom_route!.trim();
  }
  return row.default_route;
}

function inboundParams(inboundSearch: string): URLSearchParams {
  const raw = inboundSearch.startsWith("?") ? inboundSearch.slice(1) : inboundSearch;
  return new URLSearchParams(raw);
}

export function withForwardedQuery(destination: string, inboundSearch: string): string {
  const inbound = inboundParams(inboundSearch);
  if ([...inbound.keys()].length === 0) {
    return destination;
  }

  try {
    const url = new URL(destination);
    for (const [key, value] of inbound.entries()) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    const hashIndex = destination.indexOf("#");
    const beforeHash = hashIndex >= 0 ? destination.slice(0, hashIndex) : destination;
    const hash = hashIndex >= 0 ? destination.slice(hashIndex) : "";
    const qIndex = beforeHash.indexOf("?");
    const path = qIndex >= 0 ? beforeHash.slice(0, qIndex) : beforeHash;
    const existing = qIndex >= 0 ? beforeHash.slice(qIndex + 1) : "";
    const merged = new URLSearchParams(existing);
    for (const [key, value] of inbound.entries()) {
      merged.set(key, value);
    }
    const query = merged.toString();
    return path + (query ? `?${query}` : "") + hash;
  }
}

export function queryStringFromUrl(originalUrl: string): string {
  const index = originalUrl.indexOf("?");
  return index >= 0 ? originalUrl.slice(index) : "";
}
