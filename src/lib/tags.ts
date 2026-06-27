import type { ContentEntry, ContentType } from "@/lib/content";

export type TagSummary = {
  readonly tag: string;
  readonly count: number;
};

export function normalizeTag(value?: string) {
  return value?.trim().replace(/^#/, "").toLowerCase();
}

export function filterEntriesByTag(entries: readonly ContentEntry[], tag?: string) {
  const normalized = normalizeTag(tag);
  if (!normalized) return entries;
  return entries.filter((entry) => entry.tags.some((candidate) => normalizeTag(candidate) === normalized));
}

export function tagHref(tag: string, type?: ContentType) {
  const params = new URLSearchParams({ tag });
  if (type === "press") return `/press?${params.toString()}`;
  if (type === "topic") return `/topics?${params.toString()}`;
  if (type === "daily-review") return `/daily-review?${params.toString()}`;
  if (type === "teach") return `/teach?${params.toString()}`;
  if (type === "study-log") return `/study-log?${params.toString()}`;
  if (type === "camp-session") return `/camp-session?${params.toString()}`;
  return `/?${params.toString()}`;
}

export function getTagSummaries(entries: readonly ContentEntry[], limit = 16) {
  const counts = new Map<string, { tag: string; count: number }>();

  for (const entry of entries) {
    for (const tag of entry.tags) {
      const normalized = normalizeTag(tag);
      if (!normalized) continue;
      const current = counts.get(normalized);
      counts.set(normalized, { tag, count: (current?.count ?? 0) + 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}
