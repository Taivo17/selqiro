"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublicHorse } from "../../../entities/horse-offer/api/getPublicHorse";
import { horsePriceDisplay, HORSE_PUBLIC_FIELDS, type PublicHorse } from "../../../entities/horse-offer/model/publicHorse";
import ListingPrice from "../../../entities/listing/ui/ListingPrice";
import { horsePublicMessages } from "../../../../lib/i18n/catalogs/horsePublic";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import HorseContactButton from "./HorseContactButton";
import PublicPhotoGallery from "../../../shared/media/PublicPhotoGallery";
import ListingReturnBackButton from "../../listing-navigation/components/ListingReturnBackButton";

export default function PublicHorsePage({ offerId }: { offerId: string }) {
 const { t, language } = useV2Translation(horsePublicMessages);
 const [read, setRead] = useState<{ id: string; item: PublicHorse | null; error: boolean } | null>(null);
 const [attempt, setAttempt] = useState(0);
 useEffect(() => { const controller = new AbortController();
  void getPublicHorse(offerId, controller.signal).then(item => {
   if (!controller.signal.aborted) setRead({ id: offerId, item, error: false });
  }).catch(() => { if (!controller.signal.aborted) setRead({ id: offerId, item: null, error: true }); });
  return () => controller.abort();
 }, [offerId, attempt]);
 const state = read?.id === offerId ? read : null, h = state?.item;
 const button = "rounded-full border border-neutral-300 bg-white px-5 py-3 font-bold";
 if (!state) return <p role="status">{t("loading")}</p>;
 if (!h) return <section className="space-y-5 rounded-[30px] bg-white p-8"><h1 className="text-2xl font-black">{t(state.error ? "error" : "unavailable")}</h1>
  <ListingReturnBackButton listingId={offerId} className={button} fallbackHref="/v2/products?category=horses" />{state.error && <button type="button" className={button} onClick={() => { setRead(null); setAttempt(a => a + 1); }}>{t("retry")}</button>}</section>;
 return <article className="space-y-6">
  <ListingReturnBackButton listingId={offerId} className="font-semibold underline underline-offset-4" fallbackHref="/v2/products?category=horses" />
  <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
   <div className="min-w-0 space-y-6">
    <PublicPhotoGallery key={h.id} title={h.title} photos={h.images.map(image => ({ id: image.id, src: image.url }))}
     className="overflow-hidden rounded-[30px] border border-amber-200 bg-white p-4" />
    <section className="space-y-4 rounded-[30px] bg-white p-7"><h2 className="text-2xl font-black">{t("description")}</h2><p className="whitespace-pre-wrap break-words leading-7">{h.description}</p></section>
    <section className="space-y-4 rounded-[30px] bg-white p-7"><h2 className="text-2xl font-black">{t(h.offerType === "wanted" ? "wanted_details" : "details")}</h2>
     <dl className="divide-y divide-neutral-100">{HORSE_PUBLIC_FIELDS.filter(k => h.fields[k]).map(k => {
      const value = h.fields[k]!; const translated = ["sex", "preferred_sex"].includes(k) && ["mare", "gelding", "stallion", "unknown", "any"].includes(value)
       ? t(value as "mare" | "gelding" | "stallion" | "unknown" | "any") : value;
      return <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]" key={k}><dt className="font-semibold text-neutral-600">{t(k)}</dt><dd className="whitespace-pre-wrap break-words">{translated}</dd></div>;
     })}</dl>
    </section>
   </div>
   <aside className="h-fit space-y-5 rounded-[30px] border border-amber-200 bg-white p-7 lg:sticky lg:top-28">
    <p className="text-sm font-bold text-amber-900">{t("horses")} · {t(h.offerType)}</p><h1 className="break-words text-3xl font-black">{h.title}</h1>
    <ListingPrice price={horsePriceDisplay(h.price, language)} /><p>{[...new Set([h.city, h.region, language === "et" ? "Eesti" : "Estonia"].filter(Boolean))].join(" · ")}</p>
    <div className="border-t border-neutral-100 pt-4"><p className="font-bold">{h.sellerName}</p><p className="mt-1 text-sm text-neutral-500">{t(h.sellerType)}</p>
     {h.sellerSlug && <Link className="mt-2 inline-block underline" href={"/v2/profile/" + encodeURIComponent(h.sellerSlug)}>{t("profile")}</Link>}</div>
    <HorseContactButton key={h.id} offerId={h.id} />
   </aside>
  </div>
 </article>;
}
