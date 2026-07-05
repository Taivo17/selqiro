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
    distance: "18 km",
    price: "4562 €",
    meta: "Kasutatud · heas korras",
    badge: "Esiletõstetud",
  },
  {
    title: "Muruniiduk Honda",
    seller: "Taivo Garaaž",
    category: "Aed",
    location: "Paide",
    distance: "0.8 km",
    price: "320 €",
    meta: "Bensiin · töökorras",
    badge: "Esiletõstetud",
  },
  {
    title: "BMW 5 Series",
    seller: "Garaaž test",
    category: "Sõidukid",
    location: "Türi",
    distance: "24 km",
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
    distance: "28 km",
    price: "99000 €",
    meta: "Kasutatud · maastur",
  },
  {
    title: "Lamborghini Aventador SVJ",
    seller: "Test",
    category: "Sõidukid",
    location: "Tallinn",
    distance: "82 km",
    price: "600000 €",
    meta: "Super sport · roheline",
  },
  {
    title: "Old commercial truck",
    seller: "test Sindi",
    category: "Sõidukid",
    location: "Sindi",
    distance: "94 km",
    price: "8967 €",
    meta: "Kasutatud · veoauto",
  },
  {
    title: "Biltema ketassaag",
    seller: "Tööriistad Paide",
    category: "Tööriistad",
    location: "Paide",
    distance: "1.2 km",
    price: "45 €",
    meta: "Heas korras",
  },
  {
    title: "Diivanvoodi",
    seller: "Kodu",
    category: "Mööbel",
    location: "Paide",
    distance: "0.6 km",
    price: "150 €",
    meta: "Kasutatud · puhas",
  },
  {
    title: "iPhone 12 64GB",
    seller: "Telefonid",
    category: "Elektroonika",
    location: "Paide",
    distance: "0.8 km",
    price: "320 €",
    meta: "Aku 86%",
  },
];

function ProductCardView({ product, compact = false }: { product: ProductCard; compact?: boolean }) {
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

function ToolbarButton({ label }: { label: string }) {
  return (
    <button className="rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-bold shadow-sm transition hover:border-neutral-300">
      {label}
    </button>
  );
}

export default function V2ProductDiscoveryPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
              Product Discovery
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Tooted
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
              Leia tooteid enda lähedalt. Selqiro alustab sinu valitud asukohast,
              näitab lähimaid ja sobivaid tulemusi ning laiendab ringi automaatselt.
            </p>
          </div>

          <div className="rounded-[24px] bg-neutral-950 p-5 text-white lg:w-[360px]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
              Asukoht
            </p>
            <p className="mt-2 text-xl font-black">Paide, Eesti</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Selqiro alustab lähedalt ja laiendab ringi automaatselt.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[34px] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            placeholder="Otsi toodet..."
            className="h-12 rounded-full border border-neutral-200 bg-white px-5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
          />

          <ToolbarButton label="Hind" />
          <ToolbarButton label="Minu lähedal: Paide" />
          <ToolbarButton label="Filtrid" />
          <ToolbarButton label="Sinu lähedal" />
        </div>

        <p className="mt-4 text-sm leading-6 text-neutral-500">
          Vaikimisi järjestus on “Sinu lähedal”. Soovi korral saab hiljem valida uuemad, odavamad või global otsingu.
        </p>
      </section>

      <section className="rounded-[34px] border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm md:p-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
              Sinu lähedal
            </p>
            <h2 className="mt-2 text-3xl font-black">Esiletõstetud tooted</h2>
          </div>

          <button className="hidden rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm md:inline-flex">
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

      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
              Tulemused
            </p>
            <h2 className="mt-2 text-3xl font-black">Viimased kuulutused</h2>
          </div>

          <p className="text-sm font-semibold text-neutral-500">30 näidatud</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCardView key={product.title} product={product} />
          ))}
        </div>

        <div className="mt-8 rounded-[26px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-5 text-center">
          <p className="text-sm font-bold text-neutral-700">
            Tulemused laadivad automaatselt juurde, kui kasutaja jõuab lõppu.
          </p>
        </div>
      </section>
    </div>
  );
}
