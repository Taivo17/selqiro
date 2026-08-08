"use client";

import {
  useMemo,
} from "react";
import type {
  PublicProfile,
} from "../../../entities/profile/model/types";
import type {
  PublicService,
} from "../../../entities/service/model/public";
import {
  useServiceCategories,
} from "../../service-category-selection/model/useServiceCategories";
import {
  usePublicProfileServices,
} from "../model/usePublicProfileServices";
import PublicProfileServiceDescription from "./PublicProfileServiceDescription";

const SERVICE_PREVIEW_LIMIT = 5;

function formatCurrency(
  amount: number,
  currency: string
): string {
  try {
    return new Intl.NumberFormat(
      "et-EE",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function priceLabel(
  service: PublicService
): string {
  if (
    service.priceType ===
      "contact" ||
    service.priceAmount === null
  ) {
    return "Hind kokkuleppel";
  }

  const amountLabel =
    formatCurrency(
      service.priceAmount,
      service.currency
    );

  if (
    service.priceType ===
    "from"
  ) {
    return `Alates ${amountLabel}`;
  }

  if (
    service.priceType ===
    "hourly"
  ) {
    return `${amountLabel} / h`;
  }

  return amountLabel;
}

function fallbackCategoryLabel(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function serviceCategoryLabel(
  service: PublicService,
  categoryLabelByCode:
    Map<string, string>
): string {
  const rootLabel =
    service.category
      ? categoryLabelByCode.get(
          service.category
        ) ||
        fallbackCategoryLabel(
          service.category
        )
      : null;

  const childLabel =
    service.subcategory
      ? categoryLabelByCode.get(
          service.subcategory
        ) ||
        fallbackCategoryLabel(
          service.subcategory
        )
      : null;

  return [
    rootLabel,
    childLabel,
  ]
    .filter(Boolean)
    .join(" · ") ||
    "Teenus";
}

function serviceLocationLabel(
  service: PublicService
): string | null {
  return (
    service.city ||
    service.location ||
    service.country ||
    null
  );
}

function LoadingServices() {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="flex gap-4">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="w-[270px] flex-none rounded-[24px] border border-black/5 bg-white p-3 shadow-sm"
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

function ServiceCard({
  service,
  expanded,
  categoryLabelByCode,
}: {
  service: PublicService;
  expanded: boolean;
  categoryLabelByCode:
    Map<string, string>;
}) {
  const categoryLabel =
    serviceCategoryLabel(
      service,
      categoryLabelByCode
    );

  const locationLabel =
    serviceLocationLabel(service);

  return (
    <article
      className={[
        "min-w-0 rounded-[24px] border border-black/5 bg-white p-3 shadow-sm",
        expanded
          ? "w-full"
          : "w-[270px] flex-none",
      ].join(" ")}
    >
      <div
        className={[
          "min-w-0 overflow-hidden rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200",
          expanded
            ? "h-48 sm:h-52"
            : "h-36",
        ].join(" ")}
      >
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display =
                "none";
            }}
          />
        ) : null}
      </div>

      <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
        <span className="max-w-full truncate rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
          {categoryLabel}
        </span>

        {service.images.length > 1 ? (
          <span className="shrink-0 text-[11px] font-black text-neutral-400">
            {service.images.length} pilti
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
        {service.title}
      </h3>

      {locationLabel ? (
        <p className="mt-1 line-clamp-2 break-words text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-neutral-400">
          {locationLabel}
        </p>
      ) : null}

      <PublicProfileServiceDescription
        serviceId={service.id}
        description={service.description}
        expanded={expanded}
      />

      <p className="mt-3 break-words text-base font-black text-neutral-900">
        {priceLabel(service)}
      </p>
    </article>
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
  const {
    services,
    loading,
    error,
  } = usePublicProfileServices(
    profile
  );

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
              category.labelEt,
            ]
          )
        ),
      [serviceCategories]
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
    <section className="min-w-0 overflow-hidden rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex min-w-0 items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
            Teenused
          </p>

          <h2 className="mt-2 break-words text-2xl font-black tracking-tight md:text-3xl">
            Pakutavad teenused
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
            className="shrink-0 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black shadow-sm transition hover:border-neutral-300"
          >
            {expanded
              ? "Näita vähem"
              : services.length >
                  SERVICE_PREVIEW_LIMIT
                ? `Vaata kõiki (${services.length})`
                : "Vaata lähemalt"}
          </button>
        ) : null}
      </div>

      {loading ? (
        <LoadingServices />
      ) : null}

      {!loading && error ? (
        <div className="rounded-[22px] border border-red-100 bg-red-50 p-5">
          <h3 className="font-black text-red-950">
            Teenuseid ei saanud laadida
          </h3>

          <p className="mt-2 text-sm leading-6 text-red-800">
            {error}
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
                  expanded
                  categoryLabelByCode={
                    categoryLabelByCode
                  }
                />
              )
            )}
          </div>
        ) : (
          <div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-2">
            <div className="flex w-max gap-4 px-1">
              {previewServices.map(
                (service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
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
