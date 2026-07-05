import Link from "next/link";
import V2Shell from "../../components/v2/layout/V2Shell";

const modules = [
  {
    title: "Discovery avaleht",
    description:
      "Uus avaleht jutustab, mis Selqiro on, ja aitab kasutajal avastada tooteid, teenuseid, tööd ja kasulikku infot.",
    status: "Järgmine",
  },
  {
    title: "Product Discovery",
    description:
      "Toodete sirvimine, filtrid, otsing, Listing Card ja automaatne tulemuste laadimine.",
    status: "Planeeritud",
  },
  {
    title: "Avalik profiil",
    description:
      "Ühtne profiili vundament müüjale, teenusepakkujale ja kohalikule tootjale.",
    status: "Planeeritud",
  },
  {
    title: "Minu ala",
    description:
      "Omaniku privaatne töölaud kuulutuste, teenuste, uuenduste, Energy ja seadete haldamiseks.",
    status: "Planeeritud",
  },
];

export default function V2Page() {
  return (
    <V2Shell>
      <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-sm md:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-emerald-600">
              Selqiro V2
            </p>

            <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
              Globaalne platvorm, mis tundub kohalik.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
              See on V2 puhas arenduskiht. Vana portaal jääb tööle, samal ajal
              ehitame uut Selqiro kogemust väikeste testitavate moodulitena.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full bg-black px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-neutral-800"
              >
                Ava vana portaal
              </Link>

              <Link
                href="/my-page"
                className="rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-bold shadow-sm transition hover:border-neutral-300"
              >
                Ava praegune Minu leht
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] bg-neutral-950 p-6 text-white shadow-xl">
            <p className="text-sm font-semibold text-emerald-300">
              Phase 1
            </p>
            <h2 className="mt-2 text-2xl font-black">V2 shell ja navigatsioon</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Esimene eesmärk on luua uus raam: header, navigeerimine,
              aktiivne identiteet, sõnumite ligipääs ja mobiili põhi.
            </p>

            <div className="mt-6 rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Aktiivne identiteet
              </p>
              <p className="mt-1 text-lg font-bold">Milline Vedu</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {modules.map((module) => (
          <article
            key={module.title}
            className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-black">{module.title}</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {module.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              {module.description}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-[28px] border border-blue-100 bg-blue-50 p-6">
        <h2 className="text-lg font-black text-blue-950">V2 ehitusreegel</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-900">
          Üks moodul korraga. Build. Test. Commit. Alles siis järgmine moodul.
          See hoiab vana portaali töös ja vähendab riski.
        </p>
      </section>
    </V2Shell>
  );
}
