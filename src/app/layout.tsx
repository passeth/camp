import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CommunitySidebar } from "@/components/community-sidebar";
import { RecentPostsRail } from "@/components/recent-posts-rail";
import { SiteHeader } from "@/components/site-header";
import { getLatestEntries } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  title: "Camp",
  description: "AI-powered study magazine, wiki, and archive for study members.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const recentEntries = getLatestEntries(5);

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <SiteHeader />
        <div className="mx-auto grid min-h-screen w-full max-w-[1440px] gap-6 px-5 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_280px]">
          <CommunitySidebar />
          <main className="min-w-0 py-8 lg:py-10">{children}</main>
          <div className="min-w-0 lg:col-start-2 xl:sticky xl:top-24 xl:col-start-3 xl:row-start-1 xl:self-start">
            <RecentPostsRail entries={recentEntries} />
          </div>
        </div>
      </body>
    </html>
  );
}
