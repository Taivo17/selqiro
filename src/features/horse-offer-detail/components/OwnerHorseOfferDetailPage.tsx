"use client";

import Link from "next/link";
import type {
  ReactNode,
} from "react";

import type {
  OwnerHorseOfferDetail,
} from "../../../entities/horse-offer/model/types";
import {
  useOwnerHorseOfferDetail,
} from "../model/useOwnerHorseOfferDetail";

type OwnerHorseOfferDetailPageProps = {
  offerId: string;
};

const OFFER_TYPE_LABELS: Record<
  string,
  string
> = {
  sale: "Müük",
  free_transfer: "Tasuta üleandmine",
  lease: "Rent",
  co_rider: "Kaasratsaniku otsing",
  wanted: "Otsin hobust",
};

const STATUS_LABELS: Record<
  string,
  string
> = {
  draft: "Mustand",
  pending_review: "Kontrollimisel",
  published: "Avaldatud",
  paused: "Peatatud",
  closed: "Lõpetatud",
  rejected: "Tagasi lükatud",
  archived: "Arhiveeritud",
};

const SEX_LABELS: Record<
  string,
  string
> = {
  mare: "Mära",
  gelding: "Ruun",
  stallion: "Täkk",
  unknown: "Täpsustamata",
};

function formatPrice(
  detail: OwnerHorseOfferDetail
): string {
  if (
    detail.offerType === "free_transfer" ||
    detail.priceType === "free"
  ) {
    return "Tasuta";
  }

  if (detail.priceAmount === null) {
    return detail.priceType === "contact"
      ? "Hind kokkuleppel"
      : "Hind lisamata";
  }

  try {
    return new Intl.NumberFormat(
      "et-EE",
      {
        style: "currency",
        currency:
          detail.currency || "EUR",
        maximumFractionDigits: 2,
      }
    ).format(detail.priceAmount);
  } catch {
    return `${detail.priceAmount} ${
      detail.currency || "EUR"
    }`;
  }
}

function formatDate(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "et-EE",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function getStatusClassName(
  status: string
): string {
  switch (status) {
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "pending_review":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "paused":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "closed":
    case "archived":
      return "border-zinc-300 bg-zinc-100 text-zinc-700";
    default:
      return "border-zinc-300 bg-white text-zinc-700";
  }
}

function DetailCard({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
          {eyebrow}
        </p>
      ) : null}

      <h2 className="mt-2 text-xl font-semibold text-zinc-950">
        {title}
      </h2>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function DetailValue({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
}) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return (
    <div className="min-w-0 rounded-2xl border border-black/8 bg-zinc-50 px-4 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-zinc-900">
        {value}
      </dd>
    </div>
  );
}

function LoadingState() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-7 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-5">
        <div className="h-10 w-64 rounded-full bg-zinc-200" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div className="h-[520px] rounded-[28px] bg-zinc-200" />
          <div className="h-[420px] rounded-[28px] bg-zinc-200" />
        </div>
      </div>
    </main>
  );
}

