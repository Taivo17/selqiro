"use client";
import { useMemo } from "react";
import { renderMarketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { publicUiMessages } from "../../../../lib/i18n/catalogs/publicUi";
import type { PublicProfile } from "../../../entities/profile/model/types";
import { useServiceCategories } from "../../service-category-selection/model/useServiceCategories";
import { usePublicProfileServiceView } from "../model/usePublicProfileServiceView";
import ServiceCard from "./PublicProfileServiceCard";

const SERVICE_PREVIEW_LIMIT = 5;

function LoadingServices() {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="flex gap-4">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="w-[250px] flex-none rounded-[24px] border border-black/5 bg-white p-3 shadow-sm"
          >
            <div className="h-36 animate-pulse rounded-[20px] bg-neutral-100" />
            <div className="mt-3 h-4 w-28 animate-pulse rounded-full bg-neutral-100" />
            <div className="mt-3 h-5 w-44 animate-pulse rounded-full bg-neutral-100" />
            <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-neutral-100" />
            <div className="mt-3 h-5 w-24 animate-pulse rounded-full bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicProfileServicesSection({
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
  const { language: uiLanguage, t } = useV2Translation(publicUiMessages);

  const {
    services,
    loading,
    error, horizontalScrollRef, remember,
  } = usePublicProfileServiceView(profile, expanded, onExpandedChange);

  const {
    categories: serviceCategories,
  } = useServiceCategories();

  const categoryLabelByCode =
    useMemo(
      () =>
        new Map(
          serviceCategories.map(
            (category) => [
              category.code,
              uiLanguage === "et" ? category.labelEt || category.labelEn : category.labelEn,
            ]
          )
        ),
      [serviceCategories, uiLanguage]
    );

  const previewServices =
    useMemo(
      () =>
        services.slice(
          0,
          SERVICE_PREVIEW_LIMIT
        ),
      [services]
    );

  const canExpand =
    services.length >
      SERVICE_PREVIEW_LIMIT ||
    services.some(
      (service) =>
        service.images.length > 1 ||
        service.description.length > 180
    );

  if (
    !loading &&
    !error &&
    services.length === 0
  ) {
    return null;
  }

  return (
    <section className="relative min-w-0 overflow-hidden rounded-[30px] border border-teal-200 bg-teal-50 p-5 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-teal-500 before:content-[''] sm:p-6">
      <div className="mb-5 flex min-w-0 items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
            {t("services")} </p>

          <h2 className="mt-2 break-words text-2xl font-black tracking-tight md:text-3xl">
            {t("services_offered")} </h2>
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
            className="shrink-0 rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-black text-teal-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
          >
            {expanded
              ? t("show_less")
              : services.length >
                  SERVICE_PREVIEW_LIMIT
                ? t("view_all_count", {count: services.length})
                : t("view_details")}
          </button>
        ) : null}
      </div>

      {loading ? (
        <LoadingServices />
      ) : null}

      {!loading && error ? (
        <div className="rounded-[22px] border border-red-100 bg-red-50 p-5">
          <h3 className="font-black text-red-950">
            {t("could_not_load_services")} </h3>

          <p className="mt-2 text-sm leading-6 text-red-800">
            {renderMarketplaceMessage(uiLanguage, error)}
          </p>
        </div>
      ) : null}

      {!loading &&
      !error &&
      services.length > 0 ? (
        expanded ? (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {services.map(
              (service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onOpen={remember}
                  expanded
                  categoryLabelByCode={
                    categoryLabelByCode
                  }
                />
              )
            )}
          </div>
        ) : (
          <div ref={horizontalScrollRef} className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-2">
            <div className="flex w-max gap-4 px-1">
              {previewServices.map(
                (service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onOpen={remember}
                    expanded={false}
                    categoryLabelByCode={
                      categoryLabelByCode
                    }
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
