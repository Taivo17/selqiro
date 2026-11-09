"use client";
import Link from "next/link";
import { useRef, type MouseEvent } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { publicUiMessages } from "../../../../lib/i18n/catalogs/publicUi";
import { publicCategoryPath } from "../../../entities/listing/model/publicSearch";
import { horsePriceDisplay } from "../../../entities/horse-offer/model/publicHorse";
import { getListingPriceDisplay } from "../../../entities/listing/model/priceDisplay";
import type { PublicSearchCard } from "../../../entities/listing/model/publicSearchResponse";
import ListingPrice from "../../../entities/listing/ui/ListingPrice";

export type ProfileListingOpen = {listingId: string; cardViewportTop: number};

export default function PublicProfileListingCard({item, expanded, onOpen}: {
  item: PublicSearchCard; expanded: boolean; onOpen: (input: ProfileListingOpen) => void;
}) {
  const {language, t} = useV2Translation(publicUiMessages), ref = useRef<HTMLElement>(null);
  const horse = item.contentType === "horse_offer";
  const href = `${horse ? "/v2/horse-offer/" : "/v2/listing/"}${encodeURIComponent(item.id)}`;
  const category = publicCategoryPath({category: item.category ?? "", subcategory: item.subcategory ?? "",
    detailCategory: item.detailCategory ?? ""}, language);
  const country = horse && item.country === "EE" ? language === "et" ? "Eesti" : "Estonia" : item.country;
  const location = [...new Set([item.city, country].filter(Boolean))].join(" · ");
  function remember(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    onOpen({listingId: item.id, cardViewportTop: ref.current?.getBoundingClientRect().top ?? 0});
  }
  return <article ref={ref} data-listing-card-id={item.id} data-content-type={item.contentType ?? "listing"}
    className={`min-w-0 overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm ${expanded ? "w-full" : "w-[250px] flex-none"}`}>
    <Link href={href} prefetch={false} onClick={remember}
      className="flex h-full flex-col p-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-600">
      {/* Retain the managed media endpoint's publication checks without an image-optimizer copy. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer"
        className={`w-full rounded-[20px] object-cover ${expanded ? "h-52 sm:h-56" : "h-36"}`} />
        : <span className={`flex items-center justify-center rounded-[20px] bg-neutral-100 text-sm text-neutral-500 ${expanded ? "h-52 sm:h-56" : "h-36"}`}>{t("no_image")}</span>}
      <h3 className="mt-3 line-clamp-2 break-words text-base font-black">{item.title || t("untitled_listing")}</h3>
      {item.description ? <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-neutral-600">{item.description}</p> : null}
      <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-neutral-500">
        {[category || t("no_category"), location || t("location_unspecified")].join(" · ")}
      </p>
      <ListingPrice price={item.horsePrice ? horsePriceDisplay(item.horsePrice, language)
        : item.displayPrice ?? getListingPriceDisplay({price: item.price, priceAmount: item.priceAmount})}
        className="mt-auto pt-3" labelClassName="text-lg" />
    </Link>
  </article>;
}
