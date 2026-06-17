"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText = "처리 중..." }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-full bg-[#1f2933] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3b5bdb] disabled:cursor-not-allowed disabled:opacity-60">
      {pending ? pendingText : children}
    </button>
  );
}
