import Link from "next/link";

const navItems = [
  ["Members", "/members", false],
  ["Press", "/press", false],
  ["Topics", "/topics", true],
  ["Daily", "/daily-review", false],
  ["Study Log", "/study-log", false],
  ["Teach", "/teach", false],
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e7e5dc] bg-white/92 backdrop-blur">
      <div className="bg-[#111111] px-5 py-2 text-center text-xs font-medium text-white sm:px-8">
        <Link href="/teach" className="inline-flex max-w-full items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rotate-45 bg-[#d7f45a]" aria-hidden="true" />
          <span className="sm:hidden">Hermes-ready study archive</span>
          <span className="hidden sm:inline">Hermes-ready study archive: notes, reviews, and teach pages in one workflow</span>
          <span className="hidden h-px w-6 bg-white/70 sm:inline-block" aria-hidden="true" />
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex w-fit items-center gap-3" aria-label="Camp home">
          <span className="grid h-9 w-9 grid-cols-3 items-end gap-0.5" aria-hidden="true">
            <span className="h-3 rounded-sm bg-[#111111]" />
            <span className="h-6 rounded-sm bg-[#111111]" />
            <span className="h-8 rounded-sm bg-[#111111]" />
          </span>
          <strong className="text-xl tracking-[-0.03em] text-[#111111]">Camp</strong>
        </Link>
        <nav className="flex w-full max-w-full items-center gap-x-7 overflow-x-auto pb-1 text-xs font-semibold uppercase text-[#3f4652] lg:w-auto lg:flex-wrap lg:overflow-visible lg:pb-0">
          {navItems.map(([label, href, hasMenu]) => (
            <Link key={href} href={href} className="inline-flex shrink-0 items-center gap-1 transition hover:text-[#111111]">
              {label}
              {hasMenu ? <span aria-hidden="true">⌄</span> : null}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/login" className="px-2 py-2 text-sm font-medium text-[#3f4652] transition hover:text-[#111111]">
            Log in
          </Link>
          <Link href="/write" className="rounded-full border border-[#111111] bg-white px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-[#f2f2ed]">
            Write
          </Link>
          <Link href="/dashboard" className="rounded-full bg-[#111111] px-4 py-2 text-sm font-medium !text-white transition hover:bg-[#303030]">
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
