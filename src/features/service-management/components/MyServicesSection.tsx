"use client";

import {
  useEffect,
  useState,
} from "react";
import type {
  Service,
  ServiceStatus,
} from "../../../entities/service/model/types";
import { useMyServices } from "../model/useMyServices";

const SERVICE_PREVIEW_LIMIT = 3;

function statusLabel(
  status: ServiceStatus
): string {
  if (status === "published") {
    return "Avalik";
  }

  if (status === "archived") {
    return "Arhiveeritud";
  }

  return "Mustand";
}

function statusClass(
  status: ServiceStatus
): string {
  if (status === "published") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (status === "archived") {
    return "border-neutral-200 bg-neutral-100 text-neutral-500";
  }

  return "border-amber-100 bg-amber-50 text-amber-700";
}

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
  service: Service
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

function serviceMeta(
  service: Service
): string {
  const categoryLabel = [
    service.category,
    service.subcategory,
  ]
    .filter(Boolean)
    .join(" · ");

  const locationLabel =
    service.city ||
    service.location ||
    service.country ||
    "";

  return [
    categoryLabel,
    locationLabel,
  ]
    .filter(Boolean)
    .join(" · ") ||
    "Lisainfo puudub";
}

function LoadingServices() {
  return (
    <div className="mt-5 space-y-3">
      {[0, 1, 2].map(
        (item) => (
          <div
            key={item}
            className="grid animate-pulse gap-4 rounded-[22px] border border-neutral-100 bg-[#fbfbfa] p-4 sm:grid-cols-[96px_minmax(0,1fr)]"
          >
            <div className="h-24 rounded-[18px] bg-neutral-100" />
            <div className="space-y-3">
              <div className="h-5 w-28 rounded-full bg-neutral-100" />
              <div className="h-6 w-2/3 rounded-full bg-neutral-100" />
              <div className="h-4 w-full rounded-full bg-neutral-100" />
            </div>
          </div>
        )
      )}
    </div>
  );
}

function ServiceRow({
  service,
}: {
  service: Service;
}) {
  return (
    <article className="grid min-w-0 gap-4 rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
      <div className="h-24 min-w-0 overflow-hidden rounded-[18px] bg-gradient-to-br from-neutral-100 to-neutral-200">
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

      <div className="min-w-0">
        <span
          className={[
            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black",
            statusClass(
              service.status
            ),
          ].join(" ")}
        >
          {statusLabel(
            service.status
          )}
        </span>

        <h3 className="mt-2 break-words text-lg font-black">
          {service.title}
        </h3>

        <p className="mt-1 break-words text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
          {serviceMeta(service)}
        </p>

        {service.description ? (
          <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-neutral-600">
            {service.description}
          </p>
        ) : null}
      </div>

      <p className="break-words text-sm font-black text-neutral-800 sm:max-w-[150px] sm:text-right">
        {priceLabel(service)}
      </p>
    </article>
  );
}

export default function MyServicesSection() {
  const {
    activeIdentityId,
    services,
    loading,
    error,
    refresh,
  } = useMyServices();

  const [
    showAll,
    setShowAll,
  ] = useState(false);

  useEffect(() => {
    setShowAll(false);
  }, [activeIdentityId]);

  const publishedCount =
    services.filter(
      (service) =>
        service.status ===
        "published"
    ).length;

  const draftCount =
    services.filter(
      (service) =>
        service.status ===
        "draft"
    ).length;

  const archivedCount =
    services.filter(
      (service) =>
        service.status ===
        "archived"
    ).length;

  const visibleServices =
    showAll
      ? services
      : services.slice(
          0,
          SERVICE_PREVIEW_LIMIT
        );

  const canToggle =
    services.length >
      SERVICE_PREVIEW_LIMIT ||
    showAll;

  return (
    <section className="min-w-0 overflow-hidden rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            Teenused
          </p>

          <h2 className="mt-2 break-words text-2xl font-black">
            Sinu teenused
          </h2>

          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-neutral-600">
            Siin kuvatakse aktiivse identiteedi päris teenused.
            Loomine ja muutmine lisatakse eraldi sammudena.
          </p>
        </div>

        {canToggle &&
        !loading &&
        !error ? (
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() =>
              setShowAll(
                (current) =>
                  !current
              )
            }
            className="inline-flex w-full shrink-0 justify-center rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black shadow-sm transition hover:border-neutral-300 sm:w-auto"
          >
            {showAll
              ? "Näita vähem"
              : `Vaata kõiki (${services.length})`}
          </button>
        ) : null}
      </div>

      {!loading &&
      !error &&
      activeIdentityId ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-600">
            {services.length} kokku
          </span>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
            {publishedCount} avalikku
          </span>

          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
            {draftCount} mustandit
          </span>

          {archivedCount > 0 ? (
            <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-500">
              {archivedCount} arhiveeritud
            </span>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <LoadingServices />
      ) : null}

      {!loading && error ? (
        <div className="mt-5 rounded-[22px] border border-red-100 bg-red-50 p-5">
          <p className="font-black text-red-950">
            Teenuseid ei saanud laadida
          </p>

          <p className="mt-2 break-words text-sm leading-6 text-red-800">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void refresh()
            }
            className="mt-4 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-800"
          >
            Proovi uuesti
          </button>
        </div>
      ) : null}

      {!loading &&
      !error &&
      !activeIdentityId ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-5">
          <p className="font-black">
            Aktiivne identiteet puudub
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Teenuste vaatamiseks logi sisse ja vali aktiivne identiteet.
          </p>
        </div>
      ) : null}

      {!loading &&
      !error &&
      activeIdentityId &&
      services.length === 0 ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-5">
          <p className="font-black">
            Teenuseid ei ole veel lisatud
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Esimese teenuse lisamine tuleb järgmise eraldiseisva sammuna.
          </p>
        </div>
      ) : null}

      {!loading &&
      !error &&
      services.length > 0 ? (
        <div className="mt-5 space-y-3">
          {visibleServices.map(
            (service) => (
              <ServiceRow
                key={service.id}
                service={service}
              />
            )
          )}
        </div>
      ) : null}
    </section>
  );
}
