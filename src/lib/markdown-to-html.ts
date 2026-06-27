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

  for (const rawLine of lines) {
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

  return nodes.join("\n");
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
