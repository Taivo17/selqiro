"use client";

import Link from "next/link";
import { useState } from "react";
import ProductResultsSection from "../../../src/features/product-discovery/components/ProductResultsSection";

type ActivePanel = "price" | "location" | "filters" | "sort" | null;

type ProductCard = {
  title: string;
  seller: string;
  category: string;
  location: string;
  distance: string;
  price: string;
  meta: string;
  badge?: string;
};

const featuredProducts: ProductCard[] = [
  {
    title: "Cub Cadet murutraktor",
    seller: "Milline Vedu",
    category: "Aiatehnika",
    location: "Imavere",
    distance: "~18 km",
    price: "4562 €",
    meta: "Kasutatud · heas korras",
    badge: "Esiletõstetud",
  },
  {
    title: "Muruniiduk Honda",
    seller: "Taivo Garaaž",
    category: "Aed",
    location: "Paide",
    distance: "~0.8 km",
    price: "320 €",
    meta: "Bensiin · töökorras",
    badge: "Esiletõstetud",
  },
  {
    title: "BMW 5 Series",
    seller: "Garaaž test",
    category: "Sõidukid",
    location: "Türi",
    distance: "~24 km",
    price: "6000 €",
    meta: "Kasutatud · diisel",
    badge: "Hea hind",
  },
];

const products: ProductCard[] = [
  {
    title: "Hummer H1 Offroad SUV",
    seller: "Garaaž test",
    category: "Sõidukid",
    location: "Türi",
    distance: "~28 km",
    price: "99000 €",
    meta: "Kasutatud · maastur",
  },
  {
    title: "Lamborghini Aventador SVJ",
    seller: "Test",
    category: "Sõidukid",
    location: "Tallinn",
    distance: "~82 km",
    price: "600000 €",
    meta: "Super sport · roheline",
  },
  {
    title: "Old commercial truck",
    seller: "test Sindi",
    category: "Sõidukid",
    location: "Sindi",
    distance: "~94 km",
    price: "8967 €",
    meta: "Kasutatud · veoauto",
  },
  {
    title: "Biltema ketassaag",
    seller: "Tööriistad Paide",
    category: "Tööriistad",
    location: "Paide",
    distance: "~1.2 km",
    price: "45 €",
    meta: "Heas korras",
  },
  {
    title: "Diivanvoodi",
    seller: "Kodu",
    category: "Mööbel",
    location: "Paide",
    distance: "~0.6 km",
    price: "150 €",
    meta: "Kasutatud · puhas",
  },
  {
    title: "iPhone 12 64GB",
    seller: "Telefonid",
    category: "Elektroonika",
    location: "Paide",
    distance: "~0.8 km",
    price: "320 €",
    meta: "Aku 86%",
  },
];

type RelatedService = {
  title: string;
  provider: string;
  description: string;
  meta: string;
  badge?: string;
};

const relatedServices: RelatedService[] = [
  {
    title: "Aiatehnika hooldus",
    provider: "Milline Vedu",
    description: "Murutraktorite, niidukite ja väiketehnika hooldus.",
    meta: "Seotud: murutraktorid · ~12 km",
    badge: "Esiletõstetud",
  },
  {
    title: "Transport kokkuleppel",
    provider: "Kohalik transport",
    description: "Suurema tehnika kohaletoomine või vedu kokkuleppel.",
    meta: "Seotud: aiatehnika · ~18 km",
    badge: "Esiletõstetud",
  },
  {
    title: "Varuosad ja nõustamine",
    provider: "Roheline Tehnika",
    description: "Aitame valida sobiva varuosa või hoolduslahenduse.",
    meta: "Seotud: hooldus ja remont · ~28 km",
    badge: "Esiletõstetud",
  },
];

const sortOptions = ["Sinu lähedal", "Uuemad ees", "Odavamad ees", "Kallimad ees"];

