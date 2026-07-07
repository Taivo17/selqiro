"use client";

import Link from "next/link";
import { useEditableListing } from "../model/useEditableListing";
import type { ListingImage, ProductListingDetail } from "../../../entities/listing/model/types";

function getImageUrl(image: ListingImage): string | null {
  return image.medium_url || image.original_url || image.thumb_url || null;
}

function PlaceholderImage({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-[22px] bg-gradient-to-br from-neutral-100 to-neutral-200",
        className,
      ].join(" ")}
    />
  );
}

function FieldPreview({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl bg-[#fbfbfa] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 font-black">{value || "Puudub"}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-8 shadow-sm">
      <div className="h-8 w-64 rounded-full bg-neutral-100" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <PlaceholderImage className="h-80" />
        <div className="space-y-3">
          <div className="h-24 rounded-2xl bg-neutral-100" />
          <div className="h-24 rounded-2xl bg-neutral-100" />
          <div className="h-24 rounded-2xl bg-neutral-100" />
        </div>
      </div>
    </section>
  );
}

function MessageState({
  title,
  text,
  actionHref,
  actionLabel,
}: {
  title: string;
  text: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
        {text}
      </p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      >
        {actionLabel}
      </Link>
    </section>
  );
}

function DetailsPreview({ listing }: { listing: ProductListingDetail }) {
  const details = Object.entries(listing.details || {}).slice(0, 8);

  if (details.length === 0) {
    return (
      <p className="mt-4 text-sm leading-6 text-neutral-500">
        Detailvälju ei ole lisatud.
      </p>
    );
  }

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {details.map(([key, value]) => (
        <FieldPreview
          key={key}
          label={key.replace(/_/g, " ")}
          value={
            typeof value === "string" || typeof value === "number"
              ? value
              : JSON.stringify(value)
          }
        />
      ))}
    </div>
  );
}

export default function ListingEditPage({ listingId }: { listingId: string }) {
  const { listing, activeIdentity, loading, error, status } =
    useEditableListing(listingId);

  if (loading || status === "loading") {
    return <LoadingState />;
  }

  if (error) {
    return (
      <MessageState
        title="Muutmise vaadet ei saanud laadida"
        text={error}
        actionHref="/v2/my-area"
        actionLabel="Tagasi Minu alasse"
      />
    );
  }

  if (status === "not_authenticated") {
    return (
      <MessageState
        title="Logi sisse"
        text="Kuulutuse muutmiseks pead olema sisse logitud."
        actionHref="/auth"
        actionLabel="Logi sisse"
      />
    );
  }

  if (status === "not_found") {
    return (
      <MessageState
        title="Kuulutust ei leitud"
        text="See kuulutus võib olla eemaldatud või ei ole enam saadaval."
        actionHref="/v2/my-area"
        actionLabel="Tagasi Minu alasse"
      />
    );
  }

  if (status === "forbidden") {
    return (
      <MessageState
        title="Sul ei ole õigust seda kuulutust muuta"
        text="Muutmise vaade avaneb ainult kuulutuse omanikule või aktiivsele identiteedile."
        actionHref="/v2/my-area"
        actionLabel="Tagasi Minu alasse"
      />
    );
  }

  if (!listing) {
    return (
      <MessageState
        title="Kuulutust ei leitud"
        text="Kuulutuse andmeid ei õnnestunud laadida."
        actionHref="/v2/my-area"
        actionLabel="Tagasi Minu alasse"
      />
    );
  }

  const mainImageUrl =
    listing.images.map(getImageUrl).find(Boolean) || listing.imageUrl;

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
              Kuulutuse muutmine
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              {listing.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              See on esimene V2 edit-vaate skeleton. Omaniku kontroll töötab,
              aga salvestamine ja piltide muutmine tulevad järgmistes etappides.
            </p>
          </div>

          <div className="rounded-[24px] bg-neutral-950 p-5 text-white md:w-[320px]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">
              Aktiivne identiteet
            </p>
            <p className="mt-2 text-2xl font-black">
              {activeIdentity?.displayName || "Puudub"}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Seda kuulutust saab muuta ainult õige omanik / identiteet.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Pildid
            </p>

            {mainImageUrl ? (
              <img
                src={mainImageUrl}
                alt=""
                className="mt-5 h-80 w-full rounded-[26px] object-cover"
              />
            ) : (
              <PlaceholderImage className="mt-5 h-80" />
            )}

            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {listing.images.length > 0
                ? listing.images.map((image, index) => {
                    const url = getImageUrl(image);

                    return url ? (
                      <img
                        key={image.id || index}
                        src={url}
                        alt=""
                        className="h-20 w-24 shrink-0 rounded-[18px] object-cover"
                      />
                    ) : null;
                  })
                : null}
            </div>

            <button
              disabled
              className="mt-5 rounded-full border border-neutral-200 bg-neutral-50 px-5 py-3 text-sm font-black text-neutral-400"
            >
              Piltide muutmine hiljem
            </button>
          </section>

          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Põhiandmed
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <FieldPreview label="Pealkiri" value={listing.title} />
              <FieldPreview label="Hind" value={listing.priceLabel} />
              <FieldPreview label="Staatus" value={listing.isHighlighted ? "Esiletõstetud" : "Tavaline"} />
              <FieldPreview label="Seisukord" value={listing.condition} />
              <FieldPreview label="Kategooria" value={listing.category} />
              <FieldPreview label="Alamkategooria" value={listing.subcategory} />
              <FieldPreview label="Asukoht" value={listing.locationLabel} />
              <FieldPreview label="Aegub" value={listing.activeUntil} />
            </div>
          </section>

          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Kirjeldus
            </p>

            <p className="mt-4 text-base leading-8 text-neutral-700">
              {listing.description || "Kirjeldust ei ole lisatud."}
            </p>
          </section>

          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Detailid
            </p>

            <DetailsPreview listing={listing} />
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Tegevused
            </p>

            <button
              disabled
              className="mt-5 w-full rounded-full bg-neutral-200 px-5 py-3 text-sm font-black text-neutral-500"
            >
              Salvesta hiljem
            </button>

            <Link
              href={`/v2/listing/${listing.id}`}
              className="mt-3 inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm"
            >
              Vaata avalikku vaadet
            </Link>

            <Link
              href="/v2/my-area"
              className="mt-3 inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm"
            >
              Tagasi Minu alasse
            </Link>
          </section>

          <section className="rounded-[30px] border border-blue-100 bg-blue-50 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-500">
              Järgmine etapp
            </p>
            <h2 className="mt-2 text-xl font-black text-blue-950">
              Põhiandmete salvestamine
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-900">
              Järgmises etapis lisame turvalise salvestuse pealkirjale,
              kirjeldusele, hinnale, seisukorrale ja staatusele.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}
