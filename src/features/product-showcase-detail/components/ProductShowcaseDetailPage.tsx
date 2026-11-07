"use client";

import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  useEffect,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import { useAuth } from "../../../../lib/useAuth";
import { getActiveIdentity } from "../../../entities/identity/api/getActiveIdentity";
import {
  getMyProductShowcaseDetail,
  type MyProductShowcaseDetail,
} from "../../../entities/product-showcase/api/productShowcases";
import type {
  PublicProductShowcase,
} from "../../../entities/product-showcase/model/public";
import PublicProfileProductShowcaseGallery from "../../public-profile/components/PublicProfileProductShowcaseGallery";
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
  showcase: MyProductShowcaseDetail
): string {
  if (showcase.status === "archived") {
    return marketplaceMessage("horse.archived.c37d62");
  }

  if (showcase.status === "draft") {
    return marketplaceMessage("horse.draft.e9670d");
  }

  const activeUntil =
    showcase.activeUntil
      ? Date.parse(showcase.activeUntil)
      : Number.NaN;

  if (Number.isNaN(activeUntil)) {
    return marketplaceMessage("showcase.needs_review.95fc34");
  }

  if (activeUntil <= Date.now()) {
    return marketplaceMessage("showcase.expired.00e195");
  }

  return marketplaceMessage("service.public.22d0d3");
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

  if (
    label === marketplaceMessage("showcase.expired.00e195") ||
    label === marketplaceMessage("showcase.needs_review.95fc34")
  ) {
    return "border-orange-100 bg-orange-50 text-orange-800";
  }

  return "border-neutral-200 bg-neutral-100 text-neutral-600";
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

function LoadingState() {
  const { language, r } = useMarketplaceTranslation();
  return (
    <section className="mx-auto max-w-5xl rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <div className="h-5 w-32 animate-pulse rounded-full bg-neutral-100" />
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

export default function
ProductShowcaseDetailPage({
  showcaseId,
}: {
  showcaseId: string;
}) {
  const { language, r } = useMarketplaceTranslation();
  const router = useRouter();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [
    showcase,
    setShowcase,
  ] =
    useState<MyProductShowcaseDetail | null>(
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
        setShowcase(null);
        setError(null);
        setStatus(
          "not_authenticated"
        );
        return;
      }

      setShowcase(null);
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
          await getMyProductShowcaseDetail({
            showcaseId,
            identityId:
              activeIdentity.id,
          });

        if (!mounted) return;

        if (!detail) {
          setStatus("not_found");
          return;
        }

        setShowcase(detail);
        setStatus("ready");
      } catch (loadError) {
        if (!mounted) return;

        setError(
          safeMarketplaceError(loadError, marketplaceMessage("showcase.the_product_showcase_could_not_be_loaded.20097b"))
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
    showcaseId,
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
      contentType: "showcase",
      contentId: showcaseId,
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
        text={r(marketplaceMessage("showcase.sign_in_to_open_the_product_showcase_preview.45ce16"))}
        actionLabel={r(marketplaceMessage("horse.sign_in.777709"))}
        onAction={() =>
          router.push("/auth")}
      />
    );
  }

  if (
    status === "not_found"
  ) {
    return (
      <MessageState
        title={r(marketplaceMessage("showcase.product_showcase_not_found.3b1cda"))}
        text={r(marketplaceMessage("showcase.this_product_showcase_does_not_belong_to_the.a39087"))}
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
        title={r(marketplaceMessage("showcase.the_product_showcase_could_not_be_loaded.8ee816"))}
        text={error ||
          marketplaceMessage("service.an_unexpected_error_occurred.e7f5d5")}
        actionLabel={r(marketplaceMessage("horse.back_to_my_area.17fad0"))}
        onAction={returnToMyArea}
      />
    );
  }

  if (!showcase) {
    return null;
  }

  const resolvedStatusLabel =
    statusLabel(showcase);

  const publicUntilLabel =
    formatDate(
      showcase.activeUntil,
      language
    );

  /*
   * Avaliku galerii komponent vajab ainult
   * id, title ja images välju. Ülejäänud
   * adapteri välju galerii ei loe.
   */
  const galleryShowcase =
    {
      ...showcase,
      status: "published",
      activeUntil:
        showcase.activeUntil ||
        new Date(
          Date.now() + 60_000
        ).toISOString(),
    } as PublicProductShowcase;

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
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">
              {r(marketplaceMessage("showcase.product_showcase.bed0c2"))}</p>

            <h1 className="mt-3 break-words text-3xl font-black tracking-tight sm:text-4xl">
              {r(showcase.title)}
            </h1>

            {r(showcase.category ? (
              <p className="mt-2 break-words text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                {r(showcase.category)}
              </p>
            ) : null)}
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

        {r(resolvedStatusLabel !==
        marketplaceMessage("service.public.22d0d3") ? (
          <div className="mt-5 rounded-[20px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-blue-900">
            {r(marketplaceMessage("showcase.this_is_a_private_preview_for_the_active.2fd646"))}</div>
        ) : null)}

        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <div className="min-w-0">
            {r(showcase.images.length >
            0 ? (
              <PublicProfileProductShowcaseGallery
                showcase={galleryShowcase}
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
                {r(showcase.description ||
                  marketplaceMessage("service.no_description.5b24f9"))}
              </p>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[20px] border border-neutral-100 bg-[#fbfbfa] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                  {r(marketplaceMessage("horse.status.e99bbe"))}</p>

                <p className="mt-2 font-black">
                  {r(resolvedStatusLabel)}
                </p>
              </div>

              <div className="rounded-[20px] border border-neutral-100 bg-[#fbfbfa] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                  {r(marketplaceMessage("showcase.public_until.49aa7d"))}</p>

                <p className="mt-2 font-black">
                  {r(publicUntilLabel ||
                    marketplaceMessage("service.not_specified.530480"))}
                </p>
              </div>
            </section>

            {r(showcase.externalUrl ? (
              <a
                href={showcase.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:border-neutral-300"
              >
                {r(marketplaceMessage("showcase.more_information.a10a58"))}</a>
            ) : null)}
          </div>
        </div>
      </section>
    </div>
  );
}
