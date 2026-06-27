import Link from "next/link";
import type { ContentType } from "@/lib/content";

export type ReplyPostSummary = {
  readonly author: string;
  readonly excerpt: string;
  readonly href: string;
  readonly publishedAt?: string;
  readonly title: string;
  readonly type: ContentType;
};

type ReplyPostListProps = {
  readonly posts: readonly ReplyPostSummary[];
};

export function ReplyPostList({ posts }: ReplyPostListProps) {
  if (posts.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="게시글 답글">
      {posts.map((post) => (
        <Link key={`${post.type}:${post.href}`} href={post.href} className="block rounded-lg border border-[var(--line)] bg-white p-4 transition hover:border-[var(--foreground)]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
            <span className="font-semibold uppercase text-[var(--foreground)]">게시글 답글</span>
            <span>{post.author}</span>
            {post.publishedAt ? <time dateTime={post.publishedAt}>{post.publishedAt}</time> : null}
          </div>
          <h3 className="mt-2 break-words text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">{post.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{post.excerpt}</p>
        </Link>
      ))}
    </section>
  );
}
