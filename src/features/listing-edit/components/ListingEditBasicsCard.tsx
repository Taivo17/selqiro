"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, translateListingEditMessage } from "../model/listingEditMessages";

import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import type { ProductListingDetail } from "../../../entities/listing/model/types";
import type { useListingBasicsForm } from "../model/useListingBasicsForm";
import { FieldPreview, SelectField, TextField } from "./ListingEditPrimitives";

function formatDateTimeLabel(value: string | null | undefined, language: string): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(localeForLanguage(language), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function ListingEditBasicsCard({ listing, basicsForm }: {
  listing: ProductListingDetail;
  basicsForm: ReturnType<typeof useListingBasicsForm>;
}) {
  const { language, t } = useV2Translation(listingEditMessages);

  return (
          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">{t("basics")}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <TextField
                label={t("title")}
                value={basicsForm.form.title}
                onChange={(value) => basicsForm.setField("title", value)}
              />
              <TextField
                label={t("price")}
                value={basicsForm.form.price}
                onChange={(value) => basicsForm.setField("price", value)}
                placeholder={t("priceExample")}
              />
              <SelectField
                label={t("condition")}
                value={basicsForm.form.condition}
                onChange={(value) => basicsForm.setField("condition", value)}
                options={[
                  { value: "new", label: t("new") },
                  { value: "used", label: t("used") },
                  { value: "damaged", label: t("needsRepair") },
                ]}
              />
              <FieldPreview label={t("expires")} value={formatDateTimeLabel(listing.activeUntil, language)} />
            </div>
          </section>
  );
}
