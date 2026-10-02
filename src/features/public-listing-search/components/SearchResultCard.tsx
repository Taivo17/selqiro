"use client";

import Link from "next/link";
import ListingPrice from "../../../entities/listing/ui/ListingPrice";
import { getListingPriceDisplay } from "../../../entities/listing/model/priceDisplay";
import { useRef, type MouseEvent } from "react";
import type { PublicSearchCard } from "../../../entities/listing/model/publicSearchResponse";
import { publicCategoryPath } from "../../../entities/listing/model/publicSearch";
import { saveListingReturnContext } from "../../listing-navigation/model/listingReturnContext";

export default function SearchResultCard({item}: {item: PublicSearchCard}) {
  const ref = useRef<HTMLElement>(null);
  function remember(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    saveListingReturnContext({source: "products", listingId: item.id,
      cardViewportTop: ref.current?.getBoundingClientRect().top || 0});
  }
  const category = publicCategoryPath({category: item.category || "", subcategory: item.subcategory || "",
    detailCategory: item.detailCategory || ""});
  const place = [...new Set([item.city, item.country].filter(Boolean))].join(" · ");
  return (
    <article ref={ref} data-listing-card-id={item.id} className="h-full min-w-0 overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-sm">
      <Link href={"/v2/listing/" + encodeURIComponent(item.id)} prefetch={false} onClick={remember}
        className="flex h-full flex-col p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500">
        <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[20px] bg-neutral-100 md:aspect-[16/10]">
          {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover object-[center_42%]" />
            : <span className="text-sm text-neutral-500">Pilt puudub</span>}
        </div>
        <h3 className="mt-4 line-clamp-2 break-words text-lg font-black leading-tight">{item.title}</h3>
        {item.description ? <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-neutral-600">{item.description}</p> : null}
        <p className="mt-2 line-clamp-2 text-xs text-neutral-500">{category ? category + " · " : ""}{item.sellerName}</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4">
          <ListingPrice price={getListingPriceDisplay({ price: item.price, priceAmount: item.priceAmount })} />
          <p className="text-right text-xs text-neutral-500">{place || "Asukoht täpsustamata"}</p>
        </div>
      </Link>
    </article>
  );
}
