import { SubmitButton } from "@/components/submit-button";
import { signInAsAdmin, signInWithEmail, signInWithPassword } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ status?: string; error?: string }> };

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-xl border-t border-[#171717] pt-10">
      <p className="text-xs font-semibold uppercase text-[#6d7280]">Login</p>
      <h1 className="mt-3 text-5xl font-medium tracking-[-0.055em] text-[#171717]">멤버 로그인</h1>
      <p className="mt-5 leading-7 text-[#5b6270]">이메일/패스워드로 로그인하거나 매직 링크를 받을 수 있습니다. 가입 직후에는 관리자 승인이 필요합니다.</p>
      {params.status === "check-email" ? <p className="mt-5 rounded-2xl bg-[#e7f8ee] p-4 text-sm text-[#176b3a]">이메일로 로그인 링크를 보냈습니다.</p> : null}
      {params.error ? <p className="mt-5 rounded-2xl bg-[#fff4d6] p-4 text-sm text-[#8a5a00]">로그인 요청을 처리하지 못했습니다.</p> : null}
      <form action={signInWithPassword} className="mt-8 space-y-4 rounded-lg border border-[#e7e5dc] bg-white p-6">
        <div>
          <p className="text-sm font-semibold text-[#171717]">이메일/패스워드 로그인</p>
          <p className="mt-1 text-sm text-[#6d7280]">관리자와 승인된 멤버는 패스워드로 바로 로그인할 수 있습니다.</p>
        </div>
        <label className="block text-sm font-medium text-[#374151]">
          이메일
          <input className="mt-2" name="email" type="email" required placeholder="you@example.com" />
        </label>
        <label className="block text-sm font-medium text-[#374151]">
          패스워드
          <input className="mt-2" name="password" type="password" required placeholder="••••••••" />
        </label>
        <SubmitButton pendingText="로그인 중...">로그인</SubmitButton>
      </form>
      <form action={signInWithEmail} className="mt-4 space-y-4 rounded-lg border border-[#e7e5dc] bg-white p-6">
        <div>
          <p className="text-sm font-semibold text-[#171717]">매직 링크 로그인</p>
          <p className="mt-1 text-sm text-[#6d7280]">패스워드 없이 이메일 링크로 로그인합니다.</p>
        </div>
        <label className="block text-sm font-medium text-[#374151]">
          이메일
          <input className="mt-2" name="email" type="email" required placeholder="you@example.com" />
        </label>
        <SubmitButton pendingText="링크 보내는 중...">로그인 링크 받기</SubmitButton>
      </form>
      <form action={signInAsAdmin} className="mt-4 space-y-4 rounded-lg border border-[#e7e5dc] bg-white p-6">
        <div>
          <p className="text-sm font-semibold text-[#171717]">관리자 로그인</p>
          <p className="mt-1 text-sm text-[#6d7280]">운영자 비밀번호로 게시글 수정과 삭제 화면에 들어갑니다.</p>
        </div>
        <label className="block text-sm font-medium text-[#374151]">
          관리자 비밀번호
          <input className="mt-2" name="adminPassword" type="password" required placeholder="관리자 비밀번호" />
        </label>
        <SubmitButton pendingText="관리자 로그인 중...">관리자 로그인</SubmitButton>
      </form>
    </div>
  );
}
