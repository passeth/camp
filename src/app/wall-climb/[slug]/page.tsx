import { notFound } from "next/navigation";
import { PostLayout } from "@/components/post-layout";
import { getEntriesByType, getEntryByTypeAndSlugAsync } from "@/lib/content";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getEntriesByType("wall-climb").map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const entry = await getEntryByTypeAndSlugAsync("wall-climb", slug);
  return { title: entry ? `${entry.title} | Camp` : "벽타기 | Camp" };
}

export default async function WallClimbDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = await getEntryByTypeAndSlugAsync("wall-climb", slug);
  if (!entry) notFound();

  return <PostLayout entry={entry} backHref="/wall-climb" backLabel="벽타기" />;
}
