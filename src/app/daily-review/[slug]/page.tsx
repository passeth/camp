import { notFound } from "next/navigation";
import { PostLayout } from "@/components/post-layout";
import { getEntriesByType, getEntryByTypeAndSlugAsync } from "@/lib/content";

type PageProps = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return getEntriesByType("daily-review").map((entry) => ({ slug: entry.slug })); }
export default async function DailyReviewDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = await getEntryByTypeAndSlugAsync("daily-review", slug);
  if (!entry) notFound();
  return <PostLayout entry={entry} backHref="/daily-review" backLabel="Daily Review" />;
}
