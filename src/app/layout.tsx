import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";


export const metadata: Metadata = {
  title: "Camp",
  description: "AI-powered study magazine, wiki, and archive for study members.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <SiteHeader />
        <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-10 sm:px-8">{children}</main>
      </body>
    </html>
  );
}
