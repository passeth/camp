import type { ReactNode } from "react";

type SectionHeaderProps = {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
};

export function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <section className="mb-8 flex flex-col gap-5 border-t border-[#e7e5dc] pt-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="text-xs font-semibold uppercase text-[#6d7280]">{eyebrow}</p> : null}
        <h2 className="mt-2 text-4xl font-medium tracking-[-0.04em] text-[#171717]">{title}</h2>
        {description ? <p className="mt-4 text-base leading-7 text-[#5b6270]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
