export function EmptyState({ title, description }: { readonly title: string; readonly description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cfcac0] bg-white p-8 text-center">
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5b6270]">{description}</p>
    </div>
  );
}
