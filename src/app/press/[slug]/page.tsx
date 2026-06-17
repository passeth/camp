import { notFound } from "next/navigation";
import { PostLayout } from "@/components/post-layout";
import { getEntriesByType, getEntryByTypeAndSlug } from "@/lib/content";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getEntriesByType("press").map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const entry = getEntryByTypeAndSlug("press", slug);
  return { title: entry ? `${entry.title} | Camp` : "Press | Camp" };
}

export default async function PressDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getEntryByTypeAndSlug("press", slug);
  if (!entry) notFound();

  return <PostLayout entry={entry} backHref="/press" backLabel="Press" />;
}
