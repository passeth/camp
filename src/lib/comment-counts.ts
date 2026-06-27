import type { ContentEntry } from "@/lib/content";
import { getLocalComments } from "@/lib/local-comment-store";
import { canUseRemoteComments, getRemoteComments, markRemoteCommentsUnavailable } from "@/lib/remote-comment-store";

function entryKey(entry: Pick<ContentEntry, "type" | "slug">) {
  return `${entry.type}:${entry.slug}`;
}

async function getCommentCount(entry: Pick<ContentEntry, "type" | "slug">) {
  const input = { contentType: entry.type, contentSlug: entry.slug };

  if (await canUseRemoteComments()) {
    try {
      return (await getRemoteComments(input)).length;
    } catch {
      markRemoteCommentsUnavailable();
    }
  }

  return (await getLocalComments(input)).length;
}

export async function getCommentCountsForEntries(entries: readonly ContentEntry[]) {
  const pairs = await Promise.all(entries.map(async (entry) => [entryKey(entry), await getCommentCount(entry)] as const));
  return Object.fromEntries(pairs);
}

export function getReplyPostCountsByParent(entries: readonly ContentEntry[]) {
  const counts: Record<string, number> = {};

  for (const entry of entries) {
    if (!entry.replyTo) continue;
    const key = `${entry.replyTo.type}:${entry.replyTo.slug}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

export function getLinkedPostKeys(entries: readonly ContentEntry[]) {
  const keys = new Set<string>();

  for (const entry of entries) {
    if (!entry.replyTo) continue;
    keys.add(entryKey(entry));
    keys.add(`${entry.replyTo.type}:${entry.replyTo.slug}`);
  }

  return keys;
}

export function contentEntryKey(entry: Pick<ContentEntry, "type" | "slug">) {
  return entryKey(entry);
}

export type LinkedChildPost = {
  readonly href: string;
  readonly title: string;
  readonly type: ContentEntry["type"];
};

export function getChildPostsByParent(entries: readonly ContentEntry[]) {
  const childrenByParent: Record<string, LinkedChildPost[]> = {};

  for (const entry of entries) {
    if (!entry.replyTo) continue;
    const parentKey = `${entry.replyTo.type}:${entry.replyTo.slug}`;
    childrenByParent[parentKey] = [
      ...(childrenByParent[parentKey] ?? []),
      {
        href: entry.href,
        title: entry.title,
        type: entry.type,
      },
    ];
  }

  return childrenByParent;
}
