function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function stripFrontmatter(markdown: string) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, (_match, label: string, href: string) => {
      return `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${label}</a>`;
    })
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function splitTableRow(value: string) {
  const trimmed = value.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(value: string) {
  const cells = splitTableRow(value);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isTableRow(value: string) {
  return value.trim().includes("|") && splitTableRow(value).length > 1;
}

function renderTable(rows: readonly string[]) {
  const [head, _separator, ...body] = rows;
  const headers = splitTableRow(head);
  const bodyRows = body.map(splitTableRow);

  return [
    "<div class=\"table-wrap\"><table>",
    `<thead><tr>${headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead>`,
    `<tbody>${bodyRows.map((row) => `<tr>${headers.map((_, index) => `<td>${inlineMarkdown(row[index] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody>`,
    "</table></div>",
  ].join("");
}

function normalizeTableRow(value: string) {
  const trimmed = value.trim();
  return `${trimmed.startsWith("|") ? "" : "| "}${trimmed}${trimmed.endsWith("|") ? "" : " |"}`;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function rowsFromCollapsedTable(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const separatorMatch = normalized.match(/\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?/);
  if (!separatorMatch || separatorMatch.index === undefined) return undefined;

  const separator = normalizeTableRow(separatorMatch[0]);
  const columnCount = splitTableRow(separator).length;
  if (columnCount < 2) return undefined;

  const header = normalizeTableRow(normalized.slice(0, separatorMatch.index));
  if (splitTableRow(header).length !== columnCount) return undefined;

  const body = normalized.slice(separatorMatch.index + separatorMatch[0].length);
  const bodyCells = body
    .replace(/^\|+/, "")
    .replace(/\|+$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);

  if (bodyCells.length < columnCount) return undefined;

  const bodyRows: string[] = [];
  for (let index = 0; index < bodyCells.length; index += columnCount) {
    const cells = bodyCells.slice(index, index + columnCount);
    if (cells.length === columnCount) bodyRows.push(`| ${cells.join(" | ")} |`);
  }

  return bodyRows.length ? [header, separator, ...bodyRows] : undefined;
}

function youtubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname === "youtu.be"
      ? parsed.pathname.split("/").filter(Boolean)[0]
      : parsed.hostname.endsWith("youtube.com")
        ? parsed.searchParams.get("v") ?? parsed.pathname.match(/\/shorts\/([^/?#]+)/)?.[1]
        : undefined;
    return id ? `https://www.youtube.com/embed/${escapeAttribute(id)}` : undefined;
  } catch {
    return undefined;
  }
}

function renderEmbedBlock(kind: "youtube" | "link", label: string, href: string) {
  const safeLabel = inlineMarkdown(label);
  const safeHref = escapeAttribute(href);

  if (kind === "youtube") {
    const embedUrl = youtubeEmbedUrl(href);
    if (embedUrl) {
      return [
        "<section class=\"embed-card embed-youtube\">",
        `<iframe title="${escapeAttribute(label)}" src="${embedUrl}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
        `<a href="${safeHref}" target="_blank" rel="noreferrer">${safeLabel}</a>`,
        "</section>",
      ].join("");
    }
  }

  return [
    "<section class=\"embed-card embed-link\">",
    "<p class=\"embed-eyebrow\">바로가기</p>",
    `<a href="${safeHref}" target="_blank" rel="noreferrer">${safeLabel}</a>`,
    `<p class=\"embed-url\">${escapeHtml(href)}</p>`,
    "</section>",
  ].join("");
}

function parseEmbedDirective(value: string) {
  const match = value.match(/^::camp-(youtube|link)\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
  if (!match) return undefined;
  return {
    kind: match[1] as "youtube" | "link",
    label: match[2],
    href: match[3],
  };
}

export function markdownToHtmlBody(markdown: string) {
  const lines = stripFrontmatter(markdown).split(/\r?\n/);
  const nodes: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let orderedListItems: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    nodes.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length) {
      nodes.push(`<ul>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      listItems = [];
    }
    if (orderedListItems.length) {
      nodes.push(`<ol>${orderedListItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
      orderedListItems = [];
    }
  };

  const flushCode = () => {
    nodes.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const embed = parseEmbedDirective(trimmed);
    if (embed) {
      flushParagraph();
      flushList();
      nodes.push(renderEmbedBlock(embed.kind, embed.label, embed.href));
      continue;
    }

    if (isTableRow(trimmed) && lines[index + 1] && isTableSeparator(lines[index + 1].trim())) {
      const tableRows = [trimmed, lines[index + 1].trim()];
      index += 2;
      while (lines[index] && isTableRow(lines[index].trim())) {
        tableRows.push(lines[index].trim());
        index += 1;
      }
      index -= 1;
      flushParagraph();
      flushList();
      nodes.push(renderTable(tableRows));
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const text = heading[2];
      const id = slugifyHeading(text);
      nodes.push(`<h${level}${id ? ` id="${escapeAttribute(id)}"` : ""}>${inlineMarkdown(text)}</h${level}>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (orderedListItems.length) flushList();
      listItems.push(unordered[1]);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listItems.length) flushList();
      orderedListItems.push(ordered[1]);
      continue;
    }

    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      nodes.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  if (inCode || codeLines.length) flushCode();

  return repairMarkdownTablesInHtml(nodes.join("\n"));
}

export function markdownToHtmlDocument(markdown: string, title: string) {
  const body = markdownToHtmlBody(markdown);
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; --ink: #171717; --muted: #5b6270; --line: #e7e5dc; --soft: #f7f6f1; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(760px, calc(100% - 40px)); margin: 0 auto; padding: 48px 0 64px; }
    h1, h2, h3, h4 { margin: 1.35em 0 0.45em; line-height: 1.08; letter-spacing: -0.035em; }
    h1 { margin-top: 0; font-size: clamp(2.25rem, 6vw, 4.5rem); }
    h2 { font-size: clamp(1.75rem, 4vw, 2.6rem); border-top: 1px solid var(--line); padding-top: 1.1em; }
    h3 { font-size: 1.45rem; }
    h4 { font-size: 1.15rem; }
    p, li, blockquote { font-size: 1rem; line-height: 1.8; }
    p { margin: 0 0 1.1em; color: #2f3744; }
    ul, ol { margin: 0 0 1.25em 1.25em; padding: 0; color: #2f3744; }
    li + li { margin-top: 0.35em; }
    a { color: #1d6f8f; font-weight: 650; text-decoration-thickness: 0.08em; text-underline-offset: 0.18em; }
    .table-wrap { margin: 1.4rem 0; overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; min-width: 560px; }
    th, td { border-bottom: 1px solid var(--line); padding: 0.8rem 0.9rem; text-align: left; vertical-align: top; font-size: 0.95rem; line-height: 1.6; }
    th { background: var(--soft); color: var(--ink); font-weight: 750; }
    tr:last-child td { border-bottom: 0; }
    .embed-card { margin: 1.4rem 0; border: 1px solid var(--line); border-radius: 14px; background: var(--soft); padding: 1rem; }
    .embed-youtube iframe { display: block; width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 10px; background: #111; }
    .embed-youtube a { display: inline-block; margin-top: 0.75rem; }
    .embed-link { display: grid; gap: 0.35rem; }
    .embed-eyebrow { margin: 0; font-size: 0.75rem; font-weight: 750; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
    .embed-url { margin: 0; overflow-wrap: anywhere; font-size: 0.88rem; color: var(--muted); }
    blockquote { margin: 1.5em 0; border-left: 4px solid var(--ink); background: var(--soft); padding: 1em 1.2em; color: var(--muted); }
    pre { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; background: #111; color: #f8fafc; padding: 1rem; }
    code { border-radius: 5px; background: #f0eee7; padding: 0.15em 0.35em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
    pre code { background: transparent; padding: 0; color: inherit; }
  </style>
</head>
<body>
  <main>
${body}
  </main>
</body>
</html>`;
}

export function repairMarkdownTablesInHtml(html: string) {
  return html.replace(/<p>([^<]*\|[^<]*-{3,}[^<]*\|[^<]*)<\/p>/g, (match, content: string) => {
    const decoded = decodeHtmlEntities(content);
    const rows = decoded.includes("| |")
      ? decoded.split(/\s+\|\s+\|/).map((row) => {
        const trimmed = row.trim();
        return normalizeTableRow(trimmed);
      })
      : decoded
        .split(/\s+(?=\|)/)
        .map((row) => row.trim())
        .filter(Boolean);
    const separatorIndex = rows.findIndex(isTableSeparator);
    if (separatorIndex === 1 && rows.length >= 3) return renderTable(rows);

    const collapsedRows = rowsFromCollapsedTable(decoded);
    return collapsedRows ? renderTable(collapsedRows) : match;
  });
}
