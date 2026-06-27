import type { ContentEntry } from "@/lib/content";

function youtubeId(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0];
    if (url.hostname.endsWith("youtube.com")) return url.searchParams.get("v") ?? url.pathname.match(/\/shorts\/([^/?#]+)/)?.[1];
    return undefined;
  } catch {
    return undefined;
  }
}

function hostLabel(value?: string) {
  if (!value) return "link";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

function kindLabel(kind?: ContentEntry["sourceKind"]) {
  if (kind === "youtube") return "YouTube";
  if (kind === "github") return "GitHub";
  if (kind === "x") return "X";
  return "Link";
}

export function WallLinkPreview({ entry }: { readonly entry: ContentEntry }) {
  const href = entry.sourceUrl ?? entry.href;
  const label = entry.sourceTitle ?? entry.title;
  const videoId = youtubeId(entry.sourceUrl);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] transition hover:border-[var(--foreground)]"
    >
      {videoId ? (
        <div className="aspect-video w-full overflow-hidden bg-[#171717]">
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            width={480}
            height={360}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="p-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{kindLabel(entry.sourceKind)}</p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[var(--foreground)]">{label}</p>
        <p className="mt-1 truncate text-xs text-[var(--muted)]">{hostLabel(entry.sourceUrl)}</p>
      </div>
    </a>
  );
}
