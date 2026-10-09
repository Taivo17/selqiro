"use client";

import type { ProductListingDetail } from "../../../entities/listing/model/types";
import { FieldPreview } from "./ListingEditPrimitives";

function DetailsPreview({ listing }: { listing: ProductListingDetail }) {
  const details = Object.entries(
    listing.details || {}
  )
    .filter(([key]) => key !== "detailCategory")
    .slice(0, 8);

  if (details.length === 0) {
    return (
      <p className="mt-4 text-sm leading-6 text-neutral-500">
        Detailvälju ei ole lisatud.
      </p>
    );
  }

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {details.map(([key, value]) => (
        <FieldPreview
          key={key}
          label={key.replace(/_/g, " ")}
          value={
            typeof value === "string" || typeof value === "number"
              ? value
              : JSON.stringify(value)
          }
        />
      ))}
    </div>
  );
}

export default function ListingEditDetailsCard({ listing }: { listing: ProductListingDetail }) {
  return (
          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Detailid
            </p>

            <DetailsPreview listing={listing} />
          </section>
  );
}
