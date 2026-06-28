import type { CSSProperties } from "react";
import Link from "next/link";
import type { LinkedChildPost } from "@/lib/comment-counts";
import type { ContentEntry } from "@/lib/content";
import { tagHref } from "@/lib/tags";

type MeshStyle = CSSProperties & { readonly "--mesh-color": string };

const meshStyleByType: Record<ContentEntry["type"], MeshStyle> = {
  press: { "--mesh-color": "#76dec6" },
  topic: { "--mesh-color": "#5b9dff" },
  "daily-review": { "--mesh-color": "#d7f45a" },
  "study-log": { "--mesh-color": "#9a6cff" },
  "camp-session": { "--mesh-color": "#ffb86b" },
  "wall-climb": { "--mesh-color": "#76dec6" },
  teach: { "--mesh-color": "#88c8ff" },
};

function LinkedPostsAccordion({ posts }: { readonly posts: readonly LinkedChildPost[] }) {
  if (posts.length === 0) return null;

  return (
    <details className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2">
      <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]">
        연결된 게시글 {posts.length}
      </summary>
      <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
        {posts.map((post) => (
          <Link key={`${post.type}:${post.href}`} href={post.href} className="block rounded-md px-2 py-1.5 text-sm leading-5 text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)]">
            <span className="mr-2 text-[0.65rem] font-semibold uppercase tracking-[0.08em]">{post.type}</span>
            {post.title}
          </Link>
        ))}
      </div>
    </details>
  );
}

export function ContentCard({
  entry,
  linkedChildPosts = [],
  showVisual = true,
}: {
  readonly entry: ContentEntry;
  readonly linkedChildPosts?: readonly LinkedChildPost[];
  readonly showVisual?: boolean;
}) {
  const openHref = entry.type === "wall-climb" ? entry.sourceUrl ?? "/wall-climb" : entry.href;
  const openLabel = entry.type === "wall-climb" ? (entry.sourceUrl ? "원문 열기" : "벽타기에서 보기") : "게시글 열기";
  const isExternalOpenHref = /^https?:\/\//.test(openHref);
  const openLinkProps = isExternalOpenHref ? { target: "_blank", rel: "noreferrer" } : {};

  if (!showVisual) {
    return (
      <article className="group rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[var(--foreground)] hover:bg-white">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#55aabb] bg-white px-2.5 py-1 text-[0.63rem] font-semibold uppercase text-[#277687]">{entry.category ?? entry.type}</span>
              <span className="text-xs text-[var(--muted)]">{entry.publishedAt ?? entry.createdAt}</span>
            </div>
            <h2 className="break-words text-2xl font-semibold leading-tight tracking-[-0.035em] text-[var(--foreground)] transition group-hover:text-[#277687]">
              <Link href={openHref} {...openLinkProps}>{entry.title}</Link>
            </h2>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{entry.excerpt}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <Link key={tag} href={tagHref(tag, entry.type)} className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)]">#{tag}</Link>
              ))}
            </div>
          </div>
          <div className="flex gap-2 text-xs font-semibold text-[var(--muted)] sm:flex-col sm:items-end">
            <Link href={openHref} {...openLinkProps} className="rounded-full border border-[var(--line)] px-3 py-1 transition group-hover:border-[var(--foreground)] group-hover:text-[var(--foreground)]">{openLabel}</Link>
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1">{entry.type}</span>
          </div>
        </div>
        <LinkedPostsAccordion posts={linkedChildPosts} />
      </article>
    );
  }

  return (
    <article className="group">
      <Link href={openHref} {...openLinkProps} className="block">
        <div className="mesh-card aspect-[1.68] w-full p-4 transition duration-200 group-hover:-translate-y-1" style={meshStyleByType[entry.type]}>
        <div className="research-window absolute right-5 top-5 h-[44%] w-[48%] p-3">
          <div className="h-2 w-16 rounded-full bg-[#171717]" />
          <div className="mt-3 h-2 w-24 rounded-full bg-[#d9d7cc]" />
          <div className="mt-2 h-2 w-14 rounded-full bg-[#d9d7cc]" />
        </div>
        <div className="research-window absolute bottom-5 left-5 w-[42%] p-3">
          <p className="text-[0.62rem] font-semibold uppercase text-[#767d89]">Reviewed</p>
          <p className="mt-1 text-xl font-semibold leading-none tracking-[-0.04em] text-[#171717]">{entry.tags.length || 1}</p>
        </div>
      </div>
      </Link>
      <div className="mt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#55aabb] bg-white px-2.5 py-1 text-[0.63rem] font-semibold uppercase text-[#277687]">{entry.category ?? entry.type}</span>
          <span className="text-xs text-[#7a8190]">{entry.publishedAt ?? entry.createdAt}</span>
        </div>
        <h2 className="text-2xl font-semibold leading-tight tracking-[-0.035em] text-[#171717] transition group-hover:text-[#277687]">
          <Link href={openHref} {...openLinkProps}>{entry.title}</Link>
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#5b6270]">{entry.excerpt}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {entry.tags.map((tag) => (
          <Link key={tag} href={tagHref(tag, entry.type)} className="rounded-full bg-white px-2.5 py-1 text-xs text-[#5b6270] transition hover:text-[#171717]">#{tag}</Link>
        ))}
      </div>
      <LinkedPostsAccordion posts={linkedChildPosts} />
    </article>
  );
}
