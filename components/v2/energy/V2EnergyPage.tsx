"use client";

import { useState } from "react";

type EnergyPackage = {
  name: string;
  energy: number;
  price: string;
  helper: string;
  recommended?: boolean;
};

type EnergyHistoryItem = {
  title: string;
  meta: string;
  amount: string;
  type: "plus" | "minus" | "reserved";
};

const packages: EnergyPackage[] = [
  {
    name: "Starter",
    energy: 100,
    price: "10 €",
    helper: "Sobib üksikuks esiletõstmiseks",
  },
  {
    name: "Professional",
    energy: 500,
    price: "45 €",
    helper: "Parem ühikuhind",
    recommended: true,
  },
  {
    name: "Business",
    energy: 1500,
    price: "120 €",
    helper: "Aktiivsele ettevõttele",
  },
];

const history: EnergyHistoryItem[] = [
  {
    title: "Tervitus Energy",
    meta: "Uue liituja kingitus · proovi esiletõstmist",
    amount: "+100",
    type: "plus",
  },
  {
    title: "Energy lisatud",
    meta: "Professional pakett · makse õnnestus",
    amount: "+500",
    type: "plus",
  },
  {
    title: "Kuulutuse esiletõstmine",
    meta: "Cub Cadet murutraktor · 7 päeva",
    amount: "-80",
    type: "minus",
  },
  {
    title: "Today's Story reserveering",
    meta: "Ülevaatusel · Energy reserveeritud",
    amount: "5000",
    type: "reserved",
  },
  {
    title: "Selqiro tugi lisas Energy",
    meta: "Tehniline parandus",
    amount: "+50",
    type: "plus",
  },
];

function PackageCard({
  item,
  selected,
  onSelect,
}: {
  item: EnergyPackage;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        "rounded-[26px] border p-5 text-left shadow-sm transition",
        selected
          ? "border-black bg-black text-white"
          : "border-black/5 bg-white hover:border-neutral-300",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={[
              "text-xs font-black uppercase tracking-[0.2em]",
              selected ? "text-white/50" : "text-emerald-600",
            ].join(" ")}
          >
            {item.name}
          </p>
          <p className="mt-3 text-4xl font-black">{item.energy}</p>
          <p className={selected ? "text-white/60" : "text-neutral-500"}>
            Energy
          </p>
        </div>

        {item.recommended ? (
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-black",
              selected ? "bg-white text-black" : "bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            Soovitatud
          </span>
        ) : null}
      </div>

      <p className="mt-5 text-2xl font-black">{item.price}</p>
      <p className={selected ? "mt-2 text-sm text-white/60" : "mt-2 text-sm text-neutral-500"}>
        {item.helper}
      </p>
    </button>
  );
}

function HistoryRow({ item }: { item: EnergyHistoryItem }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div>
        <h3 className="font-black">{item.title}</h3>
        <p className="mt-1 text-sm text-neutral-500">{item.meta}</p>
      </div>

      <span
        className={[
          "rounded-full px-3 py-1 text-sm font-black",
          item.type === "plus"
            ? "bg-emerald-50 text-emerald-700"
            : item.type === "minus"
              ? "bg-neutral-100 text-neutral-700"
              : "bg-amber-50 text-amber-700",
        ].join(" ")}
      >
        {item.amount}
      </span>
    </div>
  );
}

