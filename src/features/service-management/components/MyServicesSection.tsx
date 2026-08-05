"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Service,
  ServiceStatus,
} from "../../../entities/service/model/types";
import { useServiceCategories } from "../../service-category-selection/model/useServiceCategories";
import ServiceDraftCreateForm from "./ServiceDraftCreateForm";
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

function nextServiceStatus(
  status: ServiceStatus
): ServiceStatus {
  if (status === "draft") {
    return "published";
  }

  if (status === "published") {
    return "archived";
  }

  return "draft";
}

function lifecycleActionLabel(
  status: ServiceStatus
): string {
  if (status === "draft") {
    return "Avalda";
  }

  if (status === "published") {
    return "Arhiveeri";
  }

  return "Taasta mustandiks";
}

function lifecycleBusyLabel(
  status: ServiceStatus
): string {
  if (status === "draft") {
    return "Avaldan...";
  }

  if (status === "published") {
    return "Arhiveerin...";
  }

  return "Taastan...";
}

function lifecycleActionClass(
  status: ServiceStatus
): string {
  if (status === "draft") {
    return "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700";
  }

  if (status === "published") {
    return "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100";
  }

  return "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100";
}

function lifecycleSuccessMessage(
  service: Service
): string {
  if (service.status === "published") {
    return `Teenus „${service.title}” on nüüd avalik.`;
  }

  if (service.status === "archived") {
    return `Teenus „${service.title}” arhiveeriti.`;
  }

  return `Teenus „${service.title}” taastati mustandiks.`;
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
  service: Service,
  categoryLabelByCode:
    Map<string, string>
): string {
  const rootLabel =
    service.category
      ? categoryLabelByCode.get(
          service.category
        ) || null
      : null;

  const childLabel =
    service.subcategory
      ? categoryLabelByCode.get(
          service.subcategory
        ) || null
      : null;

  const categoryLabel = [
    rootLabel,
    childLabel,
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
  categoryLabelByCode,
}: {
  service: Service;
  categoryLabelByCode:
    Map<string, string>;
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
          {serviceMeta(
            service,
            categoryLabelByCode
          )}
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
    savingServiceId,
    changingStatusServiceId,
    refresh,
    saveService,
    changeStatus,
    clearError,
  } = useMyServices();

  const {
    categories:
      serviceCategories,
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

  const [
    showAll,
    setShowAll,
  ] = useState(false);

  const [
    editingServiceId,
    setEditingServiceId,
  ] = useState<string | null>(
    null
  );

  const [
    editSuccessMessage,
    setEditSuccessMessage,
  ] = useState<string | null>(
    null
  );

  const [
    statusSuccessMessage,
    setStatusSuccessMessage,
  ] = useState<string | null>(
    null
  );

  const [
    statusErrorMessage,
    setStatusErrorMessage,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    setShowAll(false);
    setEditingServiceId(null);
    setEditSuccessMessage(null);
    setStatusSuccessMessage(null);
    setStatusErrorMessage(null);
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

  const actionBusy =
    savingServiceId !== null ||
    changingStatusServiceId !==
      null;

  async function handleStatusChange(
    service: Service
  ) {
    setEditSuccessMessage(null);
    setStatusSuccessMessage(null);
    setStatusErrorMessage(null);
    clearError();

    try {
      const updatedService =
        await changeStatus(
          service.id,
          nextServiceStatus(
            service.status
          )
        );

      setStatusSuccessMessage(
        lifecycleSuccessMessage(
          updatedService
        )
      );
    } catch (error) {
      setStatusErrorMessage(
        error instanceof Error
          ? error.message
          : "Teenuse staatust ei saanud muuta."
      );
    }
  }

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
            Siin saad luua, muuta, avaldada ja arhiveerida aktiivse identiteedi teenuseid.
            Pildid, kustutamine ja avaliku profiili teenusevaade lisatakse eraldi sammudena.
          </p>
        </div>

        {canToggle &&
        editingServiceId ===
          null &&
        changingStatusServiceId ===
          null &&
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

      {!loading &&
      !error &&
      activeIdentityId ? (
        <>
          {editingServiceId ===
          null ? (
            <ServiceDraftCreateForm
              activeIdentityId={
                activeIdentityId
              }
              saving={
                savingServiceId ===
                "new"
              }
              onSave={
                saveService
              }
              onClearError={
                clearError
              }
            />
          ) : null}

          {editSuccessMessage ? (
            <p
              role="status"
              className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-semibold leading-6 text-emerald-800"
            >
              {editSuccessMessage}
            </p>
          ) : null}

          {statusSuccessMessage ? (
            <p
              role="status"
              className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-semibold leading-6 text-emerald-800"
            >
              {statusSuccessMessage}
            </p>
          ) : null}

          {statusErrorMessage ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold leading-6 text-red-800"
            >
              {statusErrorMessage}
            </p>
          ) : null}
        </>
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
              <div
                  key={service.id}
                  className="min-w-0"
                >
                  <ServiceRow
                    service={service}
                    categoryLabelByCode={
                      categoryLabelByCode
                    }
                  />

                  {editingServiceId ===
                    null ? (
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      {service.status ===
                      "draft" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingServiceId(
                              service.id
                            );
                            setEditSuccessMessage(
                              null
                            );
                            setStatusSuccessMessage(
                              null
                            );
                            setStatusErrorMessage(
                              null
                            );
                            clearError();
                          }}
                          disabled={
                            actionBusy
                          }
                          className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 shadow-sm transition hover:border-neutral-300 disabled:cursor-wait disabled:opacity-50"
                        >
                          Muuda
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(
                            service
                          )
                        }
                        disabled={
                          actionBusy
                        }
                        className={[
                          "rounded-full border px-4 py-2 text-xs font-black shadow-sm transition disabled:cursor-wait disabled:opacity-50",
                          lifecycleActionClass(
                            service.status
                          ),
                        ].join(" ")}
                      >
                        {changingStatusServiceId ===
                        service.id
                          ? lifecycleBusyLabel(
                              service.status
                            )
                          : lifecycleActionLabel(
                              service.status
                            )}
                      </button>
                    </div>
                  ) : null}

                  {service.status ===
                    "draft" &&
                  activeIdentityId &&
                  editingServiceId ===
                    service.id ? (
                    <ServiceDraftCreateForm
                      activeIdentityId={
                        activeIdentityId
                      }
                      service={
                        service
                      }
                      saving={
                        savingServiceId ===
                        service.id
                      }
                      onSave={
                        saveService
                      }
                      onClearError={
                        clearError
                      }
                      onCancelEdit={() => {
                        setEditingServiceId(
                          null
                        );
                        setStatusSuccessMessage(
                          null
                        );
                        setStatusErrorMessage(
                          null
                        );
                        clearError();
                      }}
                      onEdited={(
                        updatedService
                      ) => {
                        setEditingServiceId(
                          null
                        );
                        setEditSuccessMessage(
                          `Teenus „${updatedService.title}” salvestatud.`
                        );
                      }}
                    />
                  ) : null}
                </div>
            )
          )}
        </div>
      ) : null}
    </section>
  );
}
