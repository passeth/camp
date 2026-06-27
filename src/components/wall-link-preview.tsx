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

function githubPreviewImage(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return undefined;
    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return undefined;
    return `https://opengraph.githubassets.com/camp/${encodeURIComponent(owner)}/${encodeURIComponent(repo.replace(/\.git$/i, ""))}`;
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

function visualLabel(kind?: ContentEntry["sourceKind"]) {
  if (kind === "github") return "repository";
  if (kind === "x") return "post preview";
  return "link preview";
}

export function WallLinkPreview({ entry }: { readonly entry: ContentEntry }) {
  const href = entry.sourceUrl ?? entry.href;
  const label = entry.sourceTitle ?? entry.title;
  const host = hostLabel(entry.sourceUrl);
  const videoId = youtubeId(entry.sourceUrl);
  const imageSrc = entry.sourceImage
    ?? githubPreviewImage(entry.sourceUrl)
    ?? (videoId ? `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : undefined);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-lg border border-[#2f2f2f] bg-[#333] shadow-sm transition hover:translate-y-[-1px] hover:border-[#555]"
    >
      {imageSrc ? (
        <div
          className="aspect-video w-full bg-[#171717] bg-cover bg-center transition group-hover:scale-[1.02]"
          style={{ backgroundImage: `url(${imageSrc})` }}
          aria-label={label}
        />
      ) : (
        <div className="aspect-video w-full bg-[#111] p-4 text-white">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#8b93a3]">{kindLabel(entry.sourceKind)}</p>
          <div className="mt-6 border-l border-t border-[#4f8cff] pl-3 pt-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8b93a3]">{visualLabel(entry.sourceKind)}</p>
            <p className="mt-2 truncate text-sm font-semibold leading-tight text-[#d8d8d8]">{host}</p>
          </div>
        </div>
      )}
      <div className="space-y-1.5 p-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#b8b8b8]">{kindLabel(entry.sourceKind)}</p>
        <p className="truncate text-xs font-medium leading-5 text-[#54a3ff]">{host}</p>
      </div>
    </a>
  );
}
