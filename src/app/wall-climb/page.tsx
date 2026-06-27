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
      {params.status === "published" ? <p className="mb-5 rounded-lg bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--foreground)]">벽타기 링크가 등록되었습니다.</p> : null}
      {params.error ? <p className="mb-5 rounded-lg bg-[var(--status-warning-bg)] px-4 py-3 text-sm text-[var(--status-warning-text)]">입력값이나 저장소 설정을 확인해 주세요.</p> : null}
      <SectionHeader eyebrow="Collected links" title="링크 모음" action={<WallClimbComposer action={createWallClimbPost} />} />
      <WallClimbList entries={entries} />
    </div>
  );
}
