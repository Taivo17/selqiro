"use client";

import {
  useMemo,
} from "react";
import type {
  PublicProductShowcase,
} from "../../../entities/product-showcase/model/public";
import type {
  PublicProfile,
} from "../../../entities/profile/model/types";
import {
  usePublicProfileProductShowcases,
} from "../model/usePublicProfileProductShowcases";
import PublicProfileProductShowcaseGallery from "./PublicProfileProductShowcaseGallery";
import PublicProfileProductShowcaseDescription from "./PublicProfileProductShowcaseDescription";

const SHOWCASE_PREVIEW_LIMIT = 5;
function LoadingShowcases() {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="flex gap-4">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="w-[250px] flex-none rounded-[24px] border border-black/5 bg-white p-3 shadow-sm"
          >
            <div className="h-36 animate-pulse rounded-[20px] bg-neutral-100" />
            <div className="mt-3 h-4 w-20 animate-pulse rounded-full bg-neutral-100" />
            <div className="mt-3 h-5 w-40 animate-pulse rounded-full bg-neutral-100" />
            <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseCard({
  showcase,
  expanded,
}: {
  showcase: PublicProductShowcase;
  expanded: boolean;
}) {
  return (
    <article
      className={[
        "min-w-0 rounded-[24px] border border-black/5 bg-white p-3 shadow-sm",
        expanded
          ? "w-full"
          : "w-[250px] flex-none",
      ].join(" ")}
    >
      <PublicProfileProductShowcaseGallery
        showcase={showcase}
        expanded={expanded}
      />

      <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
        <span className="max-w-full truncate rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
          {showcase.category ||
            "Tootenäidis"}
        </span>

        {showcase.images.length > 1 ? (
          <span className="shrink-0 text-[11px] font-black text-neutral-400">
            {showcase.images.length} pilti
          </span>
        ) : null}
      </div>

      <h3
        className={[
          "mt-2 break-words text-base font-black",
          expanded
            ? ""
            : "line-clamp-2",
        ].join(" ")}
      >
        {showcase.title}
      </h3>

      <PublicProfileProductShowcaseDescription
        showcaseId={showcase.id}
        description={showcase.description}
        expanded={expanded}
      />
    </article>
  );
}

export default function
PublicProfileProductShowcasesSection({
  profile,
  expanded,
  onExpandedChange,
}: {
  profile: PublicProfile;
  expanded: boolean;
  onExpandedChange: (
    expanded: boolean
  ) => void;
}) {
  const {
    showcases,
    loading,
    error,
  } =
    usePublicProfileProductShowcases(
      profile
    );

  const previewShowcases =
    useMemo(
      () =>
        showcases.slice(
          0,
          SHOWCASE_PREVIEW_LIMIT
        ),
      [showcases]
    );

  const canExpand =
    showcases.length >
      SHOWCASE_PREVIEW_LIMIT ||
    showcases.some(
      (showcase) =>
        showcase.images.length > 1
    );

  if (
    !loading &&
    !error &&
    showcases.length === 0
  ) {
    return null;
  }

  return (
    <section className="relative min-w-0 overflow-hidden rounded-[30px] border border-indigo-200 bg-indigo-50 p-5 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-indigo-500 before:content-[''] sm:p-6">
      <div className="mb-5 flex min-w-0 items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700">
            Tootenäidised
          </p>

          <h2 className="mt-2 break-words text-2xl font-black tracking-tight md:text-3xl">
            Mida see profiil pakub
          </h2>
        </div>

        {!loading &&
        !error &&
        canExpand ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() =>
              onExpandedChange(
                !expanded
              )
            }
            className="shrink-0 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-black text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
          >
            {expanded
              ? "Näita vähem"
              : showcases.length >
                  SHOWCASE_PREVIEW_LIMIT
                ? `Vaata kõiki (${showcases.length})`
                : "Vaata lähemalt"}
          </button>
        ) : null}
      </div>

      {loading ? (
        <LoadingShowcases />
      ) : null}

      {!loading && error ? (
        <div className="rounded-[22px] border border-red-100 bg-red-50 p-5">
          <h3 className="font-black text-red-950">
            Tootenäidiseid ei saanud laadida
          </h3>

          <p className="mt-2 text-sm leading-6 text-red-800">
            {error}
          </p>
        </div>
      ) : null}

      {!loading &&
      !error &&
      showcases.length > 0 ? (
        expanded ? (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {showcases.map(
              (showcase) => (
                <ShowcaseCard
                  key={showcase.id}
                  showcase={showcase}
                  expanded
                />
              )
            )}
          </div>
        ) : (
          <div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-2">
            <div className="flex w-max gap-4 px-1">
              {previewShowcases.map(
                (showcase) => (
                  <ShowcaseCard
                    key={showcase.id}
                    showcase={showcase}
                    expanded={false}
                  />
                )
              )}
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
