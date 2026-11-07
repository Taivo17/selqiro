"use client";
import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingCreateMessages, translateListingCreateMessage } from "../model/listingCreateMessages";
import { useEffect, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { appendListingCreateImages, moveListingCreateImage, LISTING_CREATE_IMAGE_LIMIT,
  LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_MB, type ListingCreateImageIssue } from "../model/imageSelection";

function formatFileSize(bytes: number, language: string): string {
  const megabytes = bytes / 1024 / 1024;
  const amount = megabytes >= 1 ? megabytes : Math.max(1, Math.round(bytes / 1024));
  return `${new Intl.NumberFormat(localeForLanguage(language), {maximumFractionDigits: megabytes >= 1 ? 1 : 0}).format(amount)} ${megabytes >= 1 ? "MiB" : "KiB"}`;
}

export default function ListingCreateImageFields({ files, setFiles }: {
  files: File[]; setFiles: Dispatch<SetStateAction<File[]>>;
}) {
  const { language, t } = useV2Translation(listingCreateMessages);

  const [
    previewUrls,
    setPreviewUrls,
  ] = useState<string[]>([]);

  const [
    imageError,
    setImageError,
  ] = useState<ListingCreateImageIssue[]>([]);

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
      result.errors
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

    setImageError([]);
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


  return (
<section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">{t("stepTwo")}</p>

            <h2 className="mt-2 text-2xl font-black tracking-tight">{t("addImages")}</h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              {t("imagesHelp", { limit: LISTING_CREATE_IMAGE_LIMIT })}
          </p>
          </div>

          <span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
            {t("imagesSelected", { count: files.length, limit: LISTING_CREATE_IMAGE_LIMIT })}
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
            />{t("takePhoto")}</label>

          <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-black transition hover:bg-neutral-50">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={
                handleFileSelection
              }
              className="hidden"
            />{t("chooseGallery")}</label>
        </div>

        <p className="mt-3 text-xs leading-5 text-neutral-500">
          {t("imageFormatsHelp", { size: LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_MB })}
        </p>

        {imageError.length > 0 ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
          >
            {imageError.map(issue => { const reason = t(issue.key, issue.params); return issue.filename ? t("fileError", { filename: issue.filename, reason }) : reason; }).join(" ")}
          </p>
        ) : null}

        {files.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-6 text-center">
            <p className="font-black">{t("noSelectedImages")}</p>

            <p className="mt-2 text-sm leading-6 text-neutral-500">{t("chooseImagesHelp")}</p>
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
                          t("previewImage", { number: index + 1 })
                        }
                        className="h-full w-full object-contain"
                      />
                    ) : null}

                    {index === 0 ? (
                      <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-950 shadow-sm">{t("primaryImage")}</span>
                    ) : null}
                  </div>

                  <div className="p-3">
                    <p className="truncate text-sm font-black">
                      {file.name ||
                        t("selectedImage", { number: index + 1 })}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {formatFileSize(
                        file.size, language
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
                        aria-label={t("moveImageEarlier")}
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
                        aria-label={t("moveImageLater")}
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
                      >{t("remove")}</button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
  );
}
