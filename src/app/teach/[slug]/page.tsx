import { notFound } from "next/navigation";
import { PostLayout } from "@/components/post-layout";
import { getEntriesByType, getEntryByTypeAndSlug } from "@/lib/content";

type PageProps = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return getEntriesByType("teach").map((entry) => ({ slug: entry.slug })); }
export default async function TeachDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getEntryByTypeAndSlug("teach", slug);
  if (!entry) notFound();
  return <PostLayout entry={entry} backHref="/teach" backLabel="Teach" />;
}
