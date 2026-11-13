"use client";

import { renderUiMessage } from "@/lib/i18n/interfaceMessage";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { localeForLanguage } from "@/lib/i18n/useTranslation";

import { accountUiMessages } from "@/lib/i18n/catalogs/accountUi";


import Link from "next/link";
import { useEnergySummary } from "../../../src/features/energy-wallet/model/useEnergySummary";
import MyAreaListingsSection from "../../../src/features/my-area/components/MyAreaListingsSection";
import { useMyAreaIdentity } from "../../../src/features/my-area/model/useMyAreaIdentity";
import MyAreaServicesSection from "../../../src/features/service-editor/components/MyAreaServicesSection";
import { serviceEditorMessages } from "../../../src/features/service-editor/model/serviceEditorMessages";
import ProductShowcaseManagementCard from "../../../src/features/product-showcase-management/components/ProductShowcaseManagementCard";
import StoreCategoryManagementCard from "../../../src/features/store-category-management/components/StoreCategoryManagementCard";
import ManagedStoreCategorySection from "../../../src/features/store-category-management/components/ManagedStoreCategorySection";
import { v2IntegrationEnabled } from "../../../src/shared/config/v2Integration";
import ProviderManagementSection from "../../../src/features/viewer-provider-controls/components/ProviderManagementSection";
import { providerControlMessages } from "../../../src/features/viewer-provider-controls/model/providerControlMessages";

const actionClass = "inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-bold shadow-sm transition hover:border-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
const navClass = "flex min-h-11 items-center rounded-2xl px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-100 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";


// The existing Energy surface stays outside the isolated publication flow.
// Its read result never determines the My Area identity or profile destination.
function EnergyOverview() {
  const { language: uiLanguage, t } = useV2Translation(accountUiMessages);

  const { wallet, loading, error } = useEnergySummary();
  return (
    <section id="my-area-energy" className="scroll-mt-28 rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">{t("energy")}</p>
      <h2 className="mt-2 text-xl font-black">
        {loading ? t("loading_energy") : wallet ? `${wallet.availableTotal.toLocaleString(localeForLanguage(uiLanguage))} Energy` : t("energy_unavailable")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        {error ? t("could_not_load_energy_information") : t("bonus_and_purchased_energy_are_kept_separate")}
      </p>
      <Link href="/v2/energy" className={`${actionClass} mt-5 w-full`}>{t("view_energy")}</Link>
    </section>
  );
}

export default function V2MyAreaPage() {
  const { language: uiLanguage, t } = useV2Translation(accountUiMessages);
  const {t: serviceText} = useV2Translation(serviceEditorMessages);
  const {t: providerText} = useV2Translation(providerControlMessages);

  const { identity, actor, loading, anonymous, error, refresh } = useMyAreaIdentity();
  const integrated = v2IntegrationEnabled();
  const messagesHref = integrated ? "/v2/messages" : "/messages";
  const authHref = integrated ? "/auth?next=%2Fv2%2Fmy-area" : "/auth";
  const profileHref = identity?.slug ? `/v2/profile/${encodeURIComponent(identity.slug)}` : null;

  if (anonymous) {
    return (
      <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black">{t("my_area")}</h1>
        <p className="mt-3 text-neutral-600">{t("sign_in_to_view_your_listings_and_conversations")}</p>
        <Link href={authHref} className={`${actionClass} mt-5`}>{t("sign_in")}</Link>
      </section>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <nav aria-label={t("my_area")} className="sticky top-28 space-y-1 rounded-[30px] border border-black/5 bg-white p-4 shadow-sm">
          <a href="#my-area-listings" className={navClass}>{t("listings")}</a>
          <a href="#my-area-services" className={navClass}>{t("services")}</a>
          <a href="#my-area-categories" className={navClass}>{t("store_categories")}</a>
          <a href="#my-area-provider-controls" className={navClass}>{providerText("management")}</a>
          <Link href={messagesHref} className={navClass}>{t("messages")}</Link>
          {profileHref ? <Link href={profileHref} className={navClass}>{t("public_profile")}</Link> : null}
          {!integrated ? <>
            <a href="#my-area-showcase" className={navClass}>{t("product_showcases")}</a>
            <a href="#my-area-energy" className={navClass}>{t("energy")}</a>
          </> : null}
        </nav>
      </aside>

      <div className="min-w-0 space-y-8">
        <section className="min-w-0 rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <div className="flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">{t("my_area")}</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t("your_listings_and_conversations")}</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
                {t("manage_listings_for_your_active_identity_and_open_conversations_with_buyers")} </p>
              <nav aria-label={t("quick_actions")} className="mt-5 flex flex-wrap gap-3">
                <Link href="/v2/sell" className={actionClass}>{t("add_listing")}</Link>
                <Link href="/v2/services/new" className={actionClass}>{serviceText("addService")}</Link>
                <a href="#my-area-categories" className={actionClass}>{t("store_categories")}</a>
                <a href="#my-area-provider-controls" className={actionClass}>{providerText("management")}</a>
                <Link href={messagesHref} className={actionClass}>{t("open_messages")}</Link>
              </nav>
            </div>

            <div aria-live="polite" aria-busy={loading} className="w-full min-w-0 rounded-[24px] bg-neutral-950 p-5 text-white xl:w-80 xl:shrink-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">{t("acting_as")}</p>
              {loading ? <p className="mt-3 text-lg font-bold">{t("loading_identity")}</p> : identity ? <>
                <p className="mt-3 break-words text-xl font-black">{identity.displayName}</p>
                <p className="mt-1 text-sm text-white/70">{identity.type === "business" ? t("business") : t("private_person")}</p>
              </> : null}
              {error ? <>
                <p role="alert" className="mt-3 text-sm leading-6 text-white/80">{renderUiMessage(uiLanguage, error)}</p>
                <button type="button" onClick={refresh} className={`${actionClass} mt-4 w-full text-neutral-950`}>{t("reload_identity")}</button>
              </> : null}
              {profileHref ? <Link href={profileHref} className={`${actionClass} mt-5 w-full text-neutral-950`}>{t("view_public_profile")}</Link>
                : identity ? <p className="mt-3 text-sm leading-6 text-white/70">{t("this_identity_s_public_profile_is_unavailable")}</p> : null}
            </div>
          </div>
        </section>

        <div id="my-area-listings" className="min-w-0 scroll-mt-28"><MyAreaListingsSection /></div>
        <div id="my-area-services" className="min-w-0 scroll-mt-28"><MyAreaServicesSection /></div>

        {integrated ? <ManagedStoreCategorySection actor={actor} loading={loading} error={error} /> : null}
        <ProviderManagementSection />

        {!integrated ? <>
          <div id="my-area-categories" className="min-w-0 scroll-mt-28"><StoreCategoryManagementCard /></div>
          <div id="my-area-showcase" className="min-w-0 scroll-mt-28"><ProductShowcaseManagementCard /></div>
          <EnergyOverview />
        </> : null}
      </div>
    </div>
  );
}
