import Link from "next/link";
import { CommunityNav } from "@/components/community-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/92 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center justify-between gap-4">
        <Link href="/" className="flex w-fit items-center gap-3" aria-label="Camp home">
          <span className="grid h-9 w-9 grid-cols-3 items-end gap-0.5" aria-hidden="true">
            <span className="h-3 rounded-sm bg-[var(--brand)]" />
            <span className="h-6 rounded-sm bg-[var(--brand)]" />
            <span className="h-8 rounded-sm bg-[var(--brand)]" />
          </span>
          <strong className="text-xl tracking-[-0.03em] text-[var(--brand)]">Camp</strong>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/login" className="px-2 py-2 text-sm font-medium text-[var(--foreground)] transition hover:opacity-70">
            Log in
          </Link>
          <Link href="/write" className="rounded-full border border-[var(--foreground)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]">
            Write
          </Link>
          <Link href="/dashboard" className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium !text-white transition hover:opacity-80">
            Dashboard
          </Link>
        </div>
        </div>
        <CommunityNav variant="top" />
      </div>
    </header>
  );
}
