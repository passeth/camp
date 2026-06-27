"use client";

import { useState } from "react";
import type { createWallClimbPost } from "@/app/wall-climb/actions";
import { WallClimbForm } from "@/components/wall-climb-form";

export function WallClimbComposer({ action }: { readonly action: typeof createWallClimbPost }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--foreground)] text-3xl font-light leading-none text-white shadow-sm transition hover:translate-y-[-1px] hover:bg-[#2b2b2b]"
        aria-label="벽타기 링크 올리기"
      >
        +
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#171717]/45 px-4 py-6 backdrop-blur-sm sm:py-10" role="dialog" aria-modal="true" aria-label="벽타기 링크 올리기">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="닫기"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-3xl rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 shadow-2xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Wall Climb</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)]">링크 올리기</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-xl leading-none text-[var(--foreground)] transition hover:border-[var(--foreground)]"
                aria-label="닫기"
              >
                x
              </button>
            </div>
            <WallClimbForm action={action} />
          </div>
        </div>
      ) : null}
    </>
  );
}
