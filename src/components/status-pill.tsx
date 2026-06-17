export function StatusPill({ children, tone = "neutral" }: { readonly children: React.ReactNode; readonly tone?: "neutral" | "good" | "warn" }) {
  const className = {
    neutral: "border-[#e7e5dc] bg-white text-[#5b6270]",
    good: "border-[#b9decf] bg-[#eef8f6] text-[#176b3a]",
    warn: "border-[#ead99a] bg-[#fff4d6] text-[#8a5a00]",
  }[tone];

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}
