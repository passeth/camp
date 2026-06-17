import Link from "next/link";

const installSteps = [
  "Download camp-publisher.zip from this page.",
  "Unzip it. You should get a folder named camp-publisher.",
  "Move that folder into your vault at .obsidian/plugins/camp-publisher.",
  "Restart Obsidian or reload plugins.",
  "Open Settings -> Community plugins and enable Camp Publisher.",
  "Run Command Palette -> Camp Publisher: Login to Camp.",
  "Open a Markdown or HTML note and run Camp Publisher: Submit current note to Camp.",
];

export default function CampPublisherPluginPage() {
  return (
    <div className="mx-auto max-w-5xl pb-20 pt-10">
      <Link href="/" className="text-sm font-semibold text-[#5b6270] transition hover:text-[#171717]">
        Back to Camp
      </Link>
      <section className="mt-8 rounded-[2rem] border border-[#e7e5dc] bg-white p-6 shadow-[0_18px_60px_rgba(23,23,23,0.06)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8190]">Obsidian plugin</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-medium leading-[1.02] tracking-[-0.055em] text-[#171717] sm:text-6xl">
          Camp Publisher 설치
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5b6270]">
          Obsidian에서 현재 노트나 HTML lesson을 Camp로 제출합니다. Camp API가 GitHub content PR을 만들고, Actions 검증 후 자동 머지되면 Vercel 배포로 웹에 표시됩니다.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/downloads/camp-publisher.zip"
            className="rounded-full bg-[#171717] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3a3a34]"
          >
            플러그인 zip 다운로드
          </a>
          <a
            href="/downloads/camp-publisher.version.txt"
            className="rounded-full border border-[#d9d6ca] px-5 py-3 text-sm font-semibold text-[#171717] transition hover:border-[#171717]"
          >
            빌드 정보 보기
          </a>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[2rem] border border-[#e7e5dc] bg-[#fbfaf5] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">설치 순서</h2>
          <ol className="mt-5 space-y-4 text-sm leading-6 text-[#3f4652]">
            {installSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#171717]">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <aside className="rounded-[2rem] border border-[#171717] bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#171717]">현재 상태</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-[#7a8190]">지원 포맷</dt>
              <dd className="mt-1 text-[#171717]">Markdown, standalone HTML</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#7a8190]">인증</dt>
              <dd className="mt-1 text-[#171717]">Supabase member/admin login</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#7a8190]">주의</dt>
              <dd className="mt-1 text-[#171717]">실제 PR 생성에는 서버의 GitHub token 설정이 필요합니다.</dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>
  );
}
