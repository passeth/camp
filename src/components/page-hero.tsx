import type { CSSProperties } from "react";

type MeshStyle = CSSProperties & { readonly "--mesh-color": string };

const heroMeshStyle: MeshStyle = { "--mesh-color": "#5b9dff" };

export function PageHero({
  eyebrow,
  title,
  description,
  showVisual = true,
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description: string;
  readonly showVisual?: boolean;
}) {
  return (
    <section className={`mb-14 grid gap-10 border-b border-[#e7e5dc] pb-12 ${showVisual ? "lg:min-h-[420px] lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-end" : ""}`}>
      <div className="max-w-80 pt-10 sm:max-w-none sm:pt-16 lg:pt-20">
        {eyebrow ? <p className="mb-5 text-xs font-semibold uppercase text-[#4c5564]">{eyebrow}</p> : null}
        <h1 className="text-balance max-w-4xl break-words text-5xl font-medium leading-[0.94] tracking-[-0.055em] text-[#171717] sm:text-7xl lg:text-[6.9rem]">{title}</h1>
        <p className="mt-8 max-w-2xl break-words text-lg leading-8 text-[#5b6270]">{description}</p>
      </div>
      {showVisual ? <div className="mesh-card hidden min-h-[310px] p-5 lg:block" style={heroMeshStyle}>
        <div className="research-window ml-auto mt-5 w-[72%] p-4">
          <p className="text-[0.62rem] font-semibold uppercase text-[#7a8190]">Archive preview</p>
          <div className="mt-4 grid grid-cols-[1fr_72px] gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-[#969ca8]">Study OS</p>
              <p className="mt-1 text-2xl font-semibold leading-none tracking-[-0.04em] text-[#171717]">Published notes</p>
            </div>
            <div className="rounded-lg bg-[#d7f45a] p-3 text-center">
              <p className="text-[0.62rem] font-semibold uppercase text-[#606800]">Themes</p>
              <p className="text-2xl font-semibold text-[#171717]">24</p>
            </div>
          </div>
          <div className="mt-5 h-28 rounded-lg bg-[#d7f45a]" />
        </div>
        <div className="research-window mt-5 w-[46%] p-4">
          <p className="text-xs font-semibold text-[#171717]">Daily review</p>
          <div className="mt-3 h-2 rounded-full bg-[#e7e5dc]">
            <div className="h-2 w-3/5 rounded-full bg-[#111111]" />
          </div>
          <p className="mt-5 text-sm leading-5 text-[#5b6270]">Hermes summary queued for editorial review.</p>
        </div>
      </div> : null}
    </section>
  );
}
