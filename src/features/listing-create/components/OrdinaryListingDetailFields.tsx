"use client";
import { getFieldLabel } from "../../../../lib/categoryFields";
import { ordinaryDetailFields, setOrdinaryDetail, type OrdinaryListingFieldState } from "../model/ordinaryListingFields";
import { ordinaryDetailMaxLength } from "../model/ordinaryListingInput";

type Props = { value: OrdinaryListingFieldState; onChange: (value: OrdinaryListingFieldState) => void };
export default function OrdinaryListingDetailFields({ value, onChange }: Props) {
  const fields = ordinaryDetailFields(value.categoryPath);
  if (fields.length === 0) return null;
  return (
    <section className="min-w-0 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="ordinary-details-title">
      <h2 id="ordinary-details-title" className="text-2xl font-black tracking-tight">Detailid</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">Täida need väljad, mida tead. Lisa mõõtühik koos väärtusega, näiteks „90 kW” või „120 cm”. Teksti ja mõõtühikuid praegu ei teisendata.</p>
      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
        {fields.map(field => (
          <label key={field.key} className="block min-w-0 rounded-[22px] border border-neutral-200 bg-neutral-50 p-4" htmlFor={`ordinary-detail-${field.key}`}>
            <span className="break-words text-sm font-bold">{getFieldLabel(field.key, field.label, "et")}</span>
            <input id={`ordinary-detail-${field.key}`} type="text" maxLength={ordinaryDetailMaxLength(field.key)}
              value={value.detailValues[field.key] ?? ""}
              onChange={event => onChange(setOrdinaryDetail(value, field.key, event.target.value))}
              className="mt-2 block w-full rounded-xl border border-neutral-200 bg-white p-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2" />
          </label>
        ))}
      </div>
    </section>
  );
}
