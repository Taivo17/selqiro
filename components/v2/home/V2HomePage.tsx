type DiscoveryItem = {
  eyebrow: string;
  title: string;
  meta: string;
  price?: string;
  tag?: string;
};

const startCards = [
  {
    title: "Tooted",
    description: "Otsin tooteid enda lähedalt või kaugemalt.",
    action: "Vaata tooteid",
  },
  {
    title: "Teenused",
    description: "Otsin teenusepakkujat enda lähedalt.",
    action: "Leia teenus",
  },
  {
    title: "Töökohad",
    description: "Tulevikus ettevõtete tööpakkumised sinu piirkonnas.",
    action: "Tulekul",
  },
];

const todayDiscoveries: DiscoveryItem[] = [
  {
    eyebrow: "Esiletõstetud toode",
    title: "Muruniiduk Husqvarna LC 140",
    meta: "Paide · Aiatehnika",
    price: "120 €",
  },
  {
    eyebrow: "Esiletõstetud teenus",
    title: "Puksiirabi Tallinnas kuni 16:00",
    meta: "Ajutine teenindusasukoht",
    tag: "LIVE",
  },
  {
    eyebrow: "Töökoht",
    title: "Müügikonsultant",
    meta: "Tartu · Kohalik ettevõte",
    price: "1200–1600 € / kuu",
  },
  {
    eyebrow: "Üritus",
    title: "Jazzkaar 2025",
    meta: "Tartu · 23. apr – 27. apr",
  },
  {
    eyebrow: "Kohalik tootja",
    title: "Värsked tomatid saadaval täna",
    meta: "Jõgevamaa · Männi Talu",
  },
];

const featuredProducts: DiscoveryItem[] = [
  {
    eyebrow: "Toode",
    title: "Cub Cadet murutraktor",
    meta: "Imavere · 18 km",
    price: "4562 €",
  },
  {
    eyebrow: "Toode",
    title: "BMW 5 Series",
    meta: "Türi · 24 km",
    price: "6000 €",
  },
  {
    eyebrow: "Toode",
    title: "iPhone 12 64GB",
    meta: "Paide · 0.8 km",
    price: "320 €",
  },
  {
    eyebrow: "Toode",
    title: "Diivanvoodi",
    meta: "Paide · 0.6 km",
    price: "150 €",
  },
  {
    eyebrow: "Toode",
    title: "Maastikuratas Scott",
    meta: "Paide · 0.7 km",
    price: "280 €",
  },
];

const featuredServices: DiscoveryItem[] = [
  {
    eyebrow: "Teenus",
    title: "Autoteenindus Paide",
    meta: "Autoremont · 0.3 km",
  },
  {
    eyebrow: "Teenus",
    title: "Paide Elektritööd OÜ",
    meta: "Elektritööd · 0.6 km",
  },
  {
    eyebrow: "Teenus",
    title: "Puksiirabi",
    meta: "Järvamaa · ajutine asukoht Tallinnas",
    tag: "LIVE",
  },
  {
    eyebrow: "Teenus",
    title: "Aiatehnika hooldus",
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
        <DiscoveryCard key={`${item.eyebrow}-${item.title}`} item={item} />
      ))}
    </div>
  );
}

export default function V2HomePage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 md:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
              Täna tähelepanu keskmes
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
              Männi Talu
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
              Täna saadaval värsked tomatid, kartul ja kurk. Kohalik päeva lugu
              vaheldub rahulikult maailma looga.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button className="rounded-full bg-black px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-neutral-800">
                Vaata lähemalt
              </button>
              <button className="rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-bold shadow-sm transition hover:border-neutral-300">
                Kontakt ja info
              </button>
            </div>
          </div>

          <div className="min-h-[260px] bg-gradient-to-br from-neutral-950 via-neutral-900 to-emerald-950 p-6 text-white md:p-8 lg:p-10">
            <div className="ml-auto max-w-md rounded-[28px] bg-white/10 p-5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-black">
                  60% kohalik
                </span>
                <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-white/80">
                  40% maailm
                </span>
              </div>

              <p className="text-sm font-bold text-emerald-300">
                Riigi / maailma jagatud koht
              </p>
              <h2 className="mt-3 text-2xl font-black">Tänane avastus</h2>
              <p className="mt-3 text-sm leading-6 text-white/70">
                Üks väärtuslik koht, mis ei sega kasutajat, vaid kutsub avastama.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
              Alusta otsingut
            </p>
            <h2 className="mt-2 text-3xl font-black">Vali, mida soovid leida</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {startCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[24px] border border-black/5 bg-[#fbfbfa] p-5 transition hover:bg-white hover:shadow-sm"
              >
                <h3 className="text-xl font-black">{card.title}</h3>
                <p className="mt-2 min-h-[54px] text-sm leading-6 text-neutral-600">
                  {card.description}
                </p>
                <button className="mt-4 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold">
                  {card.action}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <SectionHeader
          eyebrow="Täna avastamiseks"
          title="Huvitavad võimalused"
          action="Vaata kõiki"
        />
        <HorizontalRow items={todayDiscoveries} />
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <SectionHeader
          eyebrow="Sinu lähedal"
          title="Esiletõstetud tooted"
          action="Vaata kõiki"
        />
        <HorizontalRow items={featuredProducts} />
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <SectionHeader
          eyebrow="Sinu lähedal"
          title="Esiletõstetud teenused"
          action="Vaata kõiki"
        />
        <HorizontalRow items={featuredServices} />
      </section>

      <section className="rounded-[34px] border border-blue-100 bg-blue-50 p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-blue-500">
          Hiljem
        </p>
        <h2 className="mt-2 text-2xl font-black text-blue-950">
          Daily Discovery ja isiklikud avastused
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-900">
          Siia saab hiljem tulla kasutajale valitud lühike päevane avastus:
          üks uudis, innovatsioon, kuulutus, teenus või muu kasulik info.
        </p>
      </section>
    </div>
  );
}
