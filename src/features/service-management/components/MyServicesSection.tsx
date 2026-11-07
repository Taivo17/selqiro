"use client";

import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import Link from "next/link";
import {
  getCurrentMyAreaRelativeUrl,
  isMyAreaContentReturnNavigation,
  readMyAreaContentReturnContext,
  saveMyAreaContentReturnContext,
} from "../../my-area-navigation/model/myAreaContentReturnContext";
import {
  useMyAreaContentReturnRestoration,
} from "../../my-area-navigation/model/useMyAreaContentReturnRestoration";
import type {
  Service,
  ServiceStatus,
} from "../../../entities/service/model/types";
import { useServiceCategories } from "../../service-category-selection/model/useServiceCategories";
import ServiceDraftCreateForm from "./ServiceDraftCreateForm";
import ServiceImageManager from "./ServiceImageManager";
import { useMyServices } from "../model/useMyServices";

const SERVICE_PREVIEW_LIMIT = 3;

function statusLabel(
  status: ServiceStatus
): string {
  if (status === "published") {
    return marketplaceMessage("service.public.22d0d3");
  }

  if (status === "archived") {
    return marketplaceMessage("horse.archived.c37d62");
  }

  return marketplaceMessage("horse.draft.e9670d");
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
    return marketplaceMessage("service.publish.1b6402");
  }

  if (status === "published") {
    return marketplaceMessage("service.archive.016685");
  }

  return marketplaceMessage("service.restore_as_draft.88e185");
}

function lifecycleBusyLabel(
  status: ServiceStatus
): string {
  if (status === "draft") {
    return marketplaceMessage("service.publishing.6bc9b5");
  }

  if (status === "published") {
    return marketplaceMessage("service.archiving.a441cf");
  }

  return marketplaceMessage("service.restoring.8d72ed");
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
    return marketplaceMessage("service.service_value_is_now_public.94b1b4", { p0: String(service.title) });
  }

  if (service.status === "archived") {
    return marketplaceMessage("service.service_value_was_archived.d73fa1", { p0: String(service.title) });
  }

  return marketplaceMessage("service.service_value_was_restored_as_a_draft.95c331", { p0: String(service.title) });
}

function formatCurrency(
  amount: number,
  currency: string,
  language: "en" | "et"
): string {
  try {
    return new Intl.NumberFormat(
      localeForLanguage(language),
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
  service: Service,
  language: "en" | "et"
): string {
  if (
    service.priceType ===
      "contact" ||
    service.priceAmount === null
  ) {
    return marketplaceMessage("service.price_by_agreement.299166");
  }

  const amountLabel =
    formatCurrency(
      service.priceAmount,
      service.currency,
      language
    );

  if (
    service.priceType ===
    "from"
  ) {
    return marketplaceMessage("service.from_value.dc06d7", { p0: String(amountLabel) });
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
    marketplaceMessage("service.no_further_information.7afc52");
}

function LoadingServices() {
  const { language, r } = useMarketplaceTranslation();
  return (
    <div className="mt-5 space-y-3">
      {r([0, 1, 2].map(
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
      ))}
    </div>
  );
}

function ServiceRow({
  service,
  categoryLabelByCode,
  onOpenService,
}: {
  service: Service;
  categoryLabelByCode:
    Map<string, string>;
  onOpenService: (
    event: MouseEvent<HTMLAnchorElement>,
    serviceId: string
  ) => void;
}) {
  const { language, r } = useMarketplaceTranslation();
  const detailHref =
    `/v2/service/${service.id}?from=my-area`;

  return (
    <article className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] items-start gap-3 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-3 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:rounded-[22px] sm:p-4">
      <Link
        href={detailHref}
        onClick={(event) =>
          onOpenService(
            event,
            service.id
          )}
        aria-label={r(marketplaceMessage("service.view_service_value.881bf1", { p0: String(service.title) }))}
        className="group h-24 min-w-0 overflow-hidden rounded-[16px] bg-gradient-to-br from-neutral-100 to-neutral-200 outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-black sm:rounded-[18px]"
      >
        {r(service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]"
            onError={(event) => {
              event.currentTarget.style.display =
                "none";
            }}
          />
        ) : null)}
      </Link>

      <div className="min-w-0">
        <span
          className={[
            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black sm:px-2.5 sm:py-1 sm:text-[11px]",
            statusClass(
              service.status
            ),
          ].join(" ")}
        >
          {r(statusLabel(
            service.status
          ))}
        </span>

        <Link
          href={detailHref}
          onClick={(event) =>
            onOpenService(
              event,
              service.id
            )}
          className="block rounded-lg outline-none ring-offset-2 transition hover:text-neutral-600 focus-visible:ring-2 focus-visible:ring-black"
        >
          <h3 className="mt-1.5 line-clamp-2 break-words text-base font-black leading-5 sm:mt-2 sm:text-lg sm:leading-6">
            {r(service.title)}
          </h3>

          <p className="mt-1 line-clamp-2 break-words text-[10px] font-bold uppercase leading-4 tracking-[0.1em] text-neutral-400 sm:text-xs sm:tracking-[0.12em]">
            {r(serviceMeta(
              service,
              categoryLabelByCode
            ))}
          </p>
        </Link>

        <Link
          href={detailHref}
          onClick={(event) =>
            onOpenService(
              event,
              service.id
            )}
          className="block rounded-lg outline-none ring-offset-2 transition hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-black"
        >
          {r(service.description ? (
            <p className="mt-1.5 line-clamp-2 break-words text-xs leading-5 text-neutral-600 sm:mt-2 sm:text-sm sm:leading-6">
              {r(service.description)}
            </p>
          ) : (
            <p className="mt-1.5 text-xs leading-5 text-neutral-400 sm:mt-2 sm:text-sm">
              {r(marketplaceMessage("service.no_description.5b24f9"))}</p>
          ))}
        </Link>
      </div>

      <p className="col-start-2 break-words text-sm font-black text-neutral-800 sm:col-start-auto sm:max-w-[150px] sm:text-right">
        {r(priceLabel(service, language))}
      </p>
    </article>
  );
}

