"use client";

import { useState } from "react";

type Service = {
  title: string;
  provider: string;
  description: string;
  area: string;
  distance: string;
  price?: string;
  badge?: string;
  cta: string;
  details: string[];
};

const featuredServices: Service[] = [
  {
    title: "Puksiirabi",
    provider: "Paide Puksiirabi",
    description: "Sõidukite pukseerimine, käivitusabi ja transport.",
    area: "Tallinn, Gonsiori piirkond",
    distance: "ajutine asukoht",
    price: "Alates 45 €",
    badge: "LIVE",
    cta: "Küsi abi",
    details: [
      "Puksiir on ajutiselt Tallinnas kuni 16:00.",
      "Sobib sõiduautode ja väiketranspordi jaoks.",
      "Täpne hind sõltub asukohast, olukorrast ja sihtkohast.",
    ],
  },
  {
    title: "Aiatehnika hooldus",
    provider: "Milline Vedu",
    description: "Murutraktorite, niidukite ja väiketehnika hooldus.",
    area: "Paide piirkond",
    distance: "~12 km",
    badge: "Esiletõstetud",
    cta: "Võta ühendust",
    details: [
      "Hooldame murutraktoreid ja niidukeid.",
      "Hinna täpsustame pärast masina ja töö mahu nägemist.",
      "Võimalik kokku leppida ülevaatuse aeg.",
    ],
  },
  {
    title: "Autoremont",
    provider: "Autoteenindus Paide",
    description: "Hooldus, remont ja diagnostika.",
    area: "Paide",
    distance: "~2.4 km",
    price: "Hind kokkuleppel",
    badge: "Sinu lähedal",
    cta: "Kirjuta",
    details: [
      "Teostame üldhooldust ja lihtsamat remonti.",
      "Kirjuta, mis autol viga on, ja lepime aja kokku.",
      "Täpset hinda ei kuvata enne töö mahu selgumist.",
    ],
  },
];

const normalServices: Service[] = [
  {
    title: "Elektritööd",
    provider: "Paide Elektritööd OÜ",
    description: "Kodused elektritööd ja väiksemad parandused.",
    area: "Paide",
    distance: "~0.6 km",
    cta: "Võta ühendust",
    details: [
      "Väiksemad elektritööd kodus või ettevõttes.",
      "Töö maht ja hind täpsustatakse enne alustamist.",
    ],
  },
  {
    title: "Puhastusteenus",
    provider: "Kodupuhas OÜ",
    description: "Kodu ja kontori koristus.",
    area: "Paide",
    distance: "~0.8 km",
    price: "Alates 35 €",
    cta: "Kirjuta",
    details: [
      "Koristus kodudele ja väiksematele kontoritele.",
      "Hind sõltub pinna suurusest ja töö sagedusest.",
    ],
  },
  {
    title: "Aiahaldjas OÜ",
    provider: "Aiateenused",
    description: "Aiatööd, niitmine ja hooajalised teenused.",
    area: "Paide",
    distance: "~1.1 km",
    cta: "Võta ühendust",
    details: [
      "Aiatööd ja hooajaline hooldus.",
      "Teenuse hind sõltub töö mahust ja asukohast.",
    ],
  },
  {
    title: "Sõidukite transport",
    provider: "Milline Vedu",
    description: "Kohalik transport kokkuleppel.",
    area: "Järvamaa",
    distance: "~15 km",
    cta: "Kirjuta",
    details: [
      "Transport kokkuleppel Järvamaal ja lähialadel.",
      "Täpsustame veose, asukoha ja sihtkoha enne hinna pakkumist.",
    ],
  },
];

function PlaceholderImage({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-[22px] bg-gradient-to-br from-neutral-100 to-neutral-200",
        className,
      ].join(" ")}
    />
  );
}

function ServiceCard({
  service,
  onOpen,
}: {
  service: Service;
  onOpen: (service: Service) => void;
}) {
  return (
    <article className="rounded-[26px] border border-black/5 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <PlaceholderImage className="h-36" />

      <div className="mt-4 flex items-center justify-between gap-3">
        {service.badge ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
            {service.badge}
          </span>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
            Teenus
          </span>
        )}

        <button className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-500">
          ♡
        </button>
      </div>

      <h3 className="mt-3 text-lg font-black">{service.title}</h3>
      <p className="mt-1 text-sm font-semibold text-neutral-500">
        {service.provider}
      </p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        {service.description}
      </p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-neutral-700">{service.area}</p>
          <p className="text-xs text-neutral-400">{service.distance}</p>
        </div>

        {service.price ? (
          <p className="text-sm font-black">{service.price}</p>
        ) : null}
      </div>

      <button
        onClick={() => onOpen(service)}
        className="mt-5 w-full rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      >
        Vaata teenust
      </button>
    </article>
  );
}

