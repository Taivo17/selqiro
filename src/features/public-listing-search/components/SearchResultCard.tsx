"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { publicUiMessages } from "@/lib/i18n/catalogs/publicUi";


import Link from "next/link";
import ListingPrice from "../../../entities/listing/ui/ListingPrice";
import { getListingPriceDisplay } from "../../../entities/listing/model/priceDisplay";
import { useRef, type MouseEvent } from "react";
import type { PublicSearchCard } from "../../../entities/listing/model/publicSearchResponse";
import { publicCategoryPath } from "../../../entities/listing/model/publicSearch";
import { saveListingReturnContext } from "../../listing-navigation/model/listingReturnContext";
import { horsePriceDisplay } from "../../../entities/horse-offer/model/publicHorse";
import ProviderMenu from "../../viewer-provider-controls/components/ProviderMenu";

export default function SearchResultCard({item}: {item: PublicSearchCard}) {
  const { language: uiLanguage, t } = useV2Translation(publicUiMessages);

  const ref = useRef<HTMLElement>(null);
  function remember(event: MouseEvent<HTMLAnchorElement>) {
    if (item.contentType === "horse_offer") return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    saveListingReturnContext({source: "products", listingId: item.id,
      cardViewportTop: ref.current?.getBoundingClientRect().top || 0});
  }
  const category = publicCategoryPath({category: item.category || "", subcategory: item.subcategory || "",
    detailCategory: item.detailCategory || ""}, uiLanguage);
  const country = item.contentType === "horse_offer" && item.country === "EE"
    ? uiLanguage === "et" ? "Eesti" : "Estonia" : item.country;
  const place = [...new Set([item.city, country].filter(Boolean))].join(" · ");
  return (
    <article ref={ref} data-listing-card-id={item.id} className="relative h-full min-w-0 rounded-[26px] border border-black/5 bg-white shadow-sm">
      <Link href={(item.contentType === "horse_offer" ? "/v2/horse-offer/" : "/v2/listing/") + encodeURIComponent(item.id)} prefetch={false} onClick={remember}
        className="flex h-full flex-col p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500">
        <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[20px] bg-neutral-100 md:aspect-[16/10]">
          {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover object-[center_42%]" />
            : <span className="text-sm text-neutral-500">{t("no_image")}</span>}
        </div>
        <h3 className="mt-4 line-clamp-2 break-words text-lg font-black leading-tight">{item.title || t("untitled_listing")}</h3>
        {item.description ? <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-neutral-600">{item.description}</p> : null}
        <p className="mt-2 line-clamp-2 text-xs text-neutral-500">{category ? category + " · " : ""}{item.sellerName || t("seller")}</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4">
          <ListingPrice price={item.horsePrice ? horsePriceDisplay(item.horsePrice, uiLanguage) : item.displayPrice ?? getListingPriceDisplay({ price: item.price, priceAmount: item.priceAmount })} />
          <p className="text-right text-xs text-neutral-500">{place || t("location_unspecified")}</p>
        </div>
      </Link>
      <div className="absolute right-4 top-4 z-10"><ProviderMenu target={{type: item.contentType === "horse_offer" ? "horse_offer" : "listing", id: item.id}} name={item.sellerName} /></div>
    </article>
  );
}
