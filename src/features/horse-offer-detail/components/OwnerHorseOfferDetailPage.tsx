"use client";

import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import Link from "next/link";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { horsePublicationMessages } from "../../horse-publication/model/horsePublicationMessages";
import { getOwnerHorsePresentation } from "../../../entities/horse-offer/model/ownerPresentation";
import { useOwnerHorseOfferDetail } from "../model/useOwnerHorseOfferDetail";
import { OWNER_HORSE_KIND_LABELS, OWNER_HORSE_STATUS_LABELS, formatOwnerHorseDate, getOwnerHorseStatusClassName } from "../model/ownerHorseDetailLabels";
import { OwnerHorseDetailCard as Card, OwnerHorseDetailValues as Values } from "./OwnerHorseDetailCard";

export default function OwnerHorseOfferDetailPage({ offerId }: { offerId: string }) {
  const { language, r } = useMarketplaceTranslation();
  const {t} = useV2Translation(horsePublicationMessages);
  const { detail, errorMessage, isLoading, isNotFound, reload } = useOwnerHorseOfferDetail(offerId);
  if (isLoading) return <div className="mx-auto w-full max-w-6xl py-7" role="status">
    <p>{r(marketplaceMessage("horse.loading_horse_listing.92fbfa"))}</p>
    <div aria-hidden="true" className="mt-5 h-96 animate-pulse rounded-[28px] bg-zinc-200" />
  </div>;
  if (!detail) return (
    <div className="mx-auto max-w-3xl rounded-[28px] border border-black/10 bg-white p-6 text-center shadow-sm sm:p-10">
      <h1 className="text-2xl font-semibold">{r(isNotFound ? marketplaceMessage("horse.horse_listing_not_found.5592ba") : marketplaceMessage("horse.the_horse_listing_could_not_be_loaded.3d0207"))}</h1>
      <p className="mt-4 text-sm leading-6 text-zinc-600" role="status">
        {r(isNotFound ? marketplaceMessage("horse.the_listing_does_not_exist_or_does_not.7a2246") : errorMessage || marketplaceMessage("horse.an_unexpected_error_occurred_while_loading.548aa3"))}
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {r(!isNotFound ? <button type="button" onClick={reload} className="rounded-full border px-5 py-3 text-sm font-semibold">{r(marketplaceMessage("horse.try_again.8c63df"))}</button> : null)}
        <Link href="/v2/my-area" className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">{r(marketplaceMessage("horse.back_to_my_area.17fad0"))}</Link>
      </div>
    </div>
  );
  const view = getOwnerHorsePresentation(detail, language);
  const title = detail.title.trim() || (!view.isWanted && detail.horseName?.trim()) || marketplaceMessage("horse.untitled_horse_listing.9905c6");
  const kind = OWNER_HORSE_KIND_LABELS[detail.offerType] || detail.offerType;
  const status = OWNER_HORSE_STATUS_LABELS[detail.status] || detail.status;
  const isDraft = detail.status === "draft";

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl pb-8" data-owner-horse-offer-id={detail.offerId}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href="/v2/my-area" className="text-sm font-semibold text-zinc-600 hover:text-zinc-950">{r(marketplaceMessage("horse.back_to_my_area.2b7192"))}</Link>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">{r(marketplaceMessage("horse.owner_view_only_visible_to_you.104f9c"))}</p>
          <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{r(title)}</h1>
          <p className="mt-3 text-sm text-zinc-600">{r(kind)} · {r(view.isWanted ? `${view.locationHeading}: ` : "")}{r(view.locationLabel)}</p>
        </div>
        <span className={`inline-flex h-fit w-fit shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${getOwnerHorseStatusClassName(detail.status)}`}>{r(status)}</span>
      </div>
      <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
        {isDraft ? t("explanation") : detail.status === "published" ? t("editExplanation") : t("readOnly")}
      </div>
      {r(view.warning ? <p role="alert" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">{r(view.warning)}</p> : null)}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <Card eyebrow={r(marketplaceMessage("horse.horse_listing.f28ecd"))} title={r(marketplaceMessage("horse.basic_information.8824f5"))}>
            <div className="overflow-hidden rounded-[22px] border border-black/8 bg-zinc-100">
              {r(detail.imageUrl ? <img src={detail.imageUrl} alt={r(title)} className="aspect-[4/3] w-full object-contain" />
                : <div className="flex aspect-[4/3] items-center justify-center text-sm text-zinc-500">{r(marketplaceMessage("horse.no_image.615289"))}</div>)}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-2xl font-semibold">{r(view.priceLabel)}</p>
              <p className="text-xs text-zinc-500">{r(detail.images.length === 1 ? marketplaceMessage("horse.1_image.a0b70f") : marketplaceMessage("horse.value_images.04ccb2", { p0: String(detail.images.length) }))}</p>
            </div>
            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-700">{r(detail.description.trim() || marketplaceMessage("horse.no_description_added.25bac7"))}</p>
          </Card>
          {detail.images.length > 1 ? <Card eyebrow={t("photos")} title={t("photos")}>
            <div className="grid grid-cols-2 gap-3">{detail.images.map(image => <img key={image.id} src={image.url} alt={r(title)} className="aspect-[4/3] w-full rounded-2xl object-contain" />)}</div>
          </Card> : null}
          <Card eyebrow={r(view.isWanted ? marketplaceMessage("horse.search_preferences.e24496") : marketplaceMessage("horse.horse_details.80a75f"))} title={r(view.isWanted ? marketplaceMessage("horse.wanted_horse.5c7574") : marketplaceMessage("horse.main_characteristics.ca7a3d"))}>
            <Values fields={view.basics} columns empty={r(view.isWanted ? marketplaceMessage("horse.no_preferences_added.d602cc") : marketplaceMessage("horse.no_basic_details_added.8aabfa"))} />
          </Card>
          <Card eyebrow={r(view.isWanted ? marketplaceMessage("horse.search_preferences.e24496") : marketplaceMessage("horse.use_and_suitability.0528a6"))} title={r(view.isWanted ? marketplaceMessage("horse.preferred_use_and_training.badc48") : marketplaceMessage("horse.training_and_suitability.74c0aa"))}>
            <Values fields={view.use} empty={r(view.isWanted ? marketplaceMessage("horse.no_use_or_training_preferences_added.8acbf1") : marketplaceMessage("horse.no_use_or_training_details_added.af6bb0"))} />
          </Card>
          <Card eyebrow={r(view.isWanted ? marketplaceMessage("horse.search_preferences.e24496") : marketplaceMessage("horse.publisher_s_description.46f567"))} title={r(view.isWanted ? marketplaceMessage("horse.health_and_behaviour_preferences.e0938d") : marketplaceMessage("horse.health_and_behaviour.13313e"))}>
            <Values fields={view.disclosures} empty={r(view.isWanted ? marketplaceMessage("horse.no_health_or_behaviour_preferences_added.5b9336") : marketplaceMessage("horse.no_health_or_behaviour_details_added.97342f"))} />
            <p className="mt-4 text-xs leading-5 text-zinc-500">
              {r(view.isWanted ? marketplaceMessage("horse.these_are_the_searcher_s_preferences_not_the.822df3")
                : marketplaceMessage("horse.these_details_were_provided_by_the_publisher_and.ab5aa8"))}
            </p>
          </Card>
        </div>
        <aside className="min-w-0 space-y-6">
          <Card eyebrow={r(marketplaceMessage("horse.summary.6d2a4c"))} title={r(marketplaceMessage("horse.listing_overview.301649"))}>
            <Values empty="" fields={[
              { label: marketplaceMessage("horse.listing_type.6ebe7f"), value: kind }, { label: marketplaceMessage("horse.status.e99bbe"), value: status },
              { label: view.priceHeading, value: view.priceLabel }, { label: view.locationHeading, value: view.locationLabel },
              { label: marketplaceMessage("horse.active_until.7113f3"), value: formatOwnerHorseDate(detail.activeUntil, language) },
            ]} />
          </Card>
          <Card eyebrow={r(marketplaceMessage("horse.owner_metadata.396388"))} title={r(marketplaceMessage("horse.history.b6a836"))}>
            <Values empty="" fields={[
              { label: marketplaceMessage("horse.created.196295"), value: formatOwnerHorseDate(detail.createdAt, language) },
              { label: marketplaceMessage("horse.last_updated.ae8c30"), value: formatOwnerHorseDate(detail.updatedAt, language) },
              { label: marketplaceMessage("horse.listing_id.d56f76"), value: detail.offerId },
            ]} />
          </Card>
          <div className="rounded-[28px] border border-black/10 bg-zinc-950 p-5 text-white shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">{t("heading")}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {isDraft ? t("explanation") : detail.status === "published" ? t("editExplanation") : t("readOnly")}
            </p>
            {isDraft || detail.status === "published" ? <Link href={`/v2/my-area/horse-offers/${encodeURIComponent(detail.offerId)}/edit`}
              className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100">
              {t("edit")}
            </Link> : null}
            {detail.status === "published" ? <Link href={`/v2/horse-offer/${detail.offerId}`} className="mt-4 block text-sm font-bold underline">{t("publicView")}</Link> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
