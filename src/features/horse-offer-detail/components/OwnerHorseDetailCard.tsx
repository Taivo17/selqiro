import type { ReactNode } from "react";
import type { HorseDetailField } from "../../../entities/horse-offer/model/ownerPresentation";

export function OwnerHorseDetailCard({ children, eyebrow, title }: {
  children: ReactNode; eyebrow?: string; title: string;
}) {
  return (
    <section className="min-w-0 rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{eyebrow}</p> : null}
      <h2 className="mt-2 text-xl font-semibold text-zinc-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function OwnerHorseDetailValue({ label, value }: HorseDetailField) {
  if (value === null || value === "") return null;
  return (
    <div className="min-w-0 rounded-2xl border border-black/8 bg-zinc-50 px-4 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-zinc-900">{value}</dd>
    </div>
  );
}

export function OwnerHorseDetailValues({ fields, empty, columns = false }: {
  fields: HorseDetailField[]; empty: string; columns?: boolean;
}) {
  const visible = fields.filter(field => field.value !== null && field.value !== "");
  if (!visible.length) return <p className="text-sm text-zinc-500">{empty}</p>;
  return <dl className={`grid gap-3${columns ? " sm:grid-cols-2" : ""}`}>
    {visible.map(field => <OwnerHorseDetailValue key={field.label} {...field} />)}
  </dl>;
}
