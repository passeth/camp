import { z } from "zod";
import { contentTypes, type ContentType } from "@/lib/content";

export const contentSubmissionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/),
  type: z.enum(contentTypes),
  contentFormat: z.enum(["markdown", "html"]).default("markdown"),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40).regex(/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u)).max(12).default([]),
  excerpt: z.string().trim().min(1).max(240),
  markdown: z.string().trim().min(1).max(120_000).optional(),
  html: z.string().trim().min(1).max(500_000).optional(),
  status: z.enum(["review", "published"]).default("published"),
}).superRefine((value, context) => {
  if (value.contentFormat === "html" && !value.html) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["html"], message: "HTML submissions require html" });
  }
  if (value.contentFormat === "markdown" && !value.markdown) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["markdown"], message: "Markdown submissions require markdown" });
  }
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

export function buildContentPath(type: ContentType, slug: string, format: "markdown" | "html" = "markdown") {
  return `content/${contentDirByType[type]}/${slug}.${format === "html" ? "html" : "md"}`;
}

export function buildContentFile(submission: ContentSubmission, author: string, memberSlug: string) {
  const now = new Date().toISOString().slice(0, 10);
  const category = submission.category?.trim();
  const frontmatter = [
    "---",
    `title: ${quoteYamlString(submission.title)}`,
    `slug: ${quoteYamlString(submission.slug)}`,
    `type: ${quoteYamlString(submission.type)}`,
    `contentFormat: ${quoteYamlString(submission.contentFormat)}`,
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

  const body = submission.contentFormat === "html" ? submission.html! : normalizeBody(submission.markdown!, submission.title);
  return `${frontmatter.join("\n")}\n\n${body.trim()}\n`;
}
