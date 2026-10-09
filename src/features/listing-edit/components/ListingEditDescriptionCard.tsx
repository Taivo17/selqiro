"use client";

import type { useListingBasicsForm } from "../model/useListingBasicsForm";
import { TextAreaField } from "./ListingEditPrimitives";

export default function ListingEditDescriptionCard({ basicsForm }: {
  basicsForm: ReturnType<typeof useListingBasicsForm>;
}) {
  return (
          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Kirjeldus
            </p>

            <TextAreaField
              label="Kirjeldus"
              value={basicsForm.form.description}
              onChange={(value) => basicsForm.setField("description", value)}
            />
          </section>
  );
}