export default function MyServicesSection() {
  const { language, r } = useMarketplaceTranslation();
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
    updateServiceImageUrl,
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
              language === "et" ? category.labelEt : category.labelEn,
            ]
          )
        ),
      [serviceCategories, language]
    );

  const [
    showAll,
    setShowAll,
  ] = useState(false);


  useMyAreaContentReturnRestoration({
    contentType: "service",
    ready: !loading && !error,
    contentIds: services.map(
      (service) => service.id
    ),
  });

  function handleOpenService(
    event: MouseEvent<HTMLAnchorElement>,
    serviceId: string
  ) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const card =
      event.currentTarget.closest(
        "[data-my-area-content-card]"
      ) as HTMLElement | null;

    saveMyAreaContentReturnContext({
      contentType: "service",
      contentId: serviceId,
      cardViewportTop:
        card?.getBoundingClientRect()
          .top ?? 0,
    });
  }

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

  const [
    imageBusyServiceId,
    setImageBusyServiceId,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    setShowAll(false);
    setEditingServiceId(null);
    setEditSuccessMessage(null);
    setStatusSuccessMessage(null);
    setStatusErrorMessage(null);
    setImageBusyServiceId(null);
  }, [activeIdentityId]);


  useEffect(() => {
    if (loading || error) {
      return;
    }

    const returnContext =
      readMyAreaContentReturnContext();

    if (
      !returnContext ||
      returnContext.contentType !==
        "service" ||
      returnContext.sourceUrl !==
        getCurrentMyAreaRelativeUrl() ||
      !isMyAreaContentReturnNavigation(
        returnContext
      )
    ) {
      return;
    }

    const targetIndex =
      services.findIndex(
        (service) =>
          service.id ===
          returnContext.contentId
      );

    if (
      targetIndex >=
      SERVICE_PREVIEW_LIMIT
    ) {
      setShowAll(true);
    }
  }, [
    loading,
    error,
    services,
  ]);

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
      null ||
    imageBusyServiceId !==
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
        safeMarketplaceError(error, marketplaceMessage("service.the_service_status_could_not_be_changed.076de2"))
      );
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[26px] border border-black/5 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            {r(marketplaceMessage("service.services.78936e"))}</p>

          <h2 className="mt-2 break-words text-2xl font-black">
            {r(marketplaceMessage("service.your_services.0d8f24"))}</h2>

          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-neutral-600">
            {r(marketplaceMessage("service.create_edit_publish_and_archive_services_for_the.ef6a74"))}</p>
        </div>

        {r(canToggle &&
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
              )}
            className="inline-flex w-full shrink-0 justify-center rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black shadow-sm transition hover:border-neutral-300 sm:w-auto"
          >
            {r(showAll
              ? marketplaceMessage("service.show_less.2dacfc")
              : marketplaceMessage("service.view_all_value.d0b8d3", { p0: String(services.length) }))}
          </button>
        ) : null)}
      </div>

      {r(!loading &&
      !error &&
      activeIdentityId ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-600">
            {r(services.length)}  {r(marketplaceMessage("service.total.1d0b5c"))}</span>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
            {r(publishedCount)}  {r(marketplaceMessage("service.public.78e906"))}</span>

          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
            {r(draftCount)}  {r(marketplaceMessage("service.drafts.7dc5e1"))}</span>

          {r(archivedCount > 0 ? (
            <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-500">
              {r(archivedCount)}  {r(marketplaceMessage("service.archived.2ba0d9"))}</span>
          ) : null)}
        </div>
      ) : null)}

      {r(!loading &&
      !error &&
      activeIdentityId ? (
        <>
          {r(editingServiceId ===
          null ? (
            <ServiceDraftCreateForm
              activeIdentityId={activeIdentityId}
              saving={savingServiceId ===
                "new"}
              onSave={saveService}
              onClearError={clearError}
            />
          ) : null)}

          {r(editSuccessMessage ? (
            <p
              role="status"
              className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-semibold leading-6 text-emerald-800"
            >
              {r(editSuccessMessage)}
            </p>
          ) : null)}

          {r(statusSuccessMessage ? (
            <p
              role="status"
              className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-semibold leading-6 text-emerald-800"
            >
              {r(statusSuccessMessage)}
            </p>
          ) : null)}

          {r(statusErrorMessage ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold leading-6 text-red-800"
            >
              {r(statusErrorMessage)}
            </p>
          ) : null)}
        </>
      ) : null)}

      {r(loading ? (
        <LoadingServices />
      ) : null)}

      {r(!loading && error ? (
        <div className="mt-5 rounded-[22px] border border-red-100 bg-red-50 p-5">
          <p className="font-black text-red-950">
            {r(marketplaceMessage("service.services_could_not_be_loaded.59b8ca"))}</p>

          <p className="mt-2 break-words text-sm leading-6 text-red-800">
            {r(error)}
          </p>

          <button
            type="button"
            onClick={() =>
              void refresh()}
            className="mt-4 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-800"
          >
            {r(marketplaceMessage("horse.try_again.8c63df"))}</button>
        </div>
      ) : null)}

      {r(!loading &&
      !error &&
      !activeIdentityId ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-5">
          <p className="font-black">
            {r(marketplaceMessage("service.no_active_identity.579519"))}</p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {r(marketplaceMessage("service.sign_in_and_select_an_active_identity_to.cdf7fb"))}</p>
        </div>
      ) : null)}

      {r(!loading &&
      !error &&
      activeIdentityId &&
      services.length === 0 ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-5">
          <p className="font-black">
            {r(marketplaceMessage("service.no_services_added_yet.71f9e7"))}</p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {r(marketplaceMessage("service.create_your_first_service_using_the_form_above.bf65fd"))}</p>
        </div>
      ) : null)}

      {r(!loading &&
      !error &&
      services.length > 0 ? (
        <div className="mt-5 space-y-3">
          {r(visibleServices.map(
            (service) => (
              <div
                  key={service.id}
                  data-my-area-content-card=""
                  data-my-area-content-type="service"
                  data-my-area-content-id={service.id}
                  className="min-w-0"
                >
                  <ServiceRow
                    service={service}
                    categoryLabelByCode={categoryLabelByCode}
                    onOpenService={handleOpenService}
                  />

                  {r(service.status ===
                    "draft" ? (
                    <ServiceImageManager
                      service={service}
                      disabled={actionBusy &&
                        imageBusyServiceId !==
                          service.id}
                      onImageUrlChange={(
                        imageUrl
                      ) => {
                        updateServiceImageUrl(
                          service.id,
                          imageUrl
                        );
                      }}
                      onBusyChange={(
                        busy
                      ) => {
                        setImageBusyServiceId(
                          (current) => {
                            if (busy) {
                              return service.id;
                            }

                            return current ===
                              service.id
                              ? null
                              : current;
                          }
                        );
                      }}
                    />
                  ) : null)}

                  {r(editingServiceId ===
                    null ? (
                    <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2 [&>button]:w-full sm:flex sm:flex-wrap sm:justify-end sm:[&>button]:w-auto">
                      {r(service.status ===
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
                          disabled={actionBusy}
                          className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 shadow-sm transition hover:border-neutral-300 disabled:cursor-wait disabled:opacity-50"
                        >
                          {r(marketplaceMessage("service.edit.b81741"))}</button>
                      ) : null)}

                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(
                            service
                          )}
                        disabled={actionBusy}
                        className={[
                          "rounded-full border px-4 py-2 text-xs font-black shadow-sm transition disabled:cursor-wait disabled:opacity-50",
                          lifecycleActionClass(
                            service.status
                          ),
                        ].join(" ")}
                      >
                        {r(changingStatusServiceId ===
                        service.id
                          ? lifecycleBusyLabel(
                              service.status
                            )
                          : lifecycleActionLabel(
                              service.status
                            ))}
                      </button>
                    </div>
                  ) : null)}

                  {r(service.status ===
                    "draft" &&
                  activeIdentityId &&
                  editingServiceId ===
                    service.id ? (
                    <ServiceDraftCreateForm
                      activeIdentityId={activeIdentityId}
                      service={service}
                      saving={savingServiceId ===
                        service.id}
                      onSave={saveService}
                      onClearError={clearError}
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
                          marketplaceMessage("service.service_value_saved.d172b5", { p0: String(updatedService.title) })
                        );
                      }}
                    />
                  ) : null)}
                </div>
            )
          ))}
        </div>
      ) : null)}
    </section>
  );
}
