"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, translateListingEditMessage } from "../model/listingEditMessages";

import { getFieldLabel } from "../../../../lib/categoryFields";
import type { ProductListingDetail } from "../../../entities/listing/model/types";
import { FieldPreview } from "./ListingEditPrimitives";

function DetailsPreview({ listing }: { listing: ProductListingDetail }) {
  const { language, t } = useV2Translation(listingEditMessages);

  const details = Object.entries(
    listing.details || {}
  )
    .filter(([key]) => key !== "detailCategory")
    .slice(0, 8);

  if (details.length === 0) {
    return (
      <p className="mt-4 text-sm leading-6 text-neutral-500">{t("noDetails")}</p>
    );
  }

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {details.map(([key, value]) => (
        <FieldPreview
          key={key}
          label={getFieldLabel(key, key.replace(/_/g, " "), language)}
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
  const { language, t } = useV2Translation(listingEditMessages);

  return (
          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">{t("details")}</p>

            <DetailsPreview listing={listing} />
          </section>
  );
}
