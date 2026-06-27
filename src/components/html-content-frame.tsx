"use client";

import { useState } from "react";

type HtmlContentFrameProps = {
  readonly html: string;
  readonly title: string;
};

export function HtmlContentFrame({ html, title }: HtmlContentFrameProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="min-w-0">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-full border border-[#171717] bg-[#171717] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3a3a34]"
        >
          전체보기
        </button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-[#d9d6ca] bg-white shadow-[0_18px_60px_rgba(23,23,23,0.08)]">
        <iframe
          title={title}
          srcDoc={html}
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          className="h-[720px] w-full bg-white"
        />
      </div>
      {expanded ? (
        <div className="fixed inset-0 z-50 bg-[#171717]/80 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={`${title} full view`}>
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[#e7e5dc] px-4 py-3">
              <p className="min-w-0 truncate text-sm font-semibold text-[#171717]">{title}</p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-full border border-[#d9d6ca] px-4 py-2 text-sm font-semibold text-[#171717] transition hover:border-[#171717]"
              >
                닫기
              </button>
            </div>
            <iframe
              title={`${title} full view`}
              srcDoc={html}
              sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              className="min-h-0 flex-1 bg-white"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
