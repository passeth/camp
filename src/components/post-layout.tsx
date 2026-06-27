import Link from "next/link";
import { CommentsSection } from "@/components/comments-section";
import { HtmlContentFrame } from "@/components/html-content-frame";
import { MarkdownView } from "@/components/markdown-view";
import { ShareLinkButton } from "@/components/share-link-button";
import { getParentEntryForReplyAsync, getReplyEntriesForParentAsync, type ContentEntry } from "@/lib/content";
import { getMarkdownHeadings } from "@/lib/markdown-headings";

function contentWithoutLeadingTitle(content: string, title: string) {
  const [firstLine, ...rest] = content.split("\n");
  if (firstLine === `# ${title}`) {
    return rest.join("\n").trimStart();
  }
  return content;
}

type PostLayoutProps = {
  readonly entry: ContentEntry;
  readonly backHref: string;
  readonly backLabel: string;
};

function replyPostHrefForEntry(entry: ContentEntry) {
  const params = new URLSearchParams({
    replyToType: entry.type,
    replyToSlug: entry.slug,
    replyToTitle: entry.title,
  });
  return `/write?${params.toString()}`;
}

function replyPostSummary(entry: ContentEntry) {
  return {
    author: entry.author,
    excerpt: entry.excerpt,
    href: entry.href,
    publishedAt: entry.publishedAt,
    title: entry.title,
    type: entry.type,
  };
}

export async function PostLayout({ entry, backHref, backLabel }: PostLayoutProps) {
  const date = entry.publishedAt ?? entry.createdAt;
  const bodyContent = entry.contentFormat === "html" ? entry.content : contentWithoutLeadingTitle(entry.content, entry.title);
  const headings = entry.contentFormat === "html" ? [] : getMarkdownHeadings(bodyContent);
  const [parentEntry, replyPosts] = await Promise.all([
    getParentEntryForReplyAsync(entry),
    getReplyEntriesForParentAsync(entry.type, entry.slug),
  ]);

  return (
    <article className="pb-16">
      <header className="border-b border-[#e7e5dc] pb-12 pt-10">
        <div className="max-w-80 sm:max-w-none">
          <Link href={backHref} className="text-sm font-semibold text-[#5b6270] transition hover:text-[#171717]">
            Back to {backLabel}
          </Link>
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#55aabb] bg-white px-3 py-1 text-xs font-semibold uppercase text-[#277687]">{entry.type}</span>
            {entry.category ? <span className="rounded-full border border-[#e7e5dc] bg-white px-3 py-1 text-xs font-semibold uppercase text-[#5b6270]">{entry.category}</span> : null}
          </div>
          <h1 className="mt-5 max-w-4xl break-words text-4xl font-medium leading-[1.02] tracking-[-0.055em] text-[#171717] sm:text-7xl sm:leading-[0.98]">{entry.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5b6270]">{entry.excerpt}</p>
        </div>
      </header>
      <div className="pt-8">
        <div className="mb-8 flex flex-col gap-4 border-y border-[#e7e5dc] py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="font-semibold text-[#171717]">{entry.author}</span>
            <span className="text-[#7a8190]">{date}</span>
            {entry.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-xs text-[#5b6270]">#{tag}</span>
            ))}
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:shrink-0">
            <a
              href="#comments"
              className="inline-flex justify-center whitespace-nowrap rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)]"
            >
              댓글로 이동
            </a>
            <ShareLinkButton />
          </div>
        </div>
        {parentEntry ? (
          <section className="mb-8 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4" aria-label="원문 게시글">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">Reply to</p>
            <Link href={parentEntry.href} className="mt-2 block text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)] transition hover:opacity-70">
              {parentEntry.title}
            </Link>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{parentEntry.excerpt}</p>
          </section>
        ) : null}
        {headings.length > 0 ? (
          <nav className="mb-8 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Table of contents">
            {headings.map((heading) => (
              <a key={heading.id} href={`#${heading.id}`} className="text-[#5b6270] transition hover:text-[#171717]">
                {heading.text}
              </a>
            ))}
          </nav>
        ) : null}
        <div className="min-w-0">
          {entry.contentFormat === "html" ? <HtmlContentFrame html={bodyContent} title={entry.title} /> : <MarkdownView content={bodyContent} />}
          <CommentsSection
            contentType={entry.type}
            contentSlug={entry.slug}
            replyPostHref={replyPostHrefForEntry(entry)}
            replyPosts={replyPosts.map(replyPostSummary)}
          />
        </div>
      </div>
    </article>
  );
}
