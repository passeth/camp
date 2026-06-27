import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CommunitySidebar } from "@/components/community-sidebar";
import { RecentPostsRail } from "@/components/recent-posts-rail";
import { SiteHeader } from "@/components/site-header";
import {
  contentEntryKey,
  getChildPostsByParent,
  getCommentCountsForEntries,
  getLinkedPostKeys,
  getReplyPostCountsByParent,
} from "@/lib/comment-counts";
import { getAllContentEntriesAsync } from "@/lib/content";
import { getTagSummaries } from "@/lib/tags";
import "./globals.css";

export const metadata: Metadata = {
  title: "Camp",
  description: "AI-powered study magazine, wiki, and archive for study members.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const allEntries = await getAllContentEntriesAsync();
  const recentEntries = allEntries.slice(0, 5);
  const tagSummaries = getTagSummaries(allEntries);
  const childPostsByParentKey = getChildPostsByParent(allEntries);
  const [commentCounts, replyPostCounts] = await Promise.all([
    getCommentCountsForEntries(recentEntries),
    Promise.resolve(getReplyPostCountsByParent(allEntries)),
  ]);
  const linkedPostKeys = getLinkedPostKeys(allEntries);
  const replyCounts = Object.fromEntries(
    recentEntries.map((entry) => {
      const key = contentEntryKey(entry);
      return [key, (commentCounts[key] ?? 0) + (replyPostCounts[key] ?? 0)];
    }),
  );

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <SiteHeader />
        <div className="mx-auto grid min-h-screen w-full max-w-[1440px] gap-6 px-5 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_280px]">
          <CommunitySidebar tags={tagSummaries} />
          <main className="min-w-0 py-8 lg:py-10">{children}</main>
          <div className="min-w-0 lg:col-start-2 xl:sticky xl:top-24 xl:col-start-3 xl:row-start-1 xl:self-start">
            <RecentPostsRail childPostsByParentKey={childPostsByParentKey} entries={recentEntries} linkedPostKeys={[...linkedPostKeys]} replyCounts={replyCounts} />
          </div>
        </div>
      </body>
    </html>
  );
}
