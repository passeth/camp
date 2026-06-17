import { notFound } from "next/navigation";
import { PostLayout } from "@/components/post-layout";
import { getEntriesByType, getEntryByTypeAndSlug } from "@/lib/content";

type PageProps = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return getEntriesByType("study-log").map((entry) => ({ slug: entry.slug })); }
export default async function StudyLogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getEntryByTypeAndSlug("study-log", slug);
  if (!entry) notFound();
  return <PostLayout entry={entry} backHref="/study-log" backLabel="Study Log" />;
}
