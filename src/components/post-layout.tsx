import type { CSSProperties } from "react";
import Link from "next/link";
import { MarkdownView } from "@/components/markdown-view";
import type { ContentEntry } from "@/lib/content";
import { getMarkdownHeadings } from "@/lib/markdown-headings";

type MeshStyle = CSSProperties & { readonly "--mesh-color": string };

const postMeshStyle: MeshStyle = { "--mesh-color": "#76dec6" };

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

export function PostLayout({ entry, backHref, backLabel }: PostLayoutProps) {
  const date = entry.publishedAt ?? entry.createdAt;
  const bodyContent = contentWithoutLeadingTitle(entry.content, entry.title);
  const headings = getMarkdownHeadings(bodyContent);

  return (
    <article className="pb-16">
      <header className="grid gap-10 border-b border-[#e7e5dc] pb-12 pt-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
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
        <div className="mesh-card hidden min-h-[300px] p-5 md:block" style={postMeshStyle}>
          <div className="research-window ml-auto w-[78%] p-5">
            <p className="text-[0.65rem] font-semibold uppercase text-[#7a8190]">Post brief</p>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#171717]">{entry.tags.length || 1}</p>
            <p className="text-xs font-semibold uppercase text-[#7a8190]">linked tags</p>
            <div className="mt-5 h-24 rounded-lg bg-[#d7f45a]" />
          </div>
          <div className="research-window mt-5 w-[58%] p-4">
            <p className="text-xs font-semibold text-[#171717]">{entry.author}</p>
            <p className="mt-2 text-sm text-[#5b6270]">{date}</p>
          </div>
        </div>
      </header>
      <div className="grid max-w-80 gap-10 pt-10 sm:max-w-none lg:grid-cols-[260px_minmax(0,760px)] lg:items-start">
        <aside className="lg:sticky lg:top-36">
          <div className="border-t border-[#171717] pt-4">
            <p className="text-xs font-semibold uppercase text-[#6d7280]">In this post</p>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-[#7a8190]">Author</dt>
                <dd className="mt-1 font-semibold text-[#171717]">{entry.author}</dd>
              </div>
              <div>
                <dt className="text-[#7a8190]">Published</dt>
                <dd className="mt-1 font-semibold text-[#171717]">{date}</dd>
              </div>
            </dl>
            {entry.tags.length > 0 ? (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase text-[#7a8190]">Hashtags</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-xs text-[#5b6270]">#{tag}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {headings.length > 0 ? (
              <nav className="mt-7 border-t border-[#e7e5dc] pt-5" aria-label="Table of contents">
                <p className="text-xs font-semibold uppercase text-[#7a8190]">Contents</p>
                <ol className="mt-3 space-y-2 text-sm leading-5">
                  {headings.map((heading) => (
                    <li key={heading.id} className={heading.depth === 1 ? "" : heading.depth === 2 ? "pl-3" : "pl-6"}>
                      <a href={`#${heading.id}`} className="block text-[#5b6270] transition hover:text-[#171717]">
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
          </div>
        </aside>
        <MarkdownView content={bodyContent} />
      </div>
    </article>
  );
}
