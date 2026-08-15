"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import { useAuth } from "../../../../lib/useAuth";
import {
  createListingCreateTextField,
  listingCreateFieldSourceLabel,
  updateListingCreateTextFieldByUser,
  type ListingCreateFieldSource,
} from "../model/fieldProvenance";
import {
  appendListingCreateImages,
  LISTING_CREATE_IMAGE_LIMIT,
  LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_MB,
  moveListingCreateImage,
} from "../model/imageSelection";

function formatFileSize(
  bytes: number
): string {
  const megabytes =
    bytes / 1024 / 1024;

  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`;
  }

  return `${Math.max(
    1,
    Math.round(bytes / 1024)
  )} KB`;
}

function FieldSourceBadge({
  source,
}: {
  source: ListingCreateFieldSource;
}) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
        source === "user"
          ? "bg-amber-100 text-amber-800"
          : source === "ai"
            ? "bg-violet-100 text-violet-800"
            : "bg-neutral-100 text-neutral-500",
      ].join(" ")}
    >
      {listingCreateFieldSourceLabel(
        source
      )}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <section className="h-56 animate-pulse rounded-[34px] bg-white shadow-sm" />

      <section className="h-96 animate-pulse rounded-[30px] bg-white shadow-sm" />
    </div>
  );
}

function LoginState() {
  return (
    <section className="rounded-[34px] border border-amber-200 bg-amber-50 p-7 text-center shadow-sm sm:p-10">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">
        Kuulutuse lisamine
      </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight">
        Logi kõigepealt sisse
      </h1>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
        Kuulutus kuulub aktiivsele
        identiteedile. Vormi kasutamiseks
        peab kasutaja olema sisse logitud.
      </p>

      <Link
        href="/auth"
        className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-black text-white"
      >
        Logi sisse
      </Link>
    </section>
  );
}

export default function
ListingCreatePage() {
  const {
    user,
    loading,
  } = useAuth();

  const [
    files,
    setFiles,
  ] = useState<File[]>([]);

  const [
    previewUrls,
    setPreviewUrls,
  ] = useState<string[]>([]);

  const [
    imageError,
    setImageError,
  ] = useState<string | null>(
    null
  );

  const [
    title,
    setTitle,
  ] = useState(
    createListingCreateTextField()
  );

  const [
    description,
    setDescription,
  ] = useState(
    createListingCreateTextField()
  );

  useEffect(() => {
    const urls = files.map((file) =>
      URL.createObjectURL(file)
    );

    setPreviewUrls(urls);

    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [files]);

  function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles =
      Array.from(
        event.target.files || []
      );

    event.target.value = "";

    if (
      selectedFiles.length === 0
    ) {
      return;
    }

    const result =
      appendListingCreateImages(
        files,
        selectedFiles
      );

    setFiles(result.files);
    setImageError(
      result.errors.length > 0
        ? result.errors.join(" ")
        : null
    );
  }

  function removeImage(
    index: number
  ) {
    setFiles((current) =>
      current.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );

    setImageError(null);
  }

  function moveImage(
    index: number,
    direction: "up" | "down"
  ) {
    setFiles((current) =>
      moveListingCreateImage(
        current,
        index,
        direction
      )
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!user) {
    return <LoginState />;
  }

  const hasTextContext =
    Boolean(title.value.trim()) ||
    Boolean(
      description.value.trim()
    );

  return (
    <div className="min-w-0 space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-amber-200 bg-amber-50 shadow-sm">
        <div className="border-t-4 border-amber-400 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.26em] text-amber-700">
                Uus kuulutus
              </p>

              <h1 className="mt-3 break-words text-4xl font-black tracking-tight sm:text-5xl">
                Lisa kuulutus pildist
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 sm:text-base">
                Kõigepealt lisa pildid.
                Pealkirja ja kirjelduse
                võid enne AI analüüsi
                kas tühjaks jätta või ise
                täita. Sinu kirjutatud
                teksti AI hiljem vaikides
                üle ei kirjuta.
              </p>
            </div>

            <Link
              href="/sell"
              className="inline-flex w-full shrink-0 justify-center rounded-full border border-amber-300 bg-white px-5 py-3 text-sm font-black text-amber-950 shadow-sm transition hover:bg-amber-100 lg:w-auto"
            >
              Ava praegune töötav lisamine
            </Link>
          </div>

          <p className="mt-5 rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-xs leading-5 text-amber-950/75">
            See V2 checkpoint ei salvesta,
            laadi üles ega avalda veel
            midagi. Praegune mobiili
            „Müü” nupp jääb seni turvaliselt
            vana töötava `/sell` voo peale.
          </p>
        </div>
      </section>

      <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
              Samm 1
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Lisa pildid
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Vali kuni
              {" "}
              {LISTING_CREATE_IMAGE_LIMIT}
              {" "}
              pilti. Esimene pilt on
              tulevane põhipilt.
            </p>
          </div>

          <span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
            {files.length}/
            {LISTING_CREATE_IMAGE_LIMIT}
            {" "}
            valitud
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-950 transition hover:bg-amber-100">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              multiple
              onChange={
                handleFileSelection
              }
              className="hidden"
            />

            Tee pilt
          </label>

          <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-black transition hover:bg-neutral-50">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={
                handleFileSelection
              }
              className="hidden"
            />

            Vali galeriist
          </label>
        </div>

        <p className="mt-3 text-xs leading-5 text-neutral-500">
          Lubatud on JPG, PNG ja WEBP.
          Ühe algfaili maksimaalne suurus
          on
          {" "}
          {LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_MB}
          {" "}
          MB.
        </p>

        {imageError ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
          >
            {imageError}
          </p>
        ) : null}

        {files.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-6 text-center">
            <p className="font-black">
              Pilte ei ole veel valitud
            </p>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              AI analüüs vajab vähemalt
              ühte pilti. Pealkiri ja
              kirjeldus on enne analüüsi
              valikulised.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {files.map(
              (file, index) => (
                <article
                  key={[
                    file.name,
                    file.size,
                    file.lastModified,
                    index,
                  ].join("-")}
                  className="min-w-0 overflow-hidden rounded-[22px] border border-black/5 bg-[#fbfbfa]"
                >
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    {previewUrls[index] ? (
                      <img
                        src={
                          previewUrls[index]
                        }
                        alt={
                          file.name ||
                          `Valitud pilt ${index + 1}`
                        }
                        className="h-full w-full object-contain"
                      />
                    ) : null}

                    {index === 0 ? (
                      <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-950 shadow-sm">
                        Põhipilt
                      </span>
                    ) : null}
                  </div>

                  <div className="p-3">
                    <p className="truncate text-sm font-black">
                      {file.name ||
                        `Pilt ${index + 1}`}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {formatFileSize(
                        file.size
                      )}
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          moveImage(
                            index,
                            "up"
                          )
                        }
                        disabled={
                          index === 0
                        }
                        aria-label="Liiguta pilt ettepoole"
                        className="rounded-xl border border-neutral-200 bg-white px-2 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        ←
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveImage(
                            index,
                            "down"
                          )
                        }
                        disabled={
                          index ===
                          files.length - 1
                        }
                        aria-label="Liiguta pilt tahapoole"
                        className="rounded-xl border border-neutral-200 bg-white px-2 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        →
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(index)
                        }
                        className="rounded-xl border border-red-100 bg-red-50 px-2 py-2 text-xs font-black text-red-700"
                      >
                        Eemalda
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            Samm 2
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Lisa soovi korral tekst
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            Need väljad on enne AI
            analüüsi valikulised.
            Iga sinu sisestatud sõna annab
            AI-le täpsema vihje õige
            kategooria leidmiseks.
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          <label
            className="rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4"
            data-listing-create-field-source={
              title.source
            }
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
                Pealkiri
              </span>

              <FieldSourceBadge
                source={title.source}
              />
            </span>

            <input
              value={title.value}
              onChange={(event) =>
                setTitle(
                  updateListingCreateTextFieldByUser(
                    event.target.value
                  )
                )
              }
              maxLength={140}
              placeholder="Näiteks BMW E39 vasak tagatuli"
              className="mt-3 w-full bg-transparent text-base font-black outline-none placeholder:text-neutral-300"
            />

            <span className="mt-2 block text-right text-xs font-black text-neutral-400">
              {title.value.length}/140
            </span>
          </label>

          <label
            className="rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4"
            data-listing-create-field-source={
              description.source
            }
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
                Kirjeldus
              </span>

              <FieldSourceBadge
                source={
                  description.source
                }
              />
            </span>

            <textarea
              value={
                description.value
              }
              onChange={(event) =>
                setDescription(
                  updateListingCreateTextFieldByUser(
                    event.target.value
                  )
                )
              }
              maxLength={5000}
              rows={6}
              placeholder="Näiteks vasak tagatuli, kasutatud, sobib BMW E39 sedaanile..."
              className="mt-3 w-full resize-y bg-transparent text-sm leading-7 outline-none placeholder:text-neutral-300"
            />

            <span className="mt-2 block text-right text-xs font-black text-neutral-400">
              {description.value.length}
              /5000
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-[30px] border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
              Järgmine eraldatud etapp
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-violet-950">
              Ühenda AI analüüs
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-violet-950/75">
              {files.length === 0
                ? "AI analüüsi käivitamiseks lisa vähemalt üks pilt."
                : hasTextContext
                  ? "Pildid ja sinu tekst on AI-le kontekstina valmis. AI saab kasutada mõlemat õige kategooria leidmiseks."
                  : "Pildid on kiire AI analüüsi jaoks valmis. AI saab tühjad pealkirja ja kirjelduse väljad ise välja pakkuda."}
            </p>
          </div>

          <span className="w-fit shrink-0 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-black text-violet-800">
            Veel ei saada AI-le
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-violet-100 bg-white/80 p-4">
            <p className="text-sm font-black text-violet-950">
              Tühi väli
            </p>

            <p className="mt-1 text-xs leading-5 text-violet-950/65">
              AI võib selle täita.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white/80 p-4">
            <p className="text-sm font-black text-violet-950">
              AI soovitus
            </p>

            <p className="mt-1 text-xs leading-5 text-violet-950/65">
              Uus analüüs võib seda
              värskendada.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white/80 p-4">
            <p className="text-sm font-black text-violet-950">
              Sinu tekst
            </p>

            <p className="mt-1 text-xs leading-5 text-violet-950/65">
              AI ei kirjuta seda
              vaikides üle.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
