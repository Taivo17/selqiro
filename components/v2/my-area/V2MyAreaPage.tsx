"use client";

import Link from "next/link";
import { useEnergySummary } from "../../../src/features/energy-wallet/model/useEnergySummary";
import MyAreaListingsSection from "../../../src/features/my-area/components/MyAreaListingsSection";
import MyServicesSection from "../../../src/features/service-management/components/MyServicesSection";
import ProductShowcaseManagementCard from "../../../src/features/product-showcase-management/components/ProductShowcaseManagementCard";
import StoreCategoryManagementCard from "../../../src/features/store-category-management/components/StoreCategoryManagementCard";
const energyFormatter =
  new Intl.NumberFormat("et-EE");

function formatEnergy(
  value: number
): string {
  return energyFormatter.format(
    value
  );
}

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
    value: "—",
    helper: "Päris teenused on allpool",
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
    value: "—",
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
    <section className="min-w-0 overflow-hidden rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-5 flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            {eyebrow}
          </p>
          <h2 className="mt-2 break-words text-2xl font-black">{title}</h2>
        </div>

        {action ? (
          <button className="inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black shadow-sm sm:w-auto">
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
    <div className="min-w-0 divide-y divide-black/5">
      {items.map((item) => (
        <div
          key={item.title}
          className="flex min-w-0 flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-14 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200" />
            <div className="min-w-0">
              <h3 className="truncate font-black">{item.title}</h3>
              <p className="mt-1 text-sm text-neutral-500">{item.meta}</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
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

function IdentityMiniPreview({
  dark = false,
  identityName,
}: {
  dark?: boolean;
  identityName: string;
}) {
  return (
    <div
      className={[
        "w-full min-w-0 overflow-hidden rounded-[22px] border",
        dark ? "border-white/10 bg-white/10" : "border-black/5 bg-[#fbfbfa]",
      ].join(" ")}
    >
      <div className="h-20 bg-gradient-to-br from-neutral-900 via-neutral-700 to-emerald-900" />

      <div className="px-4 pb-4">
        <div className="-mt-8 flex min-w-0 items-end gap-3">
          <div className="h-16 w-16 shrink-0 rounded-full border-4 border-white bg-white shadow-sm">
            <div className="h-full w-full rounded-full bg-gradient-to-br from-neutral-100 to-neutral-300" />
          </div>

          <div className="min-w-0 pb-1">
            <p
              className={[
                "break-words text-[10px] font-bold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.18em]",
                dark ? "text-white/45" : "text-neutral-400",
              ].join(" ")}
            >
              Aktiivne identiteet
            </p>
            <p
              className={[
                "truncate text-lg font-black",
                dark ? "text-white" : "text-neutral-950",
              ].join(" ")}
            >
              {identityName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function V2MyAreaPage() {
  const {
    identity: activeIdentity,
    wallet: energyWallet,
    loading: energyLoading,
    error: energyError,
  } = useEnergySummary();

  const activeIdentityName =
    activeIdentity?.displayName ||
    (
      energyLoading
        ? "Laen..."
        : "Aktiivne identiteet"
    );

  const publicProfileHref =
    activeIdentity?.slug
      ? `/v2/profile/${activeIdentity.slug}`
      : "/v2/my-area";

  const energyValue =
    energyLoading
      ? "…"
      : energyWallet
        ? formatEnergy(
            energyWallet.availableTotal
          )
        : "—";

  const energyHelper =
    energyLoading
      ? "Laen walletit..."
      : energyError
        ? "Andmeid ei saanud laadida"
        : energyWallet
          ? "Saadaval walletis"
          : "Wallet puudub";

  const summaryCardsWithEnergy =
    summaryCards.map((card) =>
      card.title === "Energy"
        ? {
            ...card,
            value: energyValue,
            helper: energyHelper,
          }
        : card
    );

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-2 rounded-[30px] border border-black/5 bg-white p-4 shadow-sm">
          <SidebarItem label="Ülevaade" active />
          <SidebarItem label="Profiil" />
          <SidebarItem label="Kuulutused" count="14" />
          <SidebarItem label="Teenused" />
          <SidebarItem label="Tootenäidised" />
          <SidebarItem label="Uuendused" count="2" />
          <SidebarItem label="Sõnumid" count="2" />
          <SidebarItem label="Energy" />
          <SidebarItem label="Arveldus" />
          <SidebarItem label="Seaded" />
          <SidebarItem label="Blokeeritud kasutajad" />
          <SidebarItem label="Admin" />
        </div>
      </aside>

      <div className="min-w-0 space-y-8">
        <section className="min-w-0 overflow-hidden rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
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

            <div className="w-full min-w-0 rounded-[24px] bg-neutral-950 p-4 text-white md:w-[360px] md:shrink-0">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                Tegutsen kui
              </p>

              <IdentityMiniPreview
                dark
                identityName={
                  activeIdentityName
                }
              />

              <p className="mt-3 text-sm leading-6 text-white/65">
                See on Minu ala vaade. Avalikku profiili näevad teised kasutajad
                eraldi profiililehel.
              </p>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCardsWithEnergy.map((card) => (
            <SummaryCardView key={card.title} card={card} />
          ))}
        </section>

        <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-8">
            <ModuleCard
              eyebrow="Kiire teade"
              title="Aktiivne uuendus"
              action="Muuda"
            >
              <div className="min-w-0 rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
                <h3 className="break-words text-xl font-black">
                  Täna saadaval hooldatud murutraktor
                </h3>
                <p className="mt-2 break-words text-sm leading-6 text-neutral-600">
                  Kuvatakse avalikus profiilis Kiire teate plokina ja Uuenduste ajaloos.
                </p>
              </div>
            </ModuleCard>

            <MyAreaListingsSection />

            <StoreCategoryManagementCard />

            <MyServicesSection />

            <ProductShowcaseManagementCard />

            <ModuleCard
              eyebrow="Uuendused"
              title="Viimased teated"
              action="Vaata kõiki"
            >
              <RowList items={updates} />
            </ModuleCard>
          </div>

          <aside className="min-w-0 space-y-5">
            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                Profiil
              </p>
              <h2 className="mt-2 text-xl font-black">Avalik profiil</h2>
              <div className="mt-5">
                <IdentityMiniPreview
                  identityName={
                    activeIdentityName
                  }
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-neutral-600">
                Avalikus profiilis on nähtav kaanepilt, info, Kiire teade,
                tootenäidised, kuulutused, teenused ja uuendused.
              </p>

              <Link
                href={publicProfileHref}
                className="mt-5 inline-flex w-full justify-center rounded-full bg-black px-5 py-3 text-sm font-black text-white"
              >
                Vaata avalikku profiili
              </Link>
            </section>

            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                Energy
              </p>
              <h2 className="mt-2 break-words text-xl font-black">
                {energyLoading
                  ? "Laen Energy’t..."
                  : energyWallet
                    ? `${formatEnergy(
                        energyWallet.availableTotal
                      )} Energy`
                    : "Energy pole saadaval"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {energyError
                  ? "Energy andmeid ei saanud laadida. Ava Energy vaade ja proovi uuesti."
                  : "Energy kuulub aktiivse identiteedi walletile. Boonus- ja ostetud Energy on eraldi."}
              </p>
              <Link
                href="/v2/energy"
                className="mt-5 inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm"
              >
                Vaata Energy
              </Link>
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
              <Link
                href="/v2/admin"
                className="mt-5 inline-flex w-full justify-center rounded-full bg-black px-5 py-3 text-sm font-black text-white"
              >
                Ava admin
              </Link>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
