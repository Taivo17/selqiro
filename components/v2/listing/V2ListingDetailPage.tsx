"use client";

import Link from "next/link";
import { useState } from "react";

const similarListings = [
  {
    title: "Husqvarna TC 242TX",
    price: "3850 €",
    location: "Türi · 18 km",
    badge: "Esiletõstetud",
  },
  {
    title: "John Deere X117R",
    price: "3200 €",
    location: "Põltsamaa · 25 km",
    badge: "Esiletõstetud",
  },
  {
    title: "Stiga Estate 384",
    price: "4190 €",
    location: "Jõgeva · 32 km",
    badge: "Sarnane",
  },
];

const relatedServices = [
  {
    title: "Aiatehnika hooldus",
    description: "Traktorite ja muruniidukite remont",
    location: "Paide · 10 km",
    badge: "Esiletõstetud",
  },
  {
    title: "Muruniidukite transport",
    description: "Kohalik transport ja kohaletoomine",
    location: "Türi · 15 km",
    badge: "Sinu lähedal",
  },
  {
    title: "Roheline Tehnika",
    description: "Hooldus, varuosad ja nõu",
    location: "Jõgeva · 28 km",
    badge: "Esiletõstetud",
  },
];

const importantDetails = [
  ["Seisukord", "Väga hea"],
  ["Kategooria", "Murutraktorid"],
  ["Tootmisaasta", "2019"],
  ["Töötunnid", "185 h"],
  ["Võimsus", "20 hj"],
  ["Kütus", "Bensiin"],
];

const extraDetails = [
  ["Lõikelaius", "107 cm"],
  ["Käigukast", "Hüdrostaat"],
  ["Asukoht", "Paide piirkond"],
  ["Müüja lisainfo", "Võimalik kohapeal üle vaadata."],
];

function PlaceholderImage({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-[26px] bg-gradient-to-br from-neutral-100 to-neutral-200",
        className,
      ].join(" ")}
    />
  );
}

function MiniCard({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <article className="min-w-[230px] rounded-[24px] border border-black/5 bg-white p-3 shadow-sm">
      <PlaceholderImage className="h-28" />

      {badge ? (
        <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
          {badge}
        </span>
      ) : null}

      <h3 className="mt-2 text-base font-black">{title}</h3>
      <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
    </article>
  );
}

export default function V2ListingDetailPage() {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-black/5 bg-white p-5 shadow-sm md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/v2/products"
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold shadow-sm"
          >
            ← Tagasi toodete juurde
          </Link>

          <p className="text-sm font-semibold text-neutral-500">
            Tooted · Aed · Murutraktorid
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <PlaceholderImage className="h-[280px] md:h-[460px]" />

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <PlaceholderImage
                  key={index}
                  className="h-20 min-w-24 rounded-[18px]"
                />
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-black/5 bg-[#fbfbfa] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                    Uus detailvaade
                  </p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight">
                    Cub Cadet murutraktor
                  </h1>
                </div>

                <button className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-bold">
                  ♡
                </button>
              </div>

              <p className="mt-5 text-4xl font-black">4562 €</p>
              <p className="mt-2 text-sm text-neutral-500">
                ≈ 497 000 JPY · ligikaudne teisendus
              </p>

              <div className="mt-5 rounded-2xl bg-white p-4">
                <p className="text-sm font-bold">Paide piirkond, Eesti</p>
                <p className="mt-1 text-sm text-neutral-500">
                  umbes 12 km sinust
                </p>
                <p className="mt-3 text-xs leading-5 text-neutral-400">
                  Asukoht on ligikaudne. Täpne koht lepitakse kokku müüjaga.
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                <button className="rounded-full bg-black px-5 py-3 text-sm font-black text-white">
                  Kirjuta müüjale
                </button>
                <button className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black">
                  Salvesta kuulutus
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-400">
                Müüja
              </p>

              <div className="mt-4 flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-neutral-200" />
                <div>
                  <h2 className="font-black">Milline Vedu</h2>
                  <p className="text-sm text-neutral-500">
                    Liitunud 2024 · profiil täidetud
                  </p>
                </div>
              </div>

              <Link
                href="/v2"
                className="mt-5 inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black"
              >
                Vaata profiili
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            Kirjeldus
          </p>

          <p className="mt-4 text-base leading-8 text-neutral-700">
            Väga heas korras Cub Cadet XT2 murutraktor. Regulaarselt hooldatud
            ja valmis kohe kasutamiseks. Võimas ja töökindel masin suuremale
            aiale või kinnistule.
          </p>

          {showMore ? (
            <div className="mt-5 rounded-[24px] bg-[#fbfbfa] p-5 text-sm leading-7 text-neutral-600">
              Müügipõhjus: uue mudeli soetamine. Võimalik kohapeal proovida.
              Kaasa kasutusjuhend ja hooldusajalugu. Transport kokkuleppel.
            </div>
          ) : null}

          <button
            onClick={() => setShowMore((value) => !value)}
            className="mt-5 rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm"
          >
            {showMore ? "Näita vähem" : "Näita rohkem"}
          </button>
        </div>

        <div className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            Olulised detailid
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {importantDetails.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#fbfbfa] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
                  {label}
                </p>
                <p className="mt-1 font-black">{value}</p>
              </div>
            ))}

            {showMore
              ? extraDetails.map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-[#fbfbfa] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
                      {label}
                    </p>
                    <p className="mt-1 font-black">{value}</p>
                  </div>
                ))
              : null}
          </div>

          <p className="mt-5 text-sm text-neutral-500">
            “Näita rohkem” avab kogu kuulutuse info, mitte ainult kirjelduse.
          </p>
        </div>
      </section>

      <section className="rounded-[34px] border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm md:p-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
              Kontekstuaalne discovery
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Esiletõstetud sarnased kuulutused
            </h2>
          </div>

          <button className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm">
            Vaata kõiki
          </button>
        </div>

        <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
          {similarListings.map((item) => (
            <MiniCard
              key={item.title}
              title={item.title}
              subtitle={`${item.price} · ${item.location}`}
              badge={item.badge}
            />
          ))}
        </div>
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
              Sinu lähedal
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Seotud teenused
            </h2>
          </div>

          <button className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold shadow-sm">
            Vaata kõiki
          </button>
        </div>

        <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
          {relatedServices.map((item) => (
            <MiniCard
              key={item.title}
              title={item.title}
              subtitle={`${item.description} · ${item.location}`}
              badge={item.badge}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
