type ProfileItem = {
  title: string;
  meta: string;
  price?: string;
  badge?: string;
};

const showcases: ProfileItem[] = [
  {
    title: "Aiatehnika näidised",
    meta: "Hooldatud murutraktorid ja niidukid",
    badge: "Tootenäidis",
  },
  {
    title: "Transpordilahendused",
    meta: "Haagised, tööriistad ja varuosad",
    badge: "Tootenäidis",
  },
  {
    title: "Kohalik töökoja valik",
    meta: "Näited sellest, mida pakume",
    badge: "Portfoolio",
  },
];

const listings: ProfileItem[] = [
  {
    title: "Cub Cadet murutraktor",
    meta: "Aiatehnika · Paide piirkond",
    price: "4562 €",
  },
  {
    title: "BMW 5 Series",
    meta: "Sõidukid · Türi piirkond",
    price: "6000 €",
  },
  {
    title: "Biltema ketassaag",
    meta: "Tööriistad · Paide piirkond",
    price: "45 €",
  },
];

const services: ProfileItem[] = [
  {
    title: "Aiatehnika hooldus",
    meta: "Murutraktorid, niidukid ja väike tehnika",
    badge: "Teenus",
  },
  {
    title: "Transport kokkuleppel",
    meta: "Võimalik kohalik transport ja kohaletoomine",
    badge: "Teenus",
  },
  {
    title: "Nõustamine enne ostu",
    meta: "Aitame valida sobiva masina",
    badge: "Teenus",
  },
];

const updates: ProfileItem[] = [
  {
    title: "Täna lisandus uus murutraktor",
    meta: "Uuendatud 24 min tagasi",
  },
  {
    title: "Kevadhooaja hoolduse ajad avatud",
    meta: "Eelmine nädal",
  },
];

function ModuleHeader({
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

function ItemCard({ item }: { item: ProfileItem }) {
  return (
    <article className="min-w-[230px] rounded-[24px] border border-black/5 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <PlaceholderImage className="h-28" />

      <div className="mt-3 flex items-center justify-between gap-3">
        {item.badge ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
            {item.badge}
          </span>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
            Kuulutus
          </span>
        )}

        <button className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-500">
          ♡
        </button>
      </div>

      <h3 className="mt-2 line-clamp-2 text-base font-black">{item.title}</h3>
      <p className="mt-1 text-sm leading-5 text-neutral-500">{item.meta}</p>

      {item.price ? <p className="mt-3 text-lg font-black">{item.price}</p> : null}
    </article>
  );
}

function HorizontalModule({ items }: { items: ProfileItem[] }) {
  return (
    <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
      {items.map((item) => (
        <ItemCard key={item.title} item={item} />
      ))}
    </div>
  );
}

export default function V2PublicProfilePage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white shadow-sm">
        <div className="h-56 bg-gradient-to-br from-neutral-900 via-neutral-700 to-emerald-900" />

        <div className="px-6 pb-7 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="-mt-16 h-32 w-32 shrink-0 rounded-full border-4 border-white bg-white shadow-lg">
                <div className="h-full w-full rounded-full bg-gradient-to-br from-neutral-100 to-neutral-300" />
              </div>

              <div className="pt-2 md:pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black tracking-tight">
                    Milline Vedu
                  </h1>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    Profiil
                  </span>
                </div>

                <p className="mt-2 max-w-2xl text-base leading-7 text-neutral-600">
                  Hooldatud tehnika, sõidukid ja kohalikud teenused. Selge info,
                  aus suhtlus ja võimalus leida lähedalt sobiv lahendus.
                </p>

                <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-neutral-500">
                  <span>Paide piirkond</span>
                  <span>·</span>
                  <span>Liitunud Selqiroga 2024</span>
                  <span>·</span>
                  <span>Profiil täidetud</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-0 md:pt-8">
              <button className="rounded-full bg-black px-6 py-3 text-sm font-black text-white shadow-sm">
                Kirjuta
              </button>
              <button className="rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-black shadow-sm">
                Jälgi
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className="rounded-[34px] border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
                  Kiire teade
                </p>
                <h2 className="mt-3 text-2xl font-black">
                  Täna saadaval hooldatud murutraktor
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Võimalik tulla vaatama Paide piirkonnas. Täpne koht lepitakse
                  kokku sõnumites.
                </p>
              </div>

              <button className="rounded-full bg-black px-6 py-3 text-sm font-black text-white">
                Kirjuta
              </button>
            </div>
          </section>

          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <ModuleHeader
              eyebrow="Tootenäidised"
              title="Mida see profiil pakub"
              action="Vaata kõiki"
            />
            <HorizontalModule items={showcases} />
          </section>

          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <ModuleHeader
              eyebrow="Kuulutused"
              title="Müügis praegu"
              action="Vaata kõiki"
            />
            <HorizontalModule items={listings} />
          </section>

          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <ModuleHeader
              eyebrow="Teenused"
              title="Pakutavad teenused"
              action="Vaata kõiki"
            />
            <HorizontalModule items={services} />
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Teave profiili kohta
            </p>

            <div className="mt-5 space-y-4 text-sm leading-6 text-neutral-700">
              <p>
                Profiil võib kuuluda müüjale, teenusepakkujale, kohalikule
                tootjale või tulevasele brändile.
              </p>

              <div className="rounded-2xl bg-[#fbfbfa] p-4">
                <p className="font-black">Asukoht</p>
                <p className="mt-1 text-neutral-500">
                  Paide piirkond, Eesti
                </p>
              </div>

              <div className="rounded-2xl bg-[#fbfbfa] p-4">
                <p className="font-black">Usaldus</p>
                <p className="mt-1 text-neutral-500">
                  Profiil täidetud · aktiivne hiljuti
                </p>
              </div>

              <div className="rounded-2xl bg-[#fbfbfa] p-4">
                <p className="font-black">Tegutseb kui</p>
                <p className="mt-1 text-neutral-500">
                  Müüja · teenusepakkuja · kohalik tootja
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                  Asukoht
                </p>
                <h2 className="mt-2 text-xl font-black">Paide piirkond</h2>
              </div>
            </div>

            <div className="h-36 rounded-[22px] bg-gradient-to-br from-neutral-100 to-neutral-200" />

            <p className="mt-4 text-sm leading-6 text-neutral-500">
              Asukoht on ligikaudne. Täpne koht lepitakse kokku sõnumites.
            </p>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                  Uuendused
                </p>
                <h2 className="mt-2 text-xl font-black">Viimased teated</h2>
              </div>

              <button className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-black shadow-sm">
                Kõik
              </button>
            </div>

            <div className="space-y-3">
              {updates.map((update) => (
                <article
                  key={update.title}
                  className="rounded-[20px] border border-black/5 bg-[#fbfbfa] p-4"
                >
                  <h3 className="text-sm font-black">{update.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {update.meta}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
