"use client";

import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import type { OwnerHorseOfferImage } from "../../../entities/horse-offer/model/types";

export default function OwnerHorseOfferEditImages({ images, title }: { images: OwnerHorseOfferImage[]; title: string }) {
  const { language, r } = useMarketplaceTranslation();
  return (
    <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">{r(marketplaceMessage("horse.images.5a1c67"))}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight">{r(marketplaceMessage("horse.current_image_order.161143"))}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{r(marketplaceMessage("horse.images_are_view_only_saving_here_does_not.0caa7e"))}</p>
      {r(images.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {r(images.map(image => (
            <figure key={image.id} className="overflow-hidden rounded-[20px] border border-neutral-200 bg-[#fbfbfa]">
              <img src={image.url} alt={r(title)} className="aspect-[4/3] w-full object-contain" />
              <figcaption className="flex items-center justify-between gap-3 px-4 py-3 text-xs font-black text-neutral-500">
                <span>{r(marketplaceMessage("horse.order.7704d8"))} {r(image.sortOrder + 1)}</span>
                {r(image.isPrimary ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">{r(marketplaceMessage("horse.cover_image.03364c"))}</span> : null)}
              </figcaption>
            </figure>
          )))}
        </div>
      ) : <p className="mt-5 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-6 text-sm text-neutral-500">{r(marketplaceMessage("horse.no_images_added.3882b1"))}</p>)}
    </section>
  );
}
