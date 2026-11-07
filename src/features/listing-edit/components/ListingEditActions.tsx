"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, translateListingEditMessage } from "../model/listingEditMessages";

import Link from "next/link";
import type { ProductListingDetail } from "../../../entities/listing/model/types";
import type { useListingBasicsForm } from "../model/useListingBasicsForm";

export default function ListingEditActions({ listing, basicsForm }: {
  listing: ProductListingDetail;
  basicsForm: ReturnType<typeof useListingBasicsForm>;
}) {
  const { language, t } = useV2Translation(listingEditMessages);

  return (
        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">{t("actions")}</p>

            <button
              onClick={basicsForm.save}
              disabled={!basicsForm.canSave}
              className="mt-5 w-full rounded-full bg-black px-5 py-3 text-sm font-black text-white disabled:bg-neutral-200 disabled:text-neutral-500"
            >
              {basicsForm.saving
                ? t("savingDots")
                : basicsForm.dirty
                  ? t("saveChanges")
                  : t("noChanges")}
            </button>

            {basicsForm.saveError ? (
              <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm leading-6 text-red-800">
                {translateListingEditMessage(language, basicsForm.saveError)}
              </p>
            ) : null}

            {basicsForm.saved ? (
              <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{t("saved")}</p>
            ) : null}

            <Link
              href={`/v2/listing/${listing.id}`}
              className="mt-3 inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm"
            >{t("viewPublic")}</Link>

            <Link
              href="/v2/my-area"
              className="mt-3 inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm"
            >{t("backToMyArea")}</Link>
          </section>

          <section className="rounded-[30px] border border-blue-100 bg-blue-50 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-500">{t("nextStep")}</p>
            <h2 className="mt-2 text-xl font-black text-blue-950">{t("separateSaveTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-blue-900">{t("separateSaveHelp")}</p>
          </section>
        </aside>
  );
}
