"use client";

import { renderUiMessage } from "@/lib/i18n/interfaceMessage";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { getCatalogTranslation, type TranslationParams } from "@/lib/i18n/useTranslation";
import type { Language } from "@/lib/i18n/translations";
import { publicUiMessages } from "@/lib/i18n/catalogs/publicUi";


import {
  useCallback,
  useState,
} from "react";
import { usePublicProfile } from "../model/usePublicProfile";
import PublicProfileListingsSection from "./PublicProfileListingsSection";
import PublicProfileProductShowcasesSection from "./PublicProfileProductShowcasesSection";
import PublicProfileServicesSection from "./PublicProfileServicesSection";

const updates = (uiLanguage: Language) => { const t = (key: keyof typeof publicUiMessages.en, params?: TranslationParams) => getCatalogTranslation(uiLanguage, publicUiMessages, key, params); return [
  {
    id: "lawn-tractor", title: t("a_new_lawn_tractor_was_added_today"),
    meta: t("updated_24_minutes_ago"),
  },
  {
    id: "maintenance", title: t("spring_maintenance_appointments_are_open"),
    meta: t("last_week"),
  },
]; };

type ExpandedPublicProfileSection =
  | "showcases"
  | "services"
  | "listings"
  | null;

type ExpandedPublicProfileState = {
  slug: string;
  section:
    ExpandedPublicProfileSection;
};

function LoadingState() {
  return (
    <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white shadow-sm">
      <div className="h-56 bg-gradient-to-br from-neutral-100 to-neutral-200" />
      <div className="px-6 pb-7 md:px-8">
        <div className="-mt-16 h-32 w-32 rounded-full border-4 border-white bg-white shadow-lg" />
        <div className="mt-4 h-9 w-64 rounded-full bg-neutral-100" />
        <div className="mt-3 h-5 w-96 max-w-full rounded-full bg-neutral-100" />
      </div>
    </section>
  );
}

function ErrorState({ error }: { error: string }) {
  const { language: uiLanguage, t } = useV2Translation(publicUiMessages);

  return (
    <section className="rounded-[34px] border border-red-100 bg-red-50 p-8">
      <h1 className="text-3xl font-black text-red-950">
        {t("could_not_load_profile")} </h1>
      <p className="mt-3 text-sm leading-6 text-red-800">{renderUiMessage(uiLanguage, error)}</p>
    </section>
  );
}

function EmptyState() {
  const { t } = useV2Translation(publicUiMessages);

  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-black">{t("profile_not_found")}</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-500">
        {t("this_profile_may_have_been_removed_or_made_private")} </p>
    </section>
  );
}

