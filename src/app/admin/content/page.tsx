import Link from "next/link";
import { deleteContentPost } from "@/app/admin/content/actions";
import { StatusPill } from "@/components/status-pill";
import { requireAdmin } from "@/lib/auth";
import { getAllContentEntriesAsync } from "@/lib/content";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ error?: string; status?: string }> };

function editHref(type: string, slug: string) {
  const params = new URLSearchParams({ type, slug });
  return `/admin/content/edit?${params.toString()}`;
}

export default async function AdminContentPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const entries = await getAllContentEntriesAsync({ includeUnpublished: true });

  return (
    <div className="space-y-6">
      <section className="border-b border-[#e7e5dc] pb-10 pt-10">
        <p className="text-xs font-semibold uppercase text-[#6d7280]">Admin</p>
        <h1 className="mt-3 text-5xl font-medium tracking-[-0.055em] text-[#171717]">게시글 관리</h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-[#5b6270]">게시글을 수정하거나 숨김 처리합니다. 배포 환경에서는 Supabase 저장소에 반영됩니다.</p>
        {params.status ? <p className="mt-4 rounded-lg bg-[#e7f8ee] px-4 py-3 text-sm text-[#176b3a]">처리되었습니다.</p> : null}
        {params.error ? <p className="mt-4 rounded-lg bg-[#fff4d6] px-4 py-3 text-sm text-[#8a5a00]">요청을 처리하지 못했습니다.</p> : null}
      </section>
      <section className="divide-y divide-[#e7e5dc] rounded-lg border border-[#e7e5dc] bg-white">
        {entries.map((entry) => (
          <article key={`${entry.type}:${entry.slug}`} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill>{entry.type}</StatusPill>
                <StatusPill tone={entry.status === "published" ? "good" : "warn"}>{entry.status}</StatusPill>
              </div>
              <h2 className="mt-3 break-words text-xl font-semibold tracking-[-0.035em] text-[#171717]">{entry.title}</h2>
              <p className="mt-1 text-sm text-[#6d7280]">{entry.author} · {entry.publishedAt ?? entry.createdAt} · {entry.slug}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.status === "published" ? (
                <Link href={entry.href} className="rounded-full border border-[#e7e5dc] px-4 py-2 text-sm font-semibold">
                  보기
                </Link>
              ) : null}
              <Link href={editHref(entry.type, entry.slug)} className="rounded-full border border-[#171717] px-4 py-2 text-sm font-semibold">
                수정
              </Link>
              <form action={deleteContentPost}>
                <input type="hidden" name="type" value={entry.type} />
                <input type="hidden" name="slug" value={entry.slug} />
                <button className="rounded-full bg-[#171717] px-4 py-2 text-sm font-semibold text-white">
                  삭제
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
