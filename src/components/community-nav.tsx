"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Topics", href: "/topics" },
  { label: "News Digest", href: "/press" },
  { label: "Study Log", href: "/study-log" },
] as const;

type CommunityNavProps = {
  readonly variant: "top" | "side";
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CommunityNav({ variant }: CommunityNavProps) {
  const pathname = usePathname();

  if (variant === "top") {
    return (
      <nav className="flex w-full max-w-full items-center gap-x-6 overflow-x-auto pb-1 text-xs font-semibold uppercase text-[var(--muted)] lg:hidden" aria-label="Primary">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 border-b-2 py-1 transition ${active ? "border-[var(--foreground)] text-[var(--foreground)]" : "border-transparent hover:text-[var(--foreground)]"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-1" aria-label="Community sections">
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            style={active ? { color: "#fff" } : undefined}
            className={`block rounded-md px-3 py-2 text-sm font-semibold transition ${active ? "bg-[var(--foreground)]" : "text-[var(--foreground)] hover:bg-[var(--surface)]"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
