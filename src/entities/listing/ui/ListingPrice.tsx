"use client";

import { useV2Language } from "@/src/shared/i18n/V2LanguageProvider";
import { localizeListingPrice } from "../model/priceDisplay";
import type { ListingPriceDisplay } from "../model/priceDisplay";

type Props = {
  price: Pick<ListingPriceDisplay, "priceLabel"> & Partial<Omit<ListingPriceDisplay, "priceLabel">>;
  className?: string;
  labelClassName?: string;
};

/** Original price and its visible clarification stay together, including on narrow screens. */
export default function ListingPrice({ price, className = "", labelClassName = "text-xl" }: Props) {
  const { language } = useV2Language();
  const shown = localizeListingPrice(price, language);
  return (
    <div className={`min-w-0 max-w-full ${className}`} data-listing-price>
      <p className={`break-words whitespace-pre-wrap font-black ${labelClassName}`}>{shown.priceLabel}</p>
      {shown.priceNote ? <p className="mt-1 break-words text-xs font-normal leading-4 text-neutral-500">{shown.priceNote}</p> : null}
    </div>
  );
}
