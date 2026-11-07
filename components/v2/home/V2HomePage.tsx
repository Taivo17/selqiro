"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { demoUi, type DemoTranslate } from "@/lib/i18n/catalogs/demoUi";
import Link from "next/link";

type DiscoveryItem = {
  id: string;
  eyebrow: string;
  title: string;
  meta: string;
  price?: string;
  tag?: string;
};

const getStartCards = (t: DemoTranslate) => [
  {
    id: "startCards-0",
    title: t("listings"),
    description: t("browseNearby"),
    action: t("browseListings"),
    href: "/v2/products",
    actionClassName:
      "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
  },
  {
    id: "startCards-1",
    title: t("services"),
    description: t("findProvider"),
    action: t("findService"),
    href: "/v2/services",
    actionClassName:
      "border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100",
  },
  {
    id: "startCards-2",
    title: t("jobs"),
    description: t("jobsSoon"),
    action: t("comingSoon"),
    href: null,
    actionClassName:
      "border-neutral-200 bg-neutral-100 text-neutral-400",
  },
];

const getTodayDiscoveries = (t: DemoTranslate): DiscoveryItem[] => [
  {
    id: "todayDiscoveries-0",
    eyebrow: t("featuredListing"),
    title: t("lawnmower"),
    meta: t("paideGarden"),
    price: "120 €",
  },
  {
    id: "todayDiscoveries-1",
    eyebrow: t("featuredService"),
    title: t("towUntil"),
    meta: t("temporaryServiceLocation"),
    tag: "LIVE",
  },
  {
    id: "todayDiscoveries-2",
    eyebrow: t("job"),
    title: t("salesConsultant"),
    meta: t("tartuBusiness"),
    price: t("monthlySalary"),
  },
  {
    id: "todayDiscoveries-3",
    eyebrow: t("event"),
    title: "Jazzkaar 2025",
    meta: t("tartuDates"),
  },
  {
    id: "todayDiscoveries-4",
    eyebrow: t("localProducer"),
    title: t("tomatoesToday"),
    meta: "Jõgevamaa · Männi Talu",
  },
];

const getFeaturedProducts = (t: DemoTranslate): DiscoveryItem[] => [
  {
    id: "featuredProducts-0",
    eyebrow: t("listing"),
    title: t("lawnTractor"),
    meta: "Imavere · 18 km",
    price: "4562 €",
  },
  {
    id: "featuredProducts-1",
    eyebrow: t("listing"),
    title: "BMW 5 Series",
    meta: "Türi · 24 km",
    price: "6000 €",
  },
  {
    id: "featuredProducts-2",
    eyebrow: t("listing"),
    title: "iPhone 12 64GB",
    meta: "Paide · 0.8 km",
    price: "320 €",
  },
  {
    id: "featuredProducts-3",
    eyebrow: t("listing"),
    title: t("sofaBed"),
    meta: "Paide · 0.6 km",
    price: "150 €",
  },
  {
    id: "featuredProducts-4",
    eyebrow: t("listing"),
    title: t("mountainBike"),
    meta: "Paide · 0.7 km",
    price: "280 €",
  },
];

const getFeaturedServices = (t: DemoTranslate): DiscoveryItem[] => [
  {
    id: "featuredServices-0",
    eyebrow: t("service"),
    title: "Autoteenindus Paide",
    meta: t("paideCarRepair"),
  },
  {
    id: "featuredServices-1",
    eyebrow: t("service"),
    title: "Paide Elektritööd OÜ",
    meta: t("paideElectrical"),
  },
  {
    id: "featuredServices-2",
    eyebrow: t("service"),
    title: t("towing"),
    meta: t("temporaryTallinn"),
    tag: "LIVE",
  },
  {
    id: "featuredServices-3",
    eyebrow: t("service"),
    title: t("gardenMaintenance"),
    meta: "Paide · 1.1 km",
  },
];

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
          {title}
        </h2>
      </div>

      {action ? (
        <button className="hidden rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold shadow-sm transition hover:border-neutral-300 md:inline-flex">
          {action}
        </button>
      ) : null}
    </div>
  );
}

