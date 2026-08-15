"use client";

import { useState } from "react";
import V2DiscoveryTypeSwitcher from "../../../src/features/v2-shell/components/V2DiscoveryTypeSwitcher";

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

const quickUpdates: Service[] = [
  {
    title: "Puksiir Tallinnas kuni 16:00",
    provider: "Paide Puksiirabi",
    description:
      "Ajutine teenindusasukoht Gonsiori piirkonnas. Sobib puksiiri ja autoabi otsinguga.",
    area: "Tallinn, Gonsiori piirkond",
    distance: "kehtib kuni 16:00",
    badge: "Kiire teade",
    cta: "Küsi abi",
    details: [
      "Tavapärane piirkond on Järvamaa.",
      "Aktiivne ajutine asukoht teeb teenuse nähtavaks Tallinnas.",
      "Kui aeg lõpeb, kaob ajutine asukoht otsingust.",
    ],
  },
  {
    title: "Täna vaba aeg aiatehnika hoolduseks",
    provider: "Milline Vedu",
    description:
      "Täna saab veel ühe muruniiduki või murutraktori hoolduse aja kokku leppida.",
    area: "Paide piirkond",
    distance: "~12 km",
    badge: "Kiire teade",
    cta: "Kirjuta",
    details: [
      "Kiire teade on seotud teenuse ja piirkonnaga.",
      "Kui teade aegub, jääb see hiljem uuenduste ajalukku.",
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

function SectionHeader({
  eyebrow,
  title,
  helper,
  action,
}: {
  eyebrow: string;
  title: string;
  helper?: string;
  action?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-black">{title}</h2>
        {helper ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            {helper}
          </p>
        ) : null}
      </div>

      {action ? (
        <button className="hidden rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-black text-teal-700 shadow-sm transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 md:inline-flex">
          {action}
        </button>
      ) : null}
    </div>
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
          <span className="rounded-full border border-teal-200 bg-teal-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">
            {service.badge}
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">
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

function QuickUpdateCard({
  service,
  onOpen,
}: {
  service: Service;
  onOpen: (service: Service) => void;
}) {
  return (
    <article className="min-w-[280px] rounded-[24px] border border-teal-200 bg-white p-5 shadow-sm md:min-w-[360px]">
      <span className="rounded-full border border-teal-200 bg-teal-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">
        {service.badge}
      </span>

      <h3 className="mt-3 text-lg font-black">{service.title}</h3>
      <p className="mt-1 text-sm font-semibold text-neutral-500">
        {service.provider}
      </p>
      <p className="mt-3 text-sm leading-6 text-neutral-600">
        {service.description}
      </p>

      <div className="mt-4 rounded-2xl bg-[#fbfbfa] p-4">
        <p className="text-sm font-black">{service.area}</p>
        <p className="mt-1 text-xs text-neutral-500">{service.distance}</p>
      </div>

      <button
        onClick={() => onOpen(service)}
        className="mt-4 w-full rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      >
        {service.cta}
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

      <article className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[34px] border border-teal-200 bg-white p-5 shadow-2xl md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
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
              Kaugus / aeg
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
      </article>
    </div>
  );
}

export default function V2ServicesPage() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  return (
    <div className="space-y-8">
      <V2DiscoveryTypeSwitcher active="services" />

      <section className="rounded-[34px] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
              Teenused
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
              Leia teenus enda lähedalt
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              Otsing mõjutab esiletõstetud teenuseid, kiireid teateid ja tavalisi
              tulemusi. Teenuste hind on vabatahtlik.
            </p>
          </div>

          <div className="rounded-[22px] bg-neutral-950 px-5 py-4 text-white md:w-[300px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
              Asukoht
            </p>
            <p className="mt-1 text-xl font-black">Paide, Eesti</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <input
            placeholder="Otsi teenust..."
            className="h-12 rounded-full border border-neutral-200 bg-white px-5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
          />

          <button className="rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-bold shadow-sm">
            Asukoht: Paide
          </button>

          <button className="rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-bold shadow-sm">
            Filtrid
          </button>

          <button className="rounded-full border border-teal-300 bg-teal-100 px-4 py-3 text-sm font-black text-teal-950 shadow-sm">
            Sinu lähedal
          </button>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[34px] border border-teal-200 bg-teal-50 p-6 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-teal-500 before:content-[''] md:p-8">
        <SectionHeader
          eyebrow="Sinu lähedal"
          title="Esiletõstetud teenused"
          helper="Esiletõstetud teenused on esimesena nähtavad, kui need sobivad otsingu, piirkonna ja kategooriaga."
          action="Vaata kõiki"
        />

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

      {quickUpdates.length > 0 ? (
        <section className="relative overflow-hidden rounded-[34px] border border-teal-200 bg-teal-50 p-6 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-teal-500 before:content-[''] md:p-8">
          <SectionHeader
            eyebrow="Aktiivne info"
            title="Kiired teated sinu lähedal"
            helper="Siin näeme ajaliselt olulisi teenusteateid ja ajutisi teeninduskohti, mis sobivad otsinguga."
            action="Vaata kõiki"
          />

          <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
            {quickUpdates.map((service) => (
              <QuickUpdateCard
                key={service.title}
                service={service}
                onOpen={setSelectedService}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-[34px] border border-teal-200 bg-teal-50 p-6 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-teal-500 before:content-[''] md:p-8">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
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
