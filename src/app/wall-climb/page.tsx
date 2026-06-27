import { SectionHeader } from "@/components/section-header";
import { WallClimbComposer } from "@/components/wall-climb-composer";
import { WallClimbList } from "@/components/wall-climb-list";
import { getEntriesByTypeAsync } from "@/lib/content";
import { filterEntriesByTag } from "@/lib/tags";
import { createWallClimbPost } from "./actions";

type PageProps = { searchParams: Promise<{ error?: string; status?: string; tag?: string }> };

export default async function WallClimbPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const entries = filterEntriesByTag(await getEntriesByTypeAsync("wall-climb"), params.tag);

  return (
    <div>
      <section className="mb-5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Wall Climb</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.035em] text-[var(--foreground)] sm:text-4xl">{params.tag ? `#${params.tag}` : "벽타기"}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">채팅방에 올라온 정보와 링크를 멘트, 원문 링크, 짧은 AI 요약으로 모읍니다.</p>
        {params.status === "published" ? <p className="mt-4 rounded-lg bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--foreground)]">벽타기 링크가 등록되었습니다.</p> : null}
        {params.error ? <p className="mt-4 rounded-lg bg-[var(--status-warning-bg)] px-4 py-3 text-sm text-[var(--status-warning-text)]">입력값이나 저장소 설정을 확인해 주세요.</p> : null}
      </section>
      <SectionHeader eyebrow="Collected links" title="링크 모음" action={<WallClimbComposer action={createWallClimbPost} />} />
      <WallClimbList entries={entries} />
    </div>
  );
}
