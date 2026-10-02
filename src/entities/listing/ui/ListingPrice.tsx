import type { ListingPriceDisplay } from "../model/priceDisplay";

type Props = {
  price: Pick<ListingPriceDisplay, "priceLabel"> & { priceNote?: string | null };
  className?: string;
  labelClassName?: string;
};

/** Original price and its visible clarification stay together, including on narrow screens. */
export default function ListingPrice({ price, className = "", labelClassName = "text-xl" }: Props) {
  return (
    <div className={`min-w-0 max-w-full ${className}`} data-listing-price>
      <p className={`break-words whitespace-pre-wrap font-black ${labelClassName}`}>{price.priceLabel}</p>
      {price.priceNote ? <p className="mt-1 break-words text-xs font-normal leading-4 text-neutral-500">{price.priceNote}</p> : null}
    </div>
  );
}
