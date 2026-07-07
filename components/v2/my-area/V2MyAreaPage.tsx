import MyAreaListingsSection from "../../../src/features/my-area/components/MyAreaListingsSection";
type SummaryCard = {
  title: string;
  value: string;
  helper: string;
  action: string;
};

type RowItem = {
  title: string;
  meta: string;
  status?: string;
  value?: string;
};

const summaryCards: SummaryCard[] = [
  {
    title: "Aktiivsed kuulutused",
    value: "14",
    helper: "Müügis või nähtaval",
    action: "Vaata kuulutusi",
  },
  {
    title: "Teenused",
    value: "3",
    helper: "Aktiivsed teenused",
    action: "Vaata teenuseid",
  },
  {
    title: "Uued sõnumid",
    value: "2",
    helper: "Vajavad vastust",
    action: "Ava sõnumid",
  },
  {
    title: "Energy",
    value: "156",
    helper: "Saadaval walletis",
    action: "Vaata Energy",
  },
];

const listings: RowItem[] = [
  {
    title: "Cub Cadet murutraktor",
    meta: "Aiatehnika · Paide piirkond",
    status: "Aktiivne",
    value: "4562 €",
  },
  {
    title: "BMW 5 Series",
    meta: "Sõidukid · Türi piirkond",
    status: "Aktiivne",
    value: "6000 €",
  },
  {
    title: "Biltema ketassaag",
    meta: "Tööriistad · Paide piirkond",
    status: "Pausil",
    value: "45 €",
  },
];

const services: RowItem[] = [
  {
    title: "Aiatehnika hooldus",
    meta: "Murutraktorid, niidukid ja väike tehnika",
    status: "Aktiivne",
  },
  {
    title: "Transport kokkuleppel",
    meta: "Kohalik transport ja kohaletoomine",
    status: "Aktiivne",
  },
  {
    title: "Nõustamine enne ostu",
    meta: "Aitame valida sobiva masina",
    status: "Aktiivne",
  },
];

const showcases: RowItem[] = [
  {
    title: "Aiatehnika näidised",
    meta: "Hooldatud murutraktorid ja niidukid",
    status: "Nähtav",
  },
  {
    title: "Transpordilahendused",
    meta: "Haagised, tööriistad ja varuosad",
    status: "Nähtav",
  },
];

const updates: RowItem[] = [
  {
    title: "Täna saadaval hooldatud murutraktor",
    meta: "Kiire teade · aktiivne",
    status: "Aktiivne",
  },
  {
    title: "Kevadhooaja hoolduse ajad avatud",
    meta: "Uuendus · eelmine nädal",
    status: "Avaldatud",
  },
];

