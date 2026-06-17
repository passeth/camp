import { z } from "zod";
import { contentTypes, type ContentType } from "@/lib/content";

export const contentSubmissionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  type: z.enum(contentTypes),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40).regex(/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u)).max(12).default([]),
  excerpt: z.string().trim().min(1).max(240),
  markdown: z.string().trim().min(1).max(120_000),
  status: z.enum(["review", "published"]).default("published"),
});

export type ContentSubmission = z.infer<typeof contentSubmissionSchema>;

const contentDirByType: Record<ContentType, string> = {
  press: "press",
  topic: "topics",
  "daily-review": "daily-review",
  "study-log": "study-log",
  teach: "teach",
};

function quoteYamlString(value: string) {
  return JSON.stringify(value);
}

function normalizeBody(markdown: string, title: string) {
  const trimmed = markdown.trim();
  if (trimmed.startsWith(`# ${title}\n`) || trimmed === `# ${title}`) return trimmed;
  return `# ${title}\n\n${trimmed}`;
}

export function buildContentPath(type: ContentType, slug: string) {
  return `content/${contentDirByType[type]}/${slug}.md`;
}

export function buildContentMarkdown(submission: ContentSubmission, author: string, memberSlug: string) {
  const now = new Date().toISOString().slice(0, 10);
  const category = submission.category?.trim();
  const frontmatter = [
    "---",
    `title: ${quoteYamlString(submission.title)}`,
    `slug: ${quoteYamlString(submission.slug)}`,
    `type: ${quoteYamlString(submission.type)}`,
    `status: ${quoteYamlString(submission.status)}`,
    `visibility: "public"`,
    `author: ${quoteYamlString(author)}`,
    `memberSlug: ${quoteYamlString(memberSlug)}`,
    category ? `category: ${quoteYamlString(category)}` : undefined,
    `tags: ${JSON.stringify([...new Set(submission.tags)])}`,
    `createdAt: ${quoteYamlString(now)}`,
    `updatedAt: ${quoteYamlString(now)}`,
    submission.status === "published" ? `publishedAt: ${quoteYamlString(now)}` : undefined,
    `excerpt: ${quoteYamlString(submission.excerpt)}`,
    "---",
  ].filter(Boolean);

  return `${frontmatter.join("\n")}\n\n${normalizeBody(submission.markdown, submission.title)}\n`;
}
