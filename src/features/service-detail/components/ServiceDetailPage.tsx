"use client";

import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import { useAuth } from "../../../../lib/useAuth";
import { getActiveIdentity } from "../../../entities/identity/api/getActiveIdentity";
import {
  getMyServiceDetail,
  type MyServiceDetail,
} from "../../../entities/service/api/getMyServices";
import type {
  PublicService,
} from "../../../entities/service/model/public";
import {
  useServiceCategories,
} from "../../service-category-selection/model/useServiceCategories";
import PublicProfileServiceGallery from "../../public-profile/components/PublicProfileServiceGallery";
import {
  markMyAreaContentReturnFallbackNavigation,
} from "../../my-area-navigation/model/myAreaContentReturnContext";

type DetailLoadStatus =
  | "loading"
  | "ready"
  | "not_authenticated"
  | "not_found"
  | "error";

function statusLabel(
  service: MyServiceDetail
): string {
  if (service.status === "published") {
    return marketplaceMessage("service.public.22d0d3");
  }

  if (service.status === "archived") {
    return marketplaceMessage("horse.archived.c37d62");
  }

  return marketplaceMessage("horse.draft.e9670d");
}

function statusClass(
  label: string
): string {
  if (label === marketplaceMessage("service.public.22d0d3")) {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (label === marketplaceMessage("horse.draft.e9670d")) {
    return "border-amber-100 bg-amber-50 text-amber-800";
  }

  return "border-neutral-200 bg-neutral-100 text-neutral-600";
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
  service: MyServiceDetail,
  language: "en" | "et"
): string {
  if (
    service.priceType === "contact" ||
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

  if (service.priceType === "from") {
    return marketplaceMessage("service.from_value.dc06d7", { p0: String(amountLabel) });
  }

  if (service.priceType === "hourly") {
    return `${amountLabel} / h`;
  }

  return amountLabel;
}

function formatDate(
  value: string | null,
  language: "en" | "et"
): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(
    localeForLanguage(language),
    {
      dateStyle: "medium",
    }
  ).format(date);
}

function locationLabel(
  service: MyServiceDetail
): string {
  if (service.location) {
    return service.location;
  }

  return [
    service.city,
    service.country,
  ]
    .filter(Boolean)
    .join(", ") ||
    marketplaceMessage("service.not_specified.530480");
}

function LoadingState() {
  const { language, r } = useMarketplaceTranslation();
  return (
    <section className="mx-auto max-w-5xl rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <div className="h-5 w-28 animate-pulse rounded-full bg-neutral-100" />
      <div className="mt-4 h-10 w-2/3 animate-pulse rounded-full bg-neutral-100" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="h-72 animate-pulse rounded-[24px] bg-neutral-100" />

        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-[22px] bg-neutral-100" />
          <div className="h-40 animate-pulse rounded-[22px] bg-neutral-100" />
        </div>
      </div>
    </section>
  );
}

function MessageState({
  title,
  text,
  actionLabel,
  onAction,
}: {
  title: string;
  text: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const { language, r } = useMarketplaceTranslation();
  return (
    <section className="mx-auto max-w-3xl rounded-[34px] border border-black/5 bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-black">
        {r(title)}
      </h1>

      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
        {r(text)}
      </p>

      <button
        type="button"
        onClick={onAction}
        className="mt-6 rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      >
        {r(actionLabel)}
      </button>
    </section>
  );
}

export default function ServiceDetailPage({
  serviceId,
}: {
  serviceId: string;
}) {
  const { language, r } = useMarketplaceTranslation();
  const router = useRouter();

  const {
    user,
    loading: authLoading,
  } = useAuth();

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
    service,
    setService,
  ] =
    useState<MyServiceDetail | null>(
      null
    );

  const [
    status,
    setStatus,
  ] =
    useState<DetailLoadStatus>(
      "loading"
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    let mounted = true;

    async function loadDetail() {
      if (authLoading) {
        return;
      }

      if (!user?.id) {
        setService(null);
        setError(null);
        setStatus(
          "not_authenticated"
        );
        return;
      }

      setService(null);
      setError(null);
      setStatus("loading");

      try {
        const activeIdentity =
          await getActiveIdentity({
            userId: user.id,
            userEmail: user.email,
          });

        if (
          !activeIdentity?.id ||
          activeIdentity.id ===
            "fallback-private"
        ) {
          if (!mounted) return;

          setStatus("not_found");
          return;
        }

        const detail =
          await getMyServiceDetail({
            serviceId,
            identityId:
              activeIdentity.id,
          });

        if (!mounted) return;

        if (!detail) {
          setStatus("not_found");
          return;
        }

        setService(detail);
        setStatus("ready");
      } catch (loadError) {
        if (!mounted) return;

        setError(
          safeMarketplaceError(loadError, marketplaceMessage("service.the_service_could_not_be_loaded.d86bb3"))
        );

        setStatus("error");
      }
    }

    void loadDetail();

    return () => {
      mounted = false;
    };
  }, [
    authLoading,
    user?.id,
    user?.email,
    serviceId,
  ]);

  function returnToMyArea() {
    const fromMyArea =
      typeof window !==
        "undefined" &&
      new URLSearchParams(
        window.location.search
      ).get("from") ===
        "my-area";

    if (
      fromMyArea &&
      typeof window !==
        "undefined" &&
      window.history.length > 1
    ) {
      router.back();
      return;
    }

    markMyAreaContentReturnFallbackNavigation({
      contentType: "service",
      contentId: serviceId,
    });

    router.push(
      "/v2/my-area"
    );
  }

  if (
    authLoading ||
    status === "loading"
  ) {
    return <LoadingState />;
  }

  if (
    status ===
    "not_authenticated"
  ) {
    return (
      <MessageState
        title={r(marketplaceMessage("horse.sign_in.777709"))}
        text={r(marketplaceMessage("service.sign_in_to_open_the_service_preview.1bf920"))}
        actionLabel={r(marketplaceMessage("horse.sign_in.777709"))}
        onAction={() =>
          router.push("/auth")}
      />
    );
  }

  if (status === "not_found") {
    return (
      <MessageState
        title={r(marketplaceMessage("service.service_not_found.074aa0"))}
        text={r(marketplaceMessage("service.this_service_does_not_belong_to_the_active.487120"))}
        actionLabel={r(marketplaceMessage("horse.back_to_my_area.17fad0"))}
        onAction={returnToMyArea}
      />
    );
  }

  if (
    status === "error" ||
    error
  ) {
    return (
      <MessageState
        title={r(marketplaceMessage("service.the_service_could_not_be_loaded.59e727"))}
        text={error ||
          marketplaceMessage("service.an_unexpected_error_occurred.e7f5d5")}
        actionLabel={r(marketplaceMessage("horse.back_to_my_area.17fad0"))}
        onAction={returnToMyArea}
      />
    );
  }

  if (!service) {
    return null;
  }

  const resolvedStatusLabel =
    statusLabel(service);

  const rootCategoryLabel =
    service.category
      ? categoryLabelByCode.get(
          service.category
        ) || service.category
      : null;

  const childCategoryLabel =
    service.subcategory
      ? categoryLabelByCode.get(
          service.subcategory
        ) || service.subcategory
      : null;

  const categoryLabel = [
    rootCategoryLabel,
    childCategoryLabel,
  ]
    .filter(Boolean)
    .join(" · ") ||
    marketplaceMessage("service.no_category.9bc711");

  const publishedAtLabel =
    formatDate(
      service.publishedAt,
      language
    );

  const galleryService = {
    ...service,
    status: "published",
  } as PublicService;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <button
        type="button"
        onClick={returnToMyArea}
        className="inline-flex rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black shadow-sm transition hover:border-neutral-300"
      >
        {r(marketplaceMessage("horse.back_to_my_area.2b7192"))}</button>

      <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white p-5 shadow-sm sm:p-6 md:p-8">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-600">
              {r(marketplaceMessage("service.service.d6b32e"))}</p>

            <h1 className="mt-3 break-words text-3xl font-black tracking-tight sm:text-4xl">
              {r(service.title)}
            </h1>

            <p className="mt-2 break-words text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
              {r(categoryLabel)}
            </p>
          </div>

          <span
            className={[
              "inline-flex w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-black",
              statusClass(
                resolvedStatusLabel
              ),
            ].join(" ")}
          >
            {r(resolvedStatusLabel)}
          </span>
        </div>

        {r(service.status !==
        "published" ? (
          <div className="mt-5 rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-900">
            {r(marketplaceMessage("service.this_is_a_private_preview_for_the_active.252438"))}</div>
        ) : null)}

        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <div className="min-w-0">
            {r(service.images.length > 0 ||
            service.imageUrl ? (
              <PublicProfileServiceGallery
                service={galleryService}
                expanded
              />
            ) : (
              <div className="flex h-72 items-center justify-center rounded-[24px] bg-gradient-to-br from-neutral-100 to-neutral-200 text-sm font-black text-neutral-400">
                {r(marketplaceMessage("horse.no_image.615289"))}</div>
            ))}
          </div>

          <div className="min-w-0 space-y-4">
            <section className="rounded-[24px] border border-neutral-100 bg-[#fbfbfa] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
                {r(marketplaceMessage("horse.description.8dbc42"))}</p>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-700">
                {r(service.description ||
                  marketplaceMessage("service.no_description.5b24f9"))}
              </p>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[20px] border border-neutral-100 bg-[#fbfbfa] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                  {r(marketplaceMessage("service.price.ee7887"))}</p>

                <p className="mt-2 break-words font-black">
                  {r(priceLabel(service, language))}
                </p>
              </div>

              <div className="rounded-[20px] border border-neutral-100 bg-[#fbfbfa] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                  {r(marketplaceMessage("service.location.b55f9b"))}</p>

                <p className="mt-2 break-words font-black">
                  {r(locationLabel(service))}
                </p>
              </div>

              <div className="rounded-[20px] border border-neutral-100 bg-[#fbfbfa] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                  {r(marketplaceMessage("horse.status.e99bbe"))}</p>

                <p className="mt-2 font-black">
                  {r(resolvedStatusLabel)}
                </p>
              </div>

              <div className="rounded-[20px] border border-neutral-100 bg-[#fbfbfa] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                  {r(marketplaceMessage("horse.published.2de00c"))}</p>

                <p className="mt-2 font-black">
                  {r(publishedAtLabel ||
                    marketplaceMessage("service.not_published.625a18"))}
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
