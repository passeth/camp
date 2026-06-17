import { requireMember } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  await requireMember();
  return (
    <div>
      <section className="border-b border-[#e7e5dc] pb-12 pt-10">
        <p className="text-xs font-semibold uppercase text-[#6d7280]">Agent</p>
        <h1 className="mt-3 max-w-4xl text-5xl font-medium tracking-[-0.055em] text-[#171717] sm:text-7xl">Hermes Agent 준비 구역</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#5b6270]">MVP에서는 멤버 전용 접근 경계만 제공합니다. 후속 단계에서 VPS의 Hermes Agent, Obsidian Vault, sync/publish job 상태를 이 페이지에 연결합니다.</p>
      </section>
      <div className="mt-10 grid gap-4 md:grid-cols-[1.1fr_0.9fr_1fr]">
        {[["Daily Review", "메신저 대화를 요약하는 작업"], ["Teach Page", "주제별 학습 페이지 생성"], ["Sync", "Vault 변경사항 Git 동기화"]].map(([title, description]) => (
          <div key={title} className="rounded-lg border border-[#e7e5dc] bg-white p-6"><h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">{title}</h2><p className="mt-3 text-sm leading-6 text-[#5b6270]">{description}</p></div>
        ))}
      </div>
    </div>
  );
}
