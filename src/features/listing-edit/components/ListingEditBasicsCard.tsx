"use client";

import type { ProductListingDetail } from "../../../entities/listing/model/types";
import type { useListingBasicsForm } from "../model/useListingBasicsForm";
import { FieldPreview, SelectField, TextField } from "./ListingEditPrimitives";

function formatDateTimeLabel(value: string | null | undefined): string {
  if (!value) return "Puudub";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("et-EE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function ListingEditBasicsCard({ listing, basicsForm }: {
  listing: ProductListingDetail;
  basicsForm: ReturnType<typeof useListingBasicsForm>;
}) {
  return (
          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Põhiandmed
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <TextField
                label="Pealkiri"
                value={basicsForm.form.title}
                onChange={(value) => basicsForm.setField("title", value)}
              />
              <TextField
                label="Hind"
                value={basicsForm.form.price}
                onChange={(value) => basicsForm.setField("price", value)}
                placeholder="Näiteks 120 €"
              />
              <SelectField
                label="Seisukord"
                value={basicsForm.form.condition}
                onChange={(value) => basicsForm.setField("condition", value)}
                options={[
                  { value: "new", label: "Uus" },
                  { value: "used", label: "Kasutatud" },
                  { value: "damaged", label: "Vajab remonti" },
                ]}
              />
              <FieldPreview label="Aegub" value={formatDateTimeLabel(listing.activeUntil)} />
            </div>
          </section>
  );
}