export default function V2EnergyPage() {
  const [selectedPackage, setSelectedPackage] = useState("Professional");

  const selected = packages.find((item) => item.name === selectedPackage) || packages[1];

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
              Energy
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Energy wallet
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
              Energy on Selqiro lisavõimaluste jaoks: esiletõstmine, Today's Story,
              ajutine teenindusasukoht ja tulevased AI/Knowledge tegevused.
            </p>
          </div>

          <div className="rounded-[26px] bg-neutral-950 p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">
              Tegutsen kui
            </p>
            <p className="mt-2 text-2xl font-black">Milline Vedu</p>

            <div className="mt-5 rounded-[22px] bg-white/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">
                Saldo
              </p>
              <p className="mt-2 text-5xl font-black">156</p>
              <p className="mt-1 text-sm text-white/60">Energy saadaval</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
                  Osta Energy
                </p>
                <h2 className="mt-2 text-3xl font-black">Paketid</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                  Energy lehel ostetakse tavaliselt pakette. Konkreetse tasulise
                  tegevuse sees arvutab Selqiro hiljem puuduva Energy automaatselt.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {packages.map((item) => (
                <PackageCard
                  key={item.name}
                  item={item}
                  selected={selectedPackage === item.name}
                  onSelect={() => setSelectedPackage(item.name)}
                />
              ))}
            </div>

            <div className="mt-6 rounded-[26px] border border-black/5 bg-[#fbfbfa] p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <h3 className="text-xl font-black">
                    Valitud: {selected.name} · {selected.energy} Energy
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Järgmises päris versioonis viib see turvalisse makseteenuse
                    checkouti. Selqiro ei salvesta kaardiandmeid.
                  </p>
                </div>

                <button className="rounded-full bg-black px-6 py-3 text-sm font-black text-white">
                  Jätka turvalisse maksesse
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
              Tegevuse sees
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Kui Energy’t jääb puudu
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              Kui kasutaja alustab tasulist tegevust ja Energy’t ei piisa,
              arvutab Selqiro puuduva koguse ning laseb jätkata samast kohast.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[22px] bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                  Vajalik
                </p>
                <p className="mt-2 text-3xl font-black">5000</p>
                <p className="text-sm text-neutral-500">Today's Story</p>
              </div>

              <div className="rounded-[22px] bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                  Sinu saldo
                </p>
                <p className="mt-2 text-3xl font-black">1200</p>
                <p className="text-sm text-neutral-500">Energy walletis</p>
              </div>

              <div className="rounded-[22px] bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                  Puudu
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-700">3800</p>
                <p className="text-sm text-neutral-500">arvutatakse automaatselt</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <button className="rounded-full bg-black px-6 py-3 text-sm font-black text-white">
                Lisa 3800 Energy ja jätka
              </button>
              <button className="rounded-full border border-emerald-200 bg-white px-6 py-3 text-sm font-black text-emerald-800">
                Vali suurem pakett
              </button>
            </div>
          </section>

          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
                  Ajalugu
                </p>
                <h2 className="mt-2 text-3xl font-black">Energy ajalugu</h2>
              </div>

              <button className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black shadow-sm">
                Vaata kõiki
              </button>
            </div>

            <div className="divide-y divide-black/5">
              {history.map((item) => (
                <HistoryRow key={`${item.title}-${item.meta}`} item={item} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[30px] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">
              Uuele liitujale
            </p>
            <h2 className="mt-2 text-2xl font-black">Tervitus Energy</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Uus kasutaja saab väikese koguse Energy’t, et proovida Selqiro
              lisavõimalusi nagu esiletõstmine.
            </p>
            <div className="mt-5 rounded-2xl bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                Näide
              </p>
              <p className="mt-1 text-3xl font-black">+100 Energy</p>
              <p className="mt-1 text-sm text-neutral-500">
                lisatakse Energy ajalukku tehinguna
              </p>
            </div>
          </section>
          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Reserveeritud
            </p>
            <h2 className="mt-2 text-2xl font-black">5000 Energy</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Kui tegevus vajab ülevaatust, näiteks Today's Story, reserveeritakse
              Energy kuni ülevaatuse otsuseni.
            </p>

            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Kui sisu kinnitatakse, muutub reserveeritud Energy kulutatuks.
              Kui sisu tagasi lükatakse, Energy vabastatakse või tagastatakse
              vastavalt reeglitele.
            </div>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Turvaline makse
            </p>
            <h2 className="mt-2 text-2xl font-black">Makseteenuse kaudu</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-neutral-600">
              <p>Selqiro ei salvesta kaardiandmeid.</p>
              <p>Makse kinnitab webhook, mitte ainult brauseri õnnestumise vaade.</p>
              <p>Receipt või arve link salvestub arveldusse.</p>
            </div>
          </section>

          <section className="rounded-[30px] border border-blue-100 bg-blue-50 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-500">
              Arveldus
            </p>
            <h2 className="mt-2 text-xl font-black text-blue-950">
              Makse dokumendid
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-900">
              Ettevõte saab hiljem vaadata makseid, receipt’e, arve linke ja
              billing entity infot Minu alas.
            </p>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Selqiro tugi
            </p>
            <h2 className="mt-2 text-xl font-black">Parandused ja preemiad</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Kui Selqiro lisab või korrigeerib Energy’t, näed seda Energy ajaloos.
              Sisemisi märkmeid avalikus vaates ei kuvata.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}
