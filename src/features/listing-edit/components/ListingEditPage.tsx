"use client";

import { useState } from "react";
import Link from "next/link";
import { useEditableListing } from "../model/useEditableListing";
import { useListingBasicsForm } from "../model/useListingBasicsForm";
import { setListingPrimaryImage } from "../../../entities/listing/api/setListingPrimaryImage";
import { deleteListingImage } from "../../../entities/listing/api/deleteListingImage";
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


function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block rounded-2xl bg-[#fbfbfa] p-4">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent text-base font-black outline-none placeholder:text-neutral-300"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block rounded-2xl bg-[#fbfbfa] p-4">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full bg-transparent text-base font-black outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl bg-[#fbfbfa] p-4">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={6}
        className="mt-3 w-full resize-none bg-transparent text-base leading-7 outline-none placeholder:text-neutral-300"
      />
    </label>
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


function formatDateTimeLabel(value: string | null | undefined): string {
  if (!value) return "Puudub";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("et-EE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
  const { listing, activeIdentity, userId, loading, error, status } =
    useEditableListing(listingId);

  const basicsForm = useListingBasicsForm({
    listing,
    userId,
    activeIdentityId: activeIdentity?.id || null,
  });

  const [primarySavingId, setPrimarySavingId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  async function handleSetPrimaryImage(image: ListingImage) {
    const listingIdForUpdate = listing?.id;
    const imageIdForUpdate = image.id ? String(image.id) : "";

    if (!listingIdForUpdate || !imageIdForUpdate) return;

    setPrimarySavingId(imageIdForUpdate);
    setImageError(null);

    try {
      await setListingPrimaryImage({
        listingId: listingIdForUpdate,
        imageId: imageIdForUpdate,
      });

      window.location.reload();
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : "Põhipildi muutmine ebaõnnestus."
      );
    } finally {
      setPrimarySavingId(null);
    }
  }

  async function handleDeleteImage(image: ListingImage) {
    const listingIdForUpdate = listing?.id;
    const imageIdForUpdate = image.id ? String(image.id) : "";

    if (!listingIdForUpdate || !imageIdForUpdate) return;

    if ((listing?.images.length || 0) <= 1) {
      setImageError("Viimast pilti ei saa kustutada.");
      return;
    }

    const confirmed = window.confirm("Kas kustutada see pilt kuulutuselt?");

    if (!confirmed) return;

    setDeletingImageId(imageIdForUpdate);
    setImageError(null);

    try {
      await deleteListingImage({
        listingId: listingIdForUpdate,
        imageId: imageIdForUpdate,
      });

      window.location.reload();
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : "Pildi kustutamine ebaõnnestus."
      );
    } finally {
      setDeletingImageId(null);
    }
  }

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
              {basicsForm.form.title || listing.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              Muuta saab pealkirja, kirjeldust, hinda ja seisukorda.
              Pildid, kategooria ja asukoht tulevad järgmistes etappides.
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

            {listing.images.length > 1 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {listing.images.map((image, index) => {
                  const imageId = image.id ? String(image.id) : "";
                  const isPrimary = Boolean(image.is_primary);

                  if (!imageId) return null;

                  return (
                    <button
                      key={imageId}
                      type="button"
                      onClick={() => handleSetPrimaryImage(image)}
                      disabled={primarySavingId === imageId}
                      className={[
                        "rounded-full border px-4 py-2 text-xs font-black transition",
                        isPrimary
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-neutral-200 bg-white text-neutral-700 shadow-sm hover:bg-neutral-50",
                        primarySavingId === imageId ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      {isPrimary
                        ? `Pilt ${index + 1} · esimene`
                        : primarySavingId === imageId
                          ? "Muudan..."
                          : `Tee pilt ${index + 1} esimeseks`}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {listing.images.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.images.map((image, index) => {
                  const imageId = image.id ? String(image.id) : "";

                  if (!imageId) return null;

                  return (
                    <button
                      key={`delete-${imageId}`}
                      type="button"
                      onClick={() => handleDeleteImage(image)}
                      disabled={deletingImageId === imageId}
                      className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      {deletingImageId === imageId
                        ? "Kustutan..."
                        : `Kustuta pilt ${index + 1}`}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-neutral-400">
                Viimast pilti ei saa kustutada.
              </p>
            )}

            {imageError ? (
              <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm leading-6 text-red-800">
                {imageError}
              </p>
            ) : null}

            <button
              disabled
              className="mt-5 rounded-full border border-neutral-200 bg-neutral-50 px-5 py-3 text-sm font-black text-neutral-400"
            >
              Pildi lisamine hiljem
            </button>
          </section>

          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Põhiandmed
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <TextField
                label="Pealkiri"
                value={basicsForm.form.title}
                onChange={(value) => basicsForm.setField("title", value)}
              />
              <TextField
                label="Hind"
                value={basicsForm.form.price}
                onChange={(value) => basicsForm.setField("price", value)}
                placeholder="Näiteks 120 €"
              />
              <SelectField
                label="Seisukord"
                value={basicsForm.form.condition}
                onChange={(value) => basicsForm.setField("condition", value)}
                options={[
                  { value: "new", label: "Uus" },
                  { value: "used", label: "Kasutatud" },
                  { value: "damaged", label: "Vajab remonti" },
                ]}
              />
              <FieldPreview label="Kategooria" value={listing.category} />
              <FieldPreview label="Alamkategooria" value={listing.subcategory} />
              <FieldPreview label="Asukoht" value={listing.locationLabel} />
              <FieldPreview label="Aegub" value={formatDateTimeLabel(listing.activeUntil)} />
            </div>
          </section>

          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Kirjeldus
            </p>

            <TextAreaField
              label="Kirjeldus"
              value={basicsForm.form.description}
              onChange={(value) => basicsForm.setField("description", value)}
            />
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
              onClick={basicsForm.save}
              disabled={!basicsForm.canSave}
              className="mt-5 w-full rounded-full bg-black px-5 py-3 text-sm font-black text-white disabled:bg-neutral-200 disabled:text-neutral-500"
            >
              {basicsForm.saving
                ? "Salvestan..."
                : basicsForm.dirty
                  ? "Salvesta muudatused"
                  : "Muudatusi pole"}
            </button>

            {basicsForm.saveError ? (
              <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm leading-6 text-red-800">
                {basicsForm.saveError}
              </p>
            ) : null}

            {basicsForm.saved ? (
              <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                Salvestatud.
              </p>
            ) : null}

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
              Pildid, asukoht ja kategooria
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-900">
              Need lisame eraldi moodulitena, et edit-vaade jääks töökindlaks.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}
