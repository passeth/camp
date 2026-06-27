type TextSegment = {
  readonly kind: "text";
  readonly value: string;
};

type UrlSegment = {
  readonly kind: "url";
  readonly value: string;
};

type CommentSegment = TextSegment | UrlSegment;

type LinkPreview =
  | {
    readonly kind: "link";
    readonly host: string;
    readonly label: string;
    readonly url: string;
  }
  | {
    readonly kind: "youtube";
    readonly label: string;
    readonly url: string;
    readonly videoId: string;
  };

type CommentBodyProps = {
  readonly body: string;
};

const urlPattern = /https?:\/\/[^\s<>"']+/gi;
const trailingPunctuationPattern = /[),.!?;:]+$/;

function trimUrlToken(value: string) {
  return value.replace(trailingPunctuationPattern, "");
}

function toHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url;
  } catch (error) {
    if (error instanceof TypeError) return undefined;
    throw error;
  }
}

function splitCommentBody(body: string) {
  const segments: CommentSegment[] = [];
  let cursor = 0;

  for (const match of body.matchAll(urlPattern)) {
    const matchedUrl = match[0];
    const index = match.index;
    if (index === undefined) continue;

    const url = trimUrlToken(matchedUrl);
    if (!toHttpUrl(url)) continue;
    if (index > cursor) segments.push({ kind: "text", value: body.slice(cursor, index) });
    segments.push({ kind: "url", value: url });
    cursor = index + url.length;
  }

  if (cursor < body.length) segments.push({ kind: "text", value: body.slice(cursor) });
  return segments;
}

function youtubeVideoId(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return cleanVideoId(url.pathname.split("/").find(Boolean));
  if (host !== "youtube.com" && host !== "m.youtube.com") return undefined;
  if (url.pathname === "/watch") return cleanVideoId(url.searchParams.get("v") ?? undefined);

  const [, route, id] = url.pathname.split("/");
  if (route === "shorts" || route === "embed" || route === "live") return cleanVideoId(id);
  return undefined;
}

function cleanVideoId(value?: string) {
  if (!value) return undefined;
  const [id] = value.split(/[?&#]/);
  if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) return undefined;
  return id;
}

function linkLabel(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "x.com" || host === "twitter.com") return "X에서 열기";
  if (host === "github.com") return "GitHub에서 열기";
  if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com") return "YouTube에서 보기";
  return `${host} 바로가기`;
}

function previewFromUrl(value: string): LinkPreview | undefined {
  const url = toHttpUrl(value);
  if (!url) return undefined;

  const videoId = youtubeVideoId(url);
  if (videoId) {
    return {
      kind: "youtube",
      label: "YouTube 미리보기",
      url: value,
      videoId,
    };
  }

  return {
    kind: "link",
    host: url.hostname.replace(/^www\./, ""),
    label: linkLabel(url),
    url: value,
  };
}

function previewsFromSegments(segments: readonly CommentSegment[]) {
  const seen = new Set<string>();
  const previews: LinkPreview[] = [];

  for (const segment of segments) {
    if (segment.kind !== "url" || seen.has(segment.value)) continue;
    const preview = previewFromUrl(segment.value);
    if (!preview) continue;
    seen.add(segment.value);
    previews.push(preview);
  }

  return previews;
}

function renderSegment(segment: CommentSegment, index: number) {
  if (segment.kind === "text") return <span key={`text-${index}`}>{segment.value}</span>;
  const url = toHttpUrl(segment.value);
  return (
    <a key={`url-${index}`} href={segment.value} target="_blank" rel="noreferrer" className="font-medium text-[var(--foreground)] underline underline-offset-4">
      {url?.hostname.replace(/^www\./, "") ?? segment.value}
    </a>
  );
}

function LinkPreviewCard({ preview }: { readonly preview: LinkPreview }) {
  if (preview.kind === "youtube") {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        <iframe
          className="aspect-video w-full"
          src={`https://www.youtube-nocookie.com/embed/${preview.videoId}`}
          title={preview.label}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        <a href={preview.url} target="_blank" rel="noreferrer" className="block border-t border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]">
          YouTube에서 열기
        </a>
      </div>
    );
  }

  return (
    <a href={preview.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-3 transition hover:border-[var(--foreground)]">
      <span className="block text-xs font-semibold uppercase text-[var(--muted)]">{preview.host}</span>
      <span className="mt-1 block text-sm font-semibold text-[var(--foreground)]">{preview.label}</span>
    </a>
  );
}

export function CommentBody({ body }: CommentBodyProps) {
  const segments = splitCommentBody(body);
  const previews = previewsFromSegments(segments);

  return (
    <div className="mt-3 space-y-3">
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--foreground)]">
        {segments.map(renderSegment)}
      </p>
      {previews.length > 0 ? (
        <div className="space-y-3">
          {previews.map((preview) => <LinkPreviewCard key={preview.url} preview={preview} />)}
        </div>
      ) : null}
    </div>
  );
}
