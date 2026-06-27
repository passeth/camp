import { notFound } from "next/navigation";
import { PostLayout } from "@/components/post-layout";
import { getEntriesByType, getEntryByTypeAndSlugAsync } from "@/lib/content";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getEntriesByType("camp-session").map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const entry = await getEntryByTypeAndSlugAsync("camp-session", slug);
  return { title: entry ? `${entry.title} | Camp` : "Camp Session | Camp" };
}

export default async function CampSessionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = await getEntryByTypeAndSlugAsync("camp-session", slug);
  if (!entry) notFound();

  return <PostLayout entry={entry} backHref="/camp-session" backLabel="Camp Session" />;
}