export default function PublicProfilePage({ slug }: { slug: string }) {
  const { language: uiLanguage, t } = useV2Translation(publicUiMessages);

  const { profile, loading, error } = usePublicProfile(slug);

  const [
    expandedProfileState,
    setExpandedProfileState,
  ] =
    useState<ExpandedPublicProfileState>({
      slug,
      section: null,
    });

  const expandedSection =
    expandedProfileState.slug === slug
      ? expandedProfileState.section
      : null;

  const handleShowcasesExpandedChange =
    useCallback(
      (nextExpanded: boolean) => {
        setExpandedProfileState({
          slug,
          section: nextExpanded
            ? "showcases"
            : null,
        });
      },
      [slug]
    );

  const handleServicesExpandedChange =
    useCallback(
      (nextExpanded: boolean) => {
        setExpandedProfileState({
          slug,
          section: nextExpanded
            ? "services"
            : null,
        });
      },
      [slug]
    );

  const handleListingsShowAllChange =
    useCallback(
      (nextShowAll: boolean) => {
        setExpandedProfileState({
          slug,
          section: nextShowAll
            ? "listings"
            : null,
        });
      },
      [slug]
    );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!profile) return <EmptyState />;

  const description =
    profile.bio ||
    t("this_is_a_public_selqiro_profile_information_listings_services_and_updates_");

  const identityLabel =
    profile.identityType === "business"
      ? t("business")
      : profile.identityType === "private"
        ? t("private_person")
        : t("profile");

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white shadow-sm">
        {profile.bannerUrl ? (
          <img
            src={profile.bannerUrl}
            alt=""
            className="h-56 w-full object-cover"
          />
        ) : (
          <div className="h-56 bg-gradient-to-br from-neutral-900 via-neutral-700 to-emerald-900" />
        )}

        <div className="px-6 pb-7 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="-mt-16 h-32 w-32 shrink-0 rounded-full border-4 border-white bg-white shadow-lg">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-300 text-4xl font-black text-neutral-500">
                    {profile.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="pt-2 md:pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black tracking-tight">
                    {profile.displayName || t("profile")}
                  </h1>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    {identityLabel}
                  </span>
                </div>

                <p className="mt-2 max-w-2xl text-base leading-7 text-neutral-600">
                  {description}
                </p>

                <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-neutral-500">
                  <span>{profile.locationLabel || t("location_unspecified")}</span>
                  <span>·</span>
                  <span>{t("selqiro_profile")}</span>
                  <span>·</span>
                  <span>/{profile.slug}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-0 md:pt-8">
              <button className="rounded-full bg-black px-6 py-3 text-sm font-black text-white shadow-sm">
                {t("message")} </button>
              <button className="rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-black shadow-sm">
                {t("follow")} </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <section className="rounded-[34px] border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
                  {t("quick_update")} </p>
                <h2 className="mt-3 text-2xl font-black">
                  {t("current_information_from_this_profile")} </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {t("a_real_quick_update_or_current_announcement_will_appear_here_later")} </p>
              </div>

              <button className="rounded-full bg-black px-6 py-3 text-sm font-black text-white">
                {t("message")} </button>
            </div>
          </section>
          <PublicProfileProductShowcasesSection
            key={`showcases-${profile.slug}`}
            profile={profile}
            expanded={
              expandedSection ===
              "showcases"
            }
            onExpandedChange={
              handleShowcasesExpandedChange
            }
          />

          <PublicProfileServicesSection
            key={`services-${profile.slug}`}
            profile={profile}
            expanded={
              expandedSection ===
              "services"
            }
            onExpandedChange={
              handleServicesExpandedChange
            }
          />

          <PublicProfileListingsSection
            key={`listings-${profile.identityId ?? "legacy"}-${profile.slug}`}
            profile={profile}
            showAll={
              expandedSection ===
              "listings"
            }
            onShowAllChange={
              handleListingsShowAllChange
            }
          />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              {t("about_this_profile")} </p>

            <div className="mt-5 space-y-4 text-sm leading-6 text-neutral-700">
              <p>{description}</p>

              <div className="rounded-2xl bg-[#fbfbfa] p-4">
                <p className="font-black">{t("location")}</p>
                <p className="mt-1 text-neutral-500">
                  {profile.locationLabel || t("location_unspecified")}
                </p>
              </div>

              <div className="rounded-2xl bg-[#fbfbfa] p-4">
                <p className="font-black">{t("acting_as")}</p>
                <p className="mt-1 text-neutral-500">{identityLabel}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                  {t("location")} </p>
                <h2 className="mt-2 text-xl font-black">
                  {profile.locationLabel || t("location_unspecified")}
                </h2>
              </div>
            </div>

            <div className="h-36 rounded-[22px] bg-gradient-to-br from-neutral-100 to-neutral-200" />

            <p className="mt-4 text-sm leading-6 text-neutral-500">
              {t("location_precision_depends_on_the_profile_s_privacy_and_business_settings")} </p>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                  {t("updates")} </p>
                <h2 className="mt-2 text-xl font-black">{t("latest_announcements")}</h2>
              </div>

              <button className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-black shadow-sm">
                {t("all")} </button>
            </div>

            <div className="space-y-3">
              {updates(uiLanguage).map((update) => (
                <article
                  key={update.id}
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