function EmptyOrErrorState({
  errorMessage,
  isNotFound,
  onRetry,
}: {
  errorMessage: string | null;
  isNotFound: boolean;
  onRetry: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-10 sm:px-6">
      <div className="rounded-[28px] border border-black/10 bg-white p-6 text-center shadow-sm sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">
          Omanikuvaade
        </p>

        <h1 className="mt-3 text-2xl font-semibold text-zinc-950 sm:text-3xl">
          {isNotFound
            ? "Hobusepakkumist ei leitud"
            : "Hobusepakkumist ei saanud laadida"}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-600">
          {isNotFound
            ? "Pakkumist ei ole olemas või see ei kuulu praegu aktiivsele identiteedile."
            : errorMessage ||
              "Laadimisel tekkis ootamatu viga."}
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {!isNotFound ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
            >
              Proovi uuesti
            </button>
          ) : null}

          <Link
            href="/v2/my-area"
            className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Tagasi Minu alasse
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function OwnerHorseOfferDetailPage({
  offerId,
}: OwnerHorseOfferDetailPageProps) {
  const {
    detail,
    errorMessage,
    isLoading,
    isNotFound,
    reload,
  } = useOwnerHorseOfferDetail(offerId);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!detail) {
    return (
      <EmptyOrErrorState
        errorMessage={errorMessage}
        isNotFound={isNotFound}
        onRetry={reload}
      />
    );
  }

  const title =
    detail.title.trim() ||
    detail.horseName?.trim() ||
    "Pealkirjata hobusepakkumine";
  const locationLabel =
    [
      detail.city,
      detail.region,
    ]
      .filter(
        (
          value
        ): value is string =>
          Boolean(value?.trim())
      )
      .join(" · ") ||
    "Asukoht lisamata";
  const offerTypeLabel =
    OFFER_TYPE_LABELS[
      detail.offerType
    ] || detail.offerType;
  const statusLabel =
    STATUS_LABELS[detail.status] ||
    detail.status;
  const activeUntil =
    formatDate(detail.activeUntil);
  const createdAt =
    formatDate(detail.createdAt);
  const updatedAt =
    formatDate(detail.updatedAt);

  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8"
      data-owner-horse-offer-id={
        detail.offerId
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/v2/my-area"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
          >
            <span aria-hidden="true">
              ←
            </span>
            Tagasi Minu alasse
          </Link>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">
            Omanikuvaade · ainult sulle
          </p>

          <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            {title}
          </h1>

          <p className="mt-3 text-sm text-zinc-600">
            {offerTypeLabel}
            {" · "}
            {locationLabel}
          </p>
        </div>

        <span
          className={`inline-flex w-fit shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${getStatusClassName(
            detail.status
          )}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
        See detailvaade on praegu ainult
        lugemiseks. Muutmine, avaldamine ja
        staatuse tegevused lisanduvad eraldi
        kontrollitud etappides.
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="space-y-6">
          <DetailCard
            eyebrow="Hobusepakkumine"
            title="Põhiinfo"
          >
            <div className="overflow-hidden rounded-[22px] border border-black/8 bg-zinc-100">
              {detail.imageUrl ? (
                <img
                  src={detail.imageUrl}
                  alt={title}
                  className="aspect-[4/3] w-full object-contain"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center text-sm font-medium text-zinc-500">
                  Pilt puudub
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-2xl font-semibold text-zinc-950">
                {formatPrice(detail)}
              </p>

              <p className="text-xs text-zinc-500">
                {detail.images.length === 1
                  ? "1 pilt"
                  : `${detail.images.length} pilti`}
              </p>
            </div>

            {detail.description.trim() ? (
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                {detail.description}
              </p>
            ) : (
              <p className="mt-5 text-sm text-zinc-500">
                Kirjeldus on lisamata.
              </p>
            )}
          </DetailCard>

          <DetailCard
            eyebrow="Hobuse andmed"
            title="Põhiomadused"
          >
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailValue
                label="Hobuse nimi"
                value={detail.horseName}
              />
              <DetailValue
                label="Sünniaasta"
                value={detail.birthYear}
              />
              <DetailValue
                label="Sugu"
                value={
                  detail.sex
                    ? SEX_LABELS[
                        detail.sex
                      ] || detail.sex
                    : null
                }
              />
              <DetailValue
                label="Tõug"
                value={detail.breed}
              />
              <DetailValue
                label="Värvus"
                value={detail.color}
              />
              <DetailValue
                label="Turjakõrgus"
                value={
                  detail.heightCm === null
                    ? null
                    : `${detail.heightCm} cm`
                }
              />
            </dl>
          </DetailCard>

          <DetailCard
            eyebrow="Kasutus ja sobivus"
            title="Treening ja sobivus"
          >
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailValue
                label="Distsipliin"
                value={detail.discipline}
              />
              <DetailValue
                label="Treeningutase"
                value={detail.trainingLevel}
              />
            </dl>

            {detail.suitability ? (
              <div className="mt-4 rounded-2xl border border-black/8 bg-zinc-50 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Sobivus
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {detail.suitability}
                </p>
              </div>
            ) : null}
          </DetailCard>

          <DetailCard
            eyebrow="Avaldaja kirjeldus"
            title="Tervis ja käitumine"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-black/8 bg-zinc-50 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Tervis
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {detail.healthNotes ||
                    "Terviseinfot ei ole lisatud."}
                </p>
              </div>

              <div className="rounded-2xl border border-black/8 bg-zinc-50 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Käitumine
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {detail.behaviorNotes ||
                    "Käitumisinfot ei ole lisatud."}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-500">
              Need on pakkumise avaldaja
              sisestatud andmed. Selqiro ei
              kinnita selles vaates tervise,
              omandi ega dokumentide õigsust.
            </p>
          </DetailCard>
        </div>

        <aside className="space-y-6">
          <DetailCard
            eyebrow="Kokkuvõte"
            title="Pakkumise seis"
          >
            <dl className="grid gap-3">
              <DetailValue
                label="Pakkumise liik"
                value={offerTypeLabel}
              />
              <DetailValue
                label="Staatus"
                value={statusLabel}
              />
              <DetailValue
                label="Hind"
                value={formatPrice(detail)}
              />
              <DetailValue
                label="Avalik asukoht"
                value={locationLabel}
              />
              <DetailValue
                label="Aktiivne kuni"
                value={activeUntil}
              />
            </dl>
          </DetailCard>

          <DetailCard
            eyebrow="Omaniku metaandmed"
            title="Ajalugu"
          >
            <dl className="grid gap-3">
              <DetailValue
                label="Loodud"
                value={createdAt}
              />
              <DetailValue
                label="Viimati muudetud"
                value={updatedAt}
              />
              <DetailValue
                label="Pakkumise ID"
                value={detail.offerId}
              />
            </dl>
          </DetailCard>

          <div className="rounded-[28px] border border-black/10 bg-zinc-950 p-5 text-white shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Järgmised etapid
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              Haldustegevused lisanduvad eraldi
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Detaili muutmine, avaldamine,
              peatamine, sulgemine, rubriigid ja
              pildihaldus vajavad oma serveri- ja
              kasutajaliidese lepingut.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
