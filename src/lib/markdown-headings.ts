export type MarkdownHeading = {
  readonly id: string;
  readonly depth: 1 | 2 | 3;
  readonly text: string;
};

function plainHeadingText(text: string) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function baseSlug(text: string) {
  const slug = plainHeadingText(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return slug || "section";
}

export function getMarkdownHeadings(content: string): MarkdownHeading[] {
  const counts = new Map<string, number>();
  let inCode = false;

  return content.split("\n").flatMap((line) => {
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      return [];
    }

    if (inCode) return [];

    const match = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) return [];

    const depth = match[1].length as 1 | 2 | 3;
    const text = plainHeadingText(match[2]);
    const root = baseSlug(text);
    const count = counts.get(root) ?? 0;
    counts.set(root, count + 1);

    return [{ id: count === 0 ? root : `${root}-${count + 1}`, depth, text }];
  });
}