function DiscoveryCard({ item }: { item: DiscoveryItem }) {
  return (
    <article className="min-w-[220px] rounded-[24px] border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:min-w-[245px]">
      <div className="mb-4 h-28 rounded-[18px] bg-gradient-to-br from-neutral-100 to-neutral-200" />

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">
          {item.eyebrow}
        </p>

        {item.tag ? (
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
            {item.tag}
          </span>
        ) : null}
      </div>

      <h3 className="mt-2 line-clamp-2 text-lg font-black">{item.title}</h3>
      <p className="mt-2 text-sm leading-5 text-neutral-500">{item.meta}</p>

      {item.price ? (
        <p className="mt-4 text-lg font-black">{item.price}</p>
      ) : null}
    </article>
  );
}

function HorizontalRow({ items }: { items: DiscoveryItem[] }) {
  return (
    <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
      {items.map((item) => (
        <DiscoveryCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export default function V2HomePage() {
  const { t } = useV2Translation(demoUi);
  const startCards = getStartCards(t);
  const todayDiscoveries = getTodayDiscoveries(t);
  const featuredProducts = getFeaturedProducts(t);
  const featuredServices = getFeaturedServices(t);
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 md:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
               {t("todaySpotlight")} </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
              Männi Talu
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
               {t("farmDescription")} </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button className="rounded-full bg-black px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-neutral-800">
                 {t("viewDetails")} </button>
              <button className="rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-bold shadow-sm transition hover:border-neutral-300">
                 {t("contactInformation")} </button>
            </div>
          </div>

          <div className="min-h-[260px] bg-gradient-to-br from-neutral-950 via-neutral-900 to-emerald-950 p-6 text-white md:p-8 lg:p-10">
            <div className="ml-auto max-w-md rounded-[28px] bg-white/10 p-5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-black">
                   {t("localShare")} </span>
                <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-white/80">
                   {t("worldShare")} </span>
              </div>

              <p className="text-sm font-bold text-emerald-300">
                 {t("sharedSpot")} </p>
              <h2 className="mt-3 text-2xl font-black">{t("todayDiscovery")}</h2>
              <p className="mt-3 text-sm leading-6 text-white/70">
                 {t("discoveryInvite")} </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
               {t("startSearch")} </p>
            <h2 className="mt-2 text-3xl font-black">{t("chooseWhatToFind")}</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {startCards.map((card) => (
              <article
                key={card.id}
                className="rounded-[24px] border border-black/5 bg-[#fbfbfa] p-5 transition hover:bg-white hover:shadow-sm"
              >
                <h3 className="text-xl font-black">{card.title}</h3>
                <p className="mt-2 min-h-[54px] text-sm leading-6 text-neutral-600">
                  {card.description}
                </p>
                {card.href ? (
                  <Link
                    href={card.href}
                    className={[
                      "mt-4 inline-flex rounded-full border px-4 py-2 text-sm font-bold transition",
                      card.actionClassName,
                    ].join(" ")}
                  >
                    {card.action}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className={[
                      "mt-4 inline-flex cursor-not-allowed rounded-full border px-4 py-2 text-sm font-bold",
                      card.actionClassName,
                    ].join(" ")}
                  >
                    {card.action}
                  </span>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <SectionHeader
          eyebrow={t("discoverToday")}
          title={t("opportunities")}
          action={t("viewAll")}
        />
        <HorizontalRow items={todayDiscoveries} />
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <SectionHeader
          eyebrow={t("nearYou")}
          title={t("featuredListings")}
          action={t("viewAll")}
        />
        <HorizontalRow items={featuredProducts} />
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <SectionHeader
          eyebrow={t("nearYou")}
          title={t("featuredServices")}
          action={t("viewAll")}
        />
        <HorizontalRow items={featuredServices} />
      </section>

      <section className="rounded-[34px] border border-blue-100 bg-blue-50 p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-blue-500">
           {t("later")} </p>
        <h2 className="mt-2 text-2xl font-black text-blue-950">
           {t("dailyDiscovery")} </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-900">
           {t("dailyDiscoveryDescription")} </p>
      </section>
    </div>
  );
}
