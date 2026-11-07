"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, translateListingEditMessage } from "../model/listingEditMessages";

import type { useListingBasicsForm } from "../model/useListingBasicsForm";
import { TextAreaField } from "./ListingEditPrimitives";

export default function ListingEditDescriptionCard({ basicsForm }: {
  basicsForm: ReturnType<typeof useListingBasicsForm>;
}) {
  const { language, t } = useV2Translation(listingEditMessages);

  return (
          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">{t("description")}</p>

            <TextAreaField
              label={t("description")}
              value={basicsForm.form.description}
              onChange={(value) => basicsForm.setField("description", value)}
            />
          </section>
  );
}