function ServiceModal({
  service,
  onClose,
}: {
  service: Service | null;
  onClose: () => void;
}) {
  if (!service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <button
        aria-label="Sulge"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <article className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[34px] bg-white p-5 shadow-2xl md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
              Teenuse detail
            </p>
            <h2 className="mt-2 text-3xl font-black">{service.title}</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-500">
              {service.provider}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black"
          >
            Sulge
          </button>
        </div>

        <PlaceholderImage className="mt-6 h-64" />

        <p className="mt-5 text-base leading-8 text-neutral-700">
          {service.description}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-[#fbfbfa] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
              Piirkond
            </p>
            <p className="mt-1 font-black">{service.area}</p>
          </div>

          <div className="rounded-2xl bg-[#fbfbfa] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
              Kaugus
            </p>
            <p className="mt-1 font-black">{service.distance}</p>
          </div>

          <div className="rounded-2xl bg-[#fbfbfa] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
              Hind
            </p>
            <p className="mt-1 font-black">{service.price || "Kokkuleppel"}</p>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-black/5 bg-[#fbfbfa] p-5">
          <h3 className="font-black">Lisainfo</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-600">
            {service.details.map((detail) => (
              <li key={detail}>• {detail}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <button className="rounded-full bg-black px-5 py-3 text-sm font-black text-white">
            {service.cta}
          </button>
          <button className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black">
            Sõnum
          </button>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-neutral-400">
          Teenuse detail avaneb modalina, et kasutaja ei kaotaks profiili või
          teenuste lehe konteksti.
        </p>
      </article>
    </div>
  );
}

export default function V2ServicesPage() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
              Services Discovery
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Teenused
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
              Leia teenusepakkujaid enda lähedalt. Teenuste puhul on hind
              vabatahtlik ja täpne info selgub tihti pärast vajaduse täpsustamist.
            </p>
          </div>

          <div className="rounded-[24px] bg-neutral-950 p-5 text-white lg:w-[360px]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
              Asukoht
            </p>
            <p className="mt-2 text-xl font-black">Paide, Eesti</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Teenused on Launchis local-first. Global sobib hiljem rohkem toodetele ja brändidele.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <input
            placeholder="Otsi teenust..."
            className="h-12 rounded-full border border-neutral-200 bg-white px-5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
          />

          <button className="rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-bold shadow-sm">
            Asukoht: Paide
          </button>

          <button className="rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-bold shadow-sm">
            Filtrid
          </button>

          <button className="rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-bold shadow-sm">
            Sinu lähedal
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-neutral-500">
          Skeleton: teenuste filtrid töötavad hiljem sama ajutise paneeli loogikaga nagu toodetes.
        </p>
      </section>

      <section className="rounded-[34px] border border-emerald-100 bg-emerald-50 p-6 shadow-sm md:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
              Kiire teade · ajutine teenindusasukoht
            </p>
            <h2 className="mt-3 text-3xl font-black">
              Puksiir Tallinnas, Gonsiori piirkonnas kuni 16:00
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
              Teenusepakkuja tavapärane piirkond võib olla Järvamaa, aga aktiivne
              ajutine asukoht teeb teenuse nähtavaks Tallinnas, kui kategooria ja aeg sobivad.
            </p>
          </div>

          <div className="rounded-[24px] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
              Hetke asukoht
            </p>
            <p className="mt-2 text-xl font-black">Gonsiori piirkond</p>
            <p className="mt-2 text-sm text-neutral-500">Kehtib kuni 16:00</p>
            <button className="mt-5 w-full rounded-full bg-black px-5 py-3 text-sm font-black text-white">
              Küsi abi
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[34px] border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm md:p-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
              Sinu lähedal
            </p>
            <h2 className="mt-2 text-3xl font-black">Esiletõstetud teenused</h2>
          </div>

          <button className="hidden rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm md:inline-flex">
            Vaata kõiki
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {featuredServices.map((service) => (
            <ServiceCard
              key={service.title}
              service={service}
              onOpen={setSelectedService}
            />
          ))}
        </div>
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
              Tulemused
            </p>
            <h2 className="mt-2 text-3xl font-black">Teenused sinu lähedal</h2>
          </div>

          <p className="text-sm font-semibold text-neutral-500">24 näidatud</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {normalServices.map((service) => (
            <ServiceCard
              key={service.title}
              service={service}
              onOpen={setSelectedService}
            />
          ))}
        </div>
      </section>

      <ServiceModal
        service={selectedService}
        onClose={() => setSelectedService(null)}
      />
    </div>
  );
}
