"use client";

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
    return "Avalik";
  }

  if (service.status === "archived") {
    return "Arhiveeritud";
  }

  return "Mustand";
}

function statusClass(
  label: string
): string {
  if (label === "Avalik") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (label === "Mustand") {
    return "border-amber-100 bg-amber-50 text-amber-800";
  }

  return "border-neutral-200 bg-neutral-100 text-neutral-600";
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
  service: MyServiceDetail
): string {
  if (
    service.priceType === "contact" ||
    service.priceAmount === null
  ) {
    return "Hind kokkuleppel";
  }

  const amountLabel =
    formatCurrency(
      service.priceAmount,
      service.currency
    );

  if (service.priceType === "from") {
    return `Alates ${amountLabel}`;
  }

  if (service.priceType === "hourly") {
    return `${amountLabel} / h`;
  }

  return amountLabel;
}

function formatDate(
  value: string | null
): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "et-EE",
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
    "Ei ole määratud";
}

function LoadingState() {
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
  return (
    <section className="mx-auto max-w-3xl rounded-[34px] border border-black/5 bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-black">
        {title}
      </h1>

      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
        {text}
      </p>

      <button
        type="button"
        onClick={onAction}
        className="mt-6 rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      >
        {actionLabel}
      </button>
    </section>
  );
}

export default function ServiceDetailPage({
  serviceId,
}: {
  serviceId: string;
}) {
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
              category.labelEt,
            ]
          )
        ),
      [serviceCategories]
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
          loadError instanceof Error
            ? loadError.message
            : "Teenust ei saanud laadida."
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
        title="Logi sisse"
        text="Teenuse eelvaate avamiseks pead olema sisse logitud."
        actionLabel="Logi sisse"
        onAction={() =>
          router.push("/auth")
        }
      />
    );
  }

  if (status === "not_found") {
    return (
      <MessageState
        title="Teenust ei leitud"
        text="See teenus ei kuulu aktiivsele identiteedile või ei ole enam saadaval."
        actionLabel="Tagasi Minu alasse"
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
        title="Teenust ei saanud laadida"
        text={
          error ||
          "Tekkis ootamatu viga."
        }
        actionLabel="Tagasi Minu alasse"
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
    "Rubriik puudub";

  const publishedAtLabel =
    formatDate(
      service.publishedAt
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
        ← Tagasi Minu alasse
      </button>

      <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white p-5 shadow-sm sm:p-6 md:p-8">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-600">
              Teenus
            </p>

            <h1 className="mt-3 break-words text-3xl font-black tracking-tight sm:text-4xl">
              {service.title}
            </h1>

            <p className="mt-2 break-words text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
              {categoryLabel}
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
            {resolvedStatusLabel}
          </span>
        </div>

        {service.status !==
        "published" ? (
          <div className="mt-5 rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-900">
            See on aktiivse identiteedi privaatne eelvaade. Avalikul profiilil kuvatakse ainult avaldatud teenus.
          </div>
        ) : null}

        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <div className="min-w-0">
            {service.images.length > 0 ||
            service.imageUrl ? (
              <PublicProfileServiceGallery
                service={galleryService}
                expanded
              />
            ) : (
              <div className="flex h-72 items-center justify-center rounded-[24px] bg-gradient-to-br from-neutral-100 to-neutral-200 text-sm font-black text-neutral-400">
                Pilt puudub
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <section className="rounded-[24px] border border-neutral-100 bg-[#fbfbfa] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
                Kirjeldus
              </p>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-700">
                {service.description ||
                  "Kirjeldus puudub."}
              </p>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[20px] border border-neutral-100 bg-[#fbfbfa] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                  Hind
                </p>

                <p className="mt-2 break-words font-black">
                  {priceLabel(service)}
                </p>
              </div>

              <div className="rounded-[20px] border border-neutral-100 bg-[#fbfbfa] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                  Asukoht
                </p>

                <p className="mt-2 break-words font-black">
                  {locationLabel(service)}
                </p>
              </div>

              <div className="rounded-[20px] border border-neutral-100 bg-[#fbfbfa] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                  Staatus
                </p>

                <p className="mt-2 font-black">
                  {resolvedStatusLabel}
                </p>
              </div>

              <div className="rounded-[20px] border border-neutral-100 bg-[#fbfbfa] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                  Avaldatud
                </p>

                <p className="mt-2 font-black">
                  {publishedAtLabel ||
                    "Ei ole avaldatud"}
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
