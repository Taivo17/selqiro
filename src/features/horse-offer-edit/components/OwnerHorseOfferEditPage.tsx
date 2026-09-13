"use client";

import Link from "next/link";

import HorseOfferBasicFields from "../../listing-create/components/HorseOfferBasicFields";
import HorseOfferDisclosureFields from "../../listing-create/components/HorseOfferDisclosureFields";
import HorseOfferLocationFields from "../../listing-create/components/HorseOfferLocationFields";
import HorseOfferPriceFields from "../../listing-create/components/HorseOfferPriceFields";
import HorseOfferUseFields from "../../listing-create/components/HorseOfferUseFields";
import {
  useOwnerHorseOfferEditForm,
} from "../model/useOwnerHorseOfferEditForm";

type OwnerHorseOfferEditPageProps = {
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
  held_for_review: "Kontrolliootel",
  published: "Avaldatud",
  paused: "Peatatud",
  closed: "Lõpetatud",
  rejected: "Tagasi lükatud",
  archived: "Arhiveeritud",
};

function LoadingState() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-5">
        <div className="h-9 w-72 rounded-full bg-zinc-200" />
        <div className="h-28 rounded-[28px] bg-zinc-200" />
        <div className="h-[520px] rounded-[28px] bg-zinc-200" />
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
      <div className="rounded-[28px] border border-black/10 bg-white p-7 text-center shadow-sm sm:p-10">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
          Hobusepakkumise muutmisvaade
        </p>

        <h1 className="mt-3 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
          {isNotFound
            ? "Hobusepakkumist ei leitud"
            : "Muutmisvaadet ei saanud laadida"}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-600">
          {isNotFound
            ? "Pakkumist ei ole olemas või see ei kuulu praegu aktiivsele identiteedile."
            : errorMessage
              || "Laadimisel tekkis ootamatu viga."}
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {!isNotFound ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-black text-zinc-950 shadow-sm transition hover:bg-zinc-50"
            >
              Proovi uuesti
            </button>
          ) : null}

          <Link
            href="/v2/my-area"
            className="rounded-full bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
          >
            Tagasi Minu alasse
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function OwnerHorseOfferEditPage({
  offerId,
}: OwnerHorseOfferEditPageProps) {
  const {
    detail,
    errorMessage,
    form,
    isLoading,
    isNotFound,
    reload,
  } = useOwnerHorseOfferEditForm(
    offerId
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (!detail || !form) {
    return (
      <EmptyOrErrorState
        errorMessage={errorMessage}
        isNotFound={isNotFound}
        onRetry={reload}
      />
    );
  }

  const title =
    detail.title.trim()
    || detail.horseName?.trim()
    || "Pealkirjata hobusepakkumine";
  const offerTypeLabel =
    OFFER_TYPE_LABELS[form.offerType]
    || form.offerType;
  const statusLabel =
    STATUS_LABELS[detail.status]
    || detail.status;
  const detailHref =
    `/v2/my-area/horse-offers/${encodeURIComponent(
      detail.offerId
    )}`;

  return (
    <main
      className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-8"
      data-owner-horse-offer-edit-id={
        form.offerId
      }
      data-owner-horse-offer-edit-mode="read-only"
      data-owner-horse-offer-edit-hydrated="true"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-2 text-sm font-black text-zinc-600 transition hover:text-zinc-950"
          >
            <span aria-hidden="true">←</span>
            Tagasi pakkumise vaatesse
          </Link>

          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
            Muutmisvaade · ainult lugemiseks
          </p>

          <h1 className="mt-2 break-words text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
            {title}
          </h1>

          <p className="mt-3 text-sm text-zinc-600">
            {offerTypeLabel}
            {" · "}
            {statusLabel}
          </p>
        </div>

        <span className="inline-flex w-fit shrink-0 rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-black text-zinc-700">
          Ainult vaade
        </span>
      </div>

      <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
        Olemasolevad andmed on laaditud
        omaniku detaillepingust vormi
        väljadele. Selles etapis ei saa
        midagi muuta ega salvestada.
      </div>

      <section className="mt-6 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
          Pildid
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">
          Praegune pildijärjestus
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Pildid on selles vaates ainult
          kontrollimiseks. Lisamine,
          kustutamine ja esipildi muutmine
          tulevad eraldi etapina.
        </p>

        {detail.images.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detail.images.map((image) => (
              <figure
                key={image.id}
                className="overflow-hidden rounded-[20px] border border-neutral-200 bg-[#fbfbfa]"
              >
                <img
                  src={image.url}
                  alt={title}
                  className="aspect-[4/3] w-full object-contain"
                />
                <figcaption className="flex items-center justify-between gap-3 px-4 py-3 text-xs font-black text-neutral-500">
                  <span>
                    Järjekord {image.sortOrder + 1}
                  </span>
                  {image.isPrimary ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">
                      Esipilt
                    </span>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="mt-5 flex aspect-[16/7] items-center justify-center rounded-[20px] border border-neutral-200 bg-[#fbfbfa] text-sm font-bold text-neutral-500">
            Pilte ei ole lisatud
          </div>
        )}
      </section>

      <fieldset
        disabled
        aria-disabled="true"
        className="mt-6 space-y-6 [&_input]:disabled:cursor-not-allowed [&_input]:disabled:opacity-100 [&_select]:disabled:cursor-not-allowed [&_select]:disabled:opacity-100 [&_textarea]:disabled:cursor-not-allowed [&_textarea]:disabled:opacity-100"
      >
        <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            Pakkumise tekst
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Pealkiri ja kirjeldus
          </h2>

          <div className="mt-5 grid gap-4">
            <label className="rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
                Pealkiri
              </span>
              <input
                type="text"
                value={form.title}
                readOnly
                className="mt-3 w-full bg-transparent text-base font-bold outline-none"
              />
            </label>

            <label className="rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
                Kirjeldus
              </span>
              <textarea
                value={form.description}
                readOnly
                rows={6}
                className="mt-3 w-full resize-none bg-transparent text-base font-medium leading-7 outline-none"
              />
            </label>
          </div>
        </section>

        <HorseOfferBasicFields
          offerType={form.offerType}
          value={form.basicFields}
          onChange={() => undefined}
        />

        <HorseOfferUseFields
          offerType={form.offerType}
          value={form.useFields}
          onSpecificChange={() => undefined}
          onWantedChange={() => undefined}
        />

        <HorseOfferDisclosureFields
          offerType={form.offerType}
          value={form.disclosureFields}
          onSpecificChange={() => undefined}
          onWantedChange={() => undefined}
        />

        <HorseOfferPriceFields
          offerType={form.offerType}
          value={form.priceFields}
          onChange={() => undefined}
        />

        <HorseOfferLocationFields
          offerType={form.offerType}
          value={form.locationFields}
          onChange={() => undefined}
        />
      </fieldset>

      <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-black/10 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-zinc-950">
            Salvestamine lisandub järgmises etapis
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Järgmine eraldatud patch ühendab
            ainult mustandi salvestamise
            olemasoleva turvalise RPC kaudu.
          </p>
        </div>

        <button
          type="button"
          disabled
          className="rounded-full border border-zinc-300 bg-zinc-100 px-5 py-3 text-sm font-black text-zinc-500"
        >
          Salvestamine pole veel aktiivne
        </button>
      </div>
    </main>
  );
}