function SidebarItem({
  label,
  count,
  active,
}: {
  label: string;
  count?: string;
  active?: boolean;
}) {
  return (
    <button
      className={[
        "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition",
        active
          ? "bg-black text-white"
          : "text-neutral-700 hover:bg-neutral-100 hover:text-black",
      ].join(" ")}
    >
      <span>{label}</span>
      {count ? (
        <span
          className={[
            "rounded-full px-2 py-0.5 text-xs",
            active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500",
          ].join(" ")}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SummaryCardView({ card }: { card: SummaryCard }) {
  return (
    <article className="rounded-[26px] border border-black/5 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-neutral-500">{card.title}</p>
      <p className="mt-3 text-4xl font-black">{card.value}</p>
      <p className="mt-1 text-sm text-neutral-500">{card.helper}</p>
      <button className="mt-5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black shadow-sm">
        {card.action}
      </button>
    </article>
  );
}

function ModuleCard({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black">{title}</h2>
        </div>

        {action ? (
          <button className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black shadow-sm">
            {action}
          </button>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function RowList({ items }: { items: RowItem[] }) {
  return (
    <div className="divide-y divide-black/5">
      {items.map((item) => (
        <div
          key={item.title}
          className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-14 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200" />
            <div className="min-w-0">
              <h3 className="truncate font-black">{item.title}</h3>
              <p className="mt-1 text-sm text-neutral-500">{item.meta}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:justify-end">
            {item.value ? <p className="font-black">{item.value}</p> : null}
            {item.status ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {item.status}
              </span>
            ) : null}
            <button className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-black shadow-sm">
              Muuda
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}


function IdentityMiniPreview({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={[
        "overflow-hidden rounded-[22px] border",
        dark ? "border-white/10 bg-white/10" : "border-black/5 bg-[#fbfbfa]",
      ].join(" ")}
    >
      <div className="h-20 bg-gradient-to-br from-neutral-900 via-neutral-700 to-emerald-900" />

      <div className="px-4 pb-4">
        <div className="-mt-8 flex items-end gap-3">
          <div className="h-16 w-16 shrink-0 rounded-full border-4 border-white bg-white shadow-sm">
            <div className="h-full w-full rounded-full bg-gradient-to-br from-neutral-100 to-neutral-300" />
          </div>

          <div className="pb-1">
            <p
              className={[
                "text-xs font-bold uppercase tracking-[0.18em]",
                dark ? "text-white/45" : "text-neutral-400",
              ].join(" ")}
            >
              Aktiivne identiteet
            </p>
            <p
              className={[
                "text-lg font-black",
                dark ? "text-white" : "text-neutral-950",
              ].join(" ")}
            >
              Milline Vedu
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function V2MyAreaPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-2 rounded-[30px] border border-black/5 bg-white p-4 shadow-sm">
          <SidebarItem label="Ülevaade" active />
          <SidebarItem label="Profiil" />
          <SidebarItem label="Kuulutused" count="14" />
          <SidebarItem label="Teenused" count="3" />
          <SidebarItem label="Tootenäidised" count="2" />
          <SidebarItem label="Uuendused" count="2" />
          <SidebarItem label="Sõnumid" count="2" />
          <SidebarItem label="Energy" />
          <SidebarItem label="Arveldus" />
          <SidebarItem label="Seaded" />
          <SidebarItem label="Blokeeritud kasutajad" />
          <SidebarItem label="Admin" />
        </div>
      </aside>

      <div className="space-y-8">
        <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
                Minu ala
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">
                Ülevaade
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
                See on sinu privaatne töölaud. Siin haldad aktiivse identiteedi
                profiili, kuulutusi, teenuseid, uuendusi, Energy’t ja seadeid.
              </p>
            </div>

            <div className="rounded-[24px] bg-neutral-950 p-4 text-white md:w-[360px]">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                Tegutsen kui
              </p>

              <IdentityMiniPreview dark />

              <p className="mt-3 text-sm leading-6 text-white/65">
                See on Minu ala vaade. Avalikku profiili näevad teised kasutajad
                eraldi profiililehel.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCardView key={card.title} card={card} />
          ))}
        </section>

        <section className="grid gap-8 xl:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <ModuleCard
              eyebrow="Kiire teade"
              title="Aktiivne uuendus"
              action="Muuda"
            >
              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
                <h3 className="text-xl font-black">
                  Täna saadaval hooldatud murutraktor
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Kuvatakse avalikus profiilis Kiire teate plokina ja Uuenduste ajaloos.
                </p>
              </div>
            </ModuleCard>

            <MyAreaListingsSection />

            <ModuleCard
              eyebrow="Teenused"
              title="Sinu teenused"
              action="Vaata kõiki"
            >
              <RowList items={services} />
            </ModuleCard>

            <ModuleCard
              eyebrow="Tootenäidised"
              title="Sinu tootenäidised"
              action="Vaata kõiki"
            >
              <RowList items={showcases} />
            </ModuleCard>

            <ModuleCard
              eyebrow="Uuendused"
              title="Viimased teated"
              action="Vaata kõiki"
            >
              <RowList items={updates} />
            </ModuleCard>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                Profiil
              </p>
              <h2 className="mt-2 text-xl font-black">Avalik profiil</h2>
              <div className="mt-5">
                <IdentityMiniPreview />
              </div>

              <p className="mt-4 text-sm leading-6 text-neutral-600">
                Avalikus profiilis on nähtav kaanepilt, info, Kiire teade,
                tootenäidised, kuulutused, teenused ja uuendused.
              </p>

              <a
                href="/v2/profile/milline-vedu"
                className="mt-5 inline-flex w-full justify-center rounded-full bg-black px-5 py-3 text-sm font-black text-white"
              >
                Vaata avalikku profiili
              </a>
            </section>

            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                Energy
              </p>
              <h2 className="mt-2 text-xl font-black">156 Energy</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Energy kuulub valitud walletile. Hiljem saab siin osta Energy’t ja
                vaadata tehingute ajalugu.
              </p>
              <a
                href="/v2/energy"
                className="mt-5 inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm"
              >
                Vaata Energy
              </a>
            </section>

            <section className="rounded-[30px] border border-blue-100 bg-blue-50 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-500">
                Profiili täitmine
              </p>
              <h2 className="mt-2 text-xl font-black text-blue-950">72%</h2>
              <p className="mt-2 text-sm leading-6 text-blue-900">
                Omanikule näitame soovitusi siin, mitte avalikus profiilis.
              </p>
              <div className="mt-5 h-3 rounded-full bg-blue-100">
                <div className="h-full w-[72%] rounded-full bg-blue-600" />
              </div>
            </section>

            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                Arveldus
              </p>
              <h2 className="mt-2 text-xl font-black">Valmis hiljem</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Siia tulevad maksed, receipt’id, billing entity ja ettevõtte arved.
              </p>
            </section>

            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                Admin
              </p>
              <h2 className="mt-2 text-xl font-black">Ligipääs olemas</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Admini moodul on nähtav ainult kasutajale, kellel on õigused.
              </p>
              <a
                href="/v2/admin"
                className="mt-5 inline-flex w-full justify-center rounded-full bg-black px-5 py-3 text-sm font-black text-white"
              >
                Ava admin
              </a>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