function ProductCardView({
  product,
  compact = false,
}: {
  product: ProductCard;
  compact?: boolean;
}) {
  return (
    <article
      className={[
        "group rounded-[26px] border border-black/5 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        "flex gap-4 md:block",
        compact ? "md:min-w-[250px]" : "",
      ].join(" ")}
    >
      <div className="h-28 w-32 shrink-0 rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200 md:h-44 md:w-full" />

      <div className="min-w-0 flex-1 md:mt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            {product.badge ? (
              <span className="mb-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                {product.badge}
              </span>
            ) : null}

            <h3 className="text-base font-black leading-tight md:text-lg">
              {product.title}
            </h3>
          </div>

          <button className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-600">
            ♡
          </button>
        </div>

        <p className="mt-2 text-sm text-neutral-500">{product.meta}</p>
        <p className="mt-1 text-xs font-semibold text-neutral-400">
          {product.category} · {product.seller}
        </p>

        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-xl font-black">{product.price}</p>

          <p className="text-right text-xs text-neutral-500">
            {product.location}
            <br />
            <span className="text-neutral-400">{product.distance}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

function RelatedServiceCardView({ service }: { service: RelatedService }) {
  return (
    <article className="min-w-[250px] rounded-[22px] border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:min-w-[280px]">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-teal-200 bg-teal-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">
          {service.badge || "Teenus"}
        </span>

        <button className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-500">
          ♡
        </button>
      </div>

      <h3 className="mt-3 text-base font-black">{service.title}</h3>
      <p className="mt-1 text-sm font-semibold text-neutral-500">
        {service.provider}
      </p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        {service.description}
      </p>
      <p className="mt-3 text-xs font-semibold text-neutral-400">
        {service.meta}
      </p>

      <button className="mt-4 rounded-full border border-teal-200 bg-white px-4 py-2 text-xs font-black text-teal-700 shadow-sm transition hover:bg-teal-100">
        Vaata teenust
      </button>
    </article>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-3 text-sm font-bold shadow-sm transition",
        active
          ? "border-amber-300 bg-amber-100 text-amber-950"
          : "border-neutral-200 bg-white text-black hover:border-neutral-300",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function FilterPanel({
  activePanel,
  sortLabel,
  onClose,
  onSortChange,
}: {
  activePanel: ActivePanel;
  sortLabel: string;
  onClose: () => void;
  onSortChange: (value: string) => void;
}) {
  if (!activePanel) return null;

  return (
    <div className="mt-4 rounded-[28px] border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.20em] text-amber-700">
            Ajutine paneel
          </p>

          <h3 className="mt-2 text-2xl font-black">
            {activePanel === "price" && "Hind"}
            {activePanel === "location" && "Asukoht"}
            {activePanel === "filters" && "Täpsusta otsingut"}
            {activePanel === "sort" && "Järjestus"}
          </h3>
        </div>

        <button
          onClick={onClose}
          className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold"
        >
          Sulge
        </button>
      </div>

      {activePanel === "price" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-bold text-neutral-700">Hind alates</span>
            <input
              placeholder="0"
              className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-neutral-700">Hind kuni</span>
            <input
              placeholder="500"
              className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-400"
            />
          </label>

          <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-neutral-600">
            Muutub kohe
          </p>
        </div>
      ) : null}

      {activePanel === "location" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <button className="rounded-2xl border border-amber-300 bg-amber-100 px-4 py-4 text-left text-sm font-bold text-amber-950">
            Asukoht: Paide
            <span className="mt-1 block text-xs font-medium text-amber-800/70">
              Vaikimisi
            </span>
          </button>

          <button className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-left text-sm font-bold">
            Muuda linna
            <span className="mt-1 block text-xs font-medium text-neutral-500">
              Hiljem avaneb linnavalik
            </span>
          </button>

          <button className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-left text-sm font-bold">
            Global
            <span className="mt-1 block text-xs font-medium text-neutral-500">
              Eraldi režiim hiljem
            </span>
          </button>
        </div>
      ) : null}

      {activePanel === "filters" ? (
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4">
            <h4 className="font-black">Seisukord</h4>
            <div className="mt-3 space-y-2 text-sm text-neutral-600">
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Uus
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Kasutatud
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Vajab remonti
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <h4 className="font-black">Kategooria</h4>
            <div className="mt-3 space-y-2 text-sm text-neutral-600">
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Sõidukid
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Aed
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Tööriistad
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <h4 className="font-black">Lisavalikud</h4>
            <div className="mt-3 space-y-2 text-sm text-neutral-600">
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Ainult pildiga
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Ettevõttelt
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Esiletõstetud
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {activePanel === "sort" ? (
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {sortOptions.map((option) => (
            <button
              key={option}
              onClick={() => onSortChange(option)}
              className={[
                "rounded-2xl border px-4 py-4 text-left text-sm font-bold transition",
                sortLabel === option
                  ? "border-amber-300 bg-amber-100 text-amber-950"
                  : "border-neutral-200 bg-white hover:border-neutral-300",
              ].join(" ")}
            >
              {option}
              {option === "Sinu lähedal" ? (
                <span className="mt-1 block text-xs font-medium opacity-70">
                  Vaikimisi
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-5 text-sm leading-6 text-neutral-500">
        Skeleton: hiljem muudab iga valik tulemusi kohe. Eraldi “Rakenda filtrid”
        nuppu ei tule.
      </p>
    </div>
  );
}

export default function V2ProductDiscoveryPage() {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [sortLabel, setSortLabel] = useState("Sinu lähedal");

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-800">
              Product Discovery
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
              Tooted
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              Leia tooteid enda lähedalt. Selqiro alustab sinu valitud asukohast,
              näitab lähimaid tulemusi ja laiendab ringi automaatselt.
            </p>
          </div>

          <div className="rounded-[22px] bg-neutral-950 px-5 py-4 text-white md:w-[300px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
              Asukoht
            </p>
            <p className="mt-1 text-xl font-black">Paide, Eesti</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            placeholder="Otsi toodet..."
            className="h-12 rounded-full border border-neutral-200 bg-white px-5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
          />

          <ToolbarButton
            label="Hind"
            active={activePanel === "price"}
            onClick={() => togglePanel("price")}
          />

          <ToolbarButton
            label="Asukoht: Paide"
            active={activePanel === "location"}
            onClick={() => togglePanel("location")}
          />

          <ToolbarButton
            label="Filtrid"
            active={activePanel === "filters"}
            onClick={() => togglePanel("filters")}
          />

          <ToolbarButton
            label={sortLabel}
            active={activePanel === "sort"}
            onClick={() => togglePanel("sort")}
          />
        </div>

        <FilterPanel
          activePanel={activePanel}
          sortLabel={sortLabel}
          onClose={() => setActivePanel(null)}
          onSortChange={setSortLabel}
        />

        <p className="mt-4 text-sm leading-6 text-neutral-500">
          Vaikimisi järjestus on “Sinu lähedal”. Soovi korral saab hiljem valida
          uuemad, odavamad või kallimad ees. Global otsing on eraldi asukoharežiim.
        </p>
      </section>

      <section className="relative overflow-hidden rounded-[34px] border border-amber-200 bg-amber-50 p-6 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-amber-500 before:content-[''] md:p-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-800">
              Sinu lähedal
            </p>
            <h2 className="mt-2 text-3xl font-black">Esiletõstetud tooted</h2>
          </div>

          <button className="hidden rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-black text-amber-800 shadow-sm transition hover:bg-amber-100 md:inline-flex">
            Vaata kõiki
          </button>
        </div>

        <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
          {featuredProducts.map((product) => (
            <ProductCardView
              key={`featured-${product.title}`}
              product={product}
              compact
            />
          ))}
        </div>
      </section>

      {relatedServices.length > 0 ? (
        <section className="relative overflow-hidden rounded-[34px] border border-teal-200 bg-teal-50 p-6 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-teal-500 before:content-[''] md:p-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
                Seotud abi
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                Kasulikud teenused selle otsingu juurde
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                Kuvame ainult otsingu või tootekategooriaga seotud esiletõstetud
                teenuseid. Kui sobivaid teenuseid ei ole, seda riba ei näidata.
              </p>
            </div>

            <button className="hidden rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-black text-teal-700 shadow-sm transition hover:bg-teal-100 md:inline-flex">
              Vaata kõiki
            </button>
          </div>

          <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2">
            {relatedServices.map((service) => (
              <RelatedServiceCardView key={service.title} service={service} />
            ))}
          </div>
        </section>
      ) : null}

      <ProductResultsSection />
    </div>
  );
}
