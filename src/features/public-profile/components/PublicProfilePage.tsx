"use client";

import {
  useCallback,
  useState,
} from "react";
import { usePublicProfile } from "../model/usePublicProfile";
import PublicProfileListingsSection from "./PublicProfileListingsSection";
import PublicProfileProductShowcasesSection from "./PublicProfileProductShowcasesSection";
import PublicProfileServicesSection from "./PublicProfileServicesSection";

const updates = [
  {
    title: "Täna lisandus uus murutraktor",
    meta: "Uuendatud 24 min tagasi",
  },
  {
    title: "Kevadhooaja hoolduse ajad avatud",
    meta: "Eelmine nädal",
  },
];

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
  return (
    <section className="rounded-[34px] border border-red-100 bg-red-50 p-8">
      <h1 className="text-3xl font-black text-red-950">
        Profiili ei saanud laadida
      </h1>
      <p className="mt-3 text-sm leading-6 text-red-800">{error}</p>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-black">Profiili ei leitud</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-500">
        See profiil võib olla eemaldatud või mitte avalik.
      </p>
    </section>
  );
}

export default function PublicProfilePage({ slug }: { slug: string }) {
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
    "See profiil kasutab Selqiro avalikku profiili. Lisainfo, kuulutused, teenused ja uuendused kuvatakse siin.";

  const identityLabel =
    profile.identityType === "business"
      ? "Ettevõte"
      : profile.identityType === "private"
        ? "Eraisik"
        : "Profiil";

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
                    {profile.displayName}
                  </h1>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    {identityLabel}
                  </span>
                </div>

                <p className="mt-2 max-w-2xl text-base leading-7 text-neutral-600">
                  {description}
                </p>

                <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-neutral-500">
                  <span>{profile.locationLabel}</span>
                  <span>·</span>
                  <span>Selqiro profiil</span>
                  <span>·</span>
                  <span>/{profile.slug}</span>
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

      <section className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <section className="rounded-[34px] border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
                  Kiire teade
                </p>
                <h2 className="mt-3 text-2xl font-black">
                  Selle profiili aktiivne info
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Hiljem tuleb siia päris Kiire teade või aktiivne uuendus.
                </p>
              </div>

              <button className="rounded-full bg-black px-6 py-3 text-sm font-black text-white">
                Kirjuta
              </button>
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
              Teave profiili kohta
            </p>

            <div className="mt-5 space-y-4 text-sm leading-6 text-neutral-700">
              <p>{description}</p>

              <div className="rounded-2xl bg-[#fbfbfa] p-4">
                <p className="font-black">Asukoht</p>
                <p className="mt-1 text-neutral-500">
                  {profile.locationLabel}
                </p>
              </div>

              <div className="rounded-2xl bg-[#fbfbfa] p-4">
                <p className="font-black">Tegutseb kui</p>
                <p className="mt-1 text-neutral-500">{identityLabel}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                  Asukoht
                </p>
                <h2 className="mt-2 text-xl font-black">
                  {profile.locationLabel}
                </h2>
              </div>
            </div>

            <div className="h-36 rounded-[22px] bg-gradient-to-br from-neutral-100 to-neutral-200" />

            <p className="mt-4 text-sm leading-6 text-neutral-500">
              Asukoha täpsus sõltub profiili privaatsuse ja ettevõtte seadistustest.
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
