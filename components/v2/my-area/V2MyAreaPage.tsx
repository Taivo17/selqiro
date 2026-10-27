"use client";

import Link from "next/link";
import { useEnergySummary } from "../../../src/features/energy-wallet/model/useEnergySummary";
import MyAreaListingsSection from "../../../src/features/my-area/components/MyAreaListingsSection";
import { useMyAreaIdentity } from "../../../src/features/my-area/model/useMyAreaIdentity";
import MyServicesSection from "../../../src/features/service-management/components/MyServicesSection";
import ProductShowcaseManagementCard from "../../../src/features/product-showcase-management/components/ProductShowcaseManagementCard";
import StoreCategoryManagementCard from "../../../src/features/store-category-management/components/StoreCategoryManagementCard";
import { v2IntegrationEnabled } from "../../../src/shared/config/v2Integration";

const actionClass = "inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-bold shadow-sm transition hover:border-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
const navClass = "flex min-h-11 items-center rounded-2xl px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-100 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
const energyFormatter = new Intl.NumberFormat("et-EE");

// The existing Energy surface stays outside the isolated publication flow.
// Its read result never determines the My Area identity or profile destination.
function EnergyOverview() {
  const { wallet, loading, error } = useEnergySummary();
  return (
    <section id="my-area-energy" className="scroll-mt-28 rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">Energy</p>
      <h2 className="mt-2 text-xl font-black">
        {loading ? "Laen Energy’t…" : wallet ? `${energyFormatter.format(wallet.availableTotal)} Energy` : "Energy pole saadaval"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        {error ? "Energy andmeid ei saanud laadida." : "Boonus- ja ostetud Energy on eraldi."}
      </p>
      <Link href="/v2/energy" className={`${actionClass} mt-5 w-full`}>Vaata Energy</Link>
    </section>
  );
}

export default function V2MyAreaPage() {
  const { identity, loading, anonymous, error, refresh } = useMyAreaIdentity();
  const integrated = v2IntegrationEnabled();
  const messagesHref = integrated ? "/v2/messages" : "/messages";
  const authHref = integrated ? "/auth?next=%2Fv2%2Fmy-area" : "/auth";
  const profileHref = identity?.slug ? `/v2/profile/${encodeURIComponent(identity.slug)}` : null;

  if (anonymous) {
    return (
      <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black">Minu ala</h1>
        <p className="mt-3 text-neutral-600">Logi sisse, et vaadata oma kuulutusi ja vestlusi.</p>
        <Link href={authHref} className={`${actionClass} mt-5`}>Logi sisse</Link>
      </section>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <nav aria-label="Minu ala" className="sticky top-28 space-y-1 rounded-[30px] border border-black/5 bg-white p-4 shadow-sm">
          <a href="#my-area-listings" className={navClass}>Kuulutused</a>
          <Link href={messagesHref} className={navClass}>Sõnumid</Link>
          {profileHref ? <Link href={profileHref} className={navClass}>Avalik profiil</Link> : null}
          {!integrated ? <>
            <a href="#my-area-categories" className={navClass}>Poe rubriigid</a>
            <a href="#my-area-services" className={navClass}>Teenused</a>
            <a href="#my-area-showcase" className={navClass}>Tootenäidised</a>
            <a href="#my-area-energy" className={navClass}>Energy</a>
          </> : null}
        </nav>
      </aside>

      <div className="min-w-0 space-y-8">
        <section className="min-w-0 rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <div className="flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">Minu ala</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Sinu kuulutused ja vestlused</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
                Halda aktiivse identiteedi kuulutusi ning ava ostjate ja müüjatega peetud vestlused.
              </p>
              <nav aria-label="Kiirtegevused" className="mt-5 flex flex-wrap gap-3">
                <Link href="/v2/sell" className={actionClass}>Lisa kuulutus</Link>
                <Link href={messagesHref} className={actionClass}>Ava sõnumid</Link>
              </nav>
            </div>

            <div aria-live="polite" aria-busy={loading} className="w-full min-w-0 rounded-[24px] bg-neutral-950 p-5 text-white xl:w-80 xl:shrink-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Tegutsen kui</p>
              {loading ? <p className="mt-3 text-lg font-bold">Laen identiteeti…</p> : identity ? <>
                <p className="mt-3 break-words text-xl font-black">{identity.displayName}</p>
                <p className="mt-1 text-sm text-white/70">{identity.type === "business" ? "Ettevõte" : "Eraisik"}</p>
              </> : null}
              {error ? <>
                <p role="alert" className="mt-3 text-sm leading-6 text-white/80">{error}</p>
                <button type="button" onClick={refresh} className={`${actionClass} mt-4 w-full text-neutral-950`}>Laadi identiteet uuesti</button>
              </> : null}
              {profileHref ? <Link href={profileHref} className={`${actionClass} mt-5 w-full text-neutral-950`}>Vaata avalikku profiili</Link>
                : identity ? <p className="mt-3 text-sm leading-6 text-white/70">Selle identiteedi avalik profiil pole saadaval.</p> : null}
            </div>
          </div>
        </section>

        <div id="my-area-listings" className="min-w-0 scroll-mt-28"><MyAreaListingsSection /></div>

        {!integrated ? <>
          <div id="my-area-categories" className="min-w-0 scroll-mt-28"><StoreCategoryManagementCard /></div>
          <div id="my-area-services" className="min-w-0 scroll-mt-28"><MyServicesSection /></div>
          <div id="my-area-showcase" className="min-w-0 scroll-mt-28"><ProductShowcaseManagementCard /></div>
          <EnergyOverview />
        </> : null}
      </div>
    </div>
  );
}
