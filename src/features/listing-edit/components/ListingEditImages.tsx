"use client";

import type { ListingImage, ProductListingDetail } from "../../../entities/listing/model/types";
import type { ListingEditImageActions } from "../model/useListingEditImages";
import { PlaceholderImage } from "./ListingEditPrimitives";

function getImageUrl(image: ListingImage): string | null {
  return image.original_url || image.medium_url || image.thumb_url || null;
}

export default function ListingEditImages({ listing, actions }: {
  listing: ProductListingDetail;
  actions: ListingEditImageActions;
}) {
  const { primarySavingId, deletingImageId, uploadingImage, imageError,
    handleSetPrimaryImage, handleDeleteImage, handleUploadImages } = actions;
  const mainImageUrl =
    listing.images.map(getImageUrl).find(Boolean) || listing.imageUrl;

  return (
          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              Pildid
            </p>

            {mainImageUrl ? (
              <img
                src={mainImageUrl}
                alt=""
                className="h-[260px] w-full rounded-[26px] bg-neutral-100 object-contain object-center md:h-[400px]"
              />
            ) : (
              <PlaceholderImage className="mt-5 h-80" />
            )}

            <div className="mt-4 grid max-w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {listing.images.map((image, index) => {
                const imageId = image.id ? String(image.id) : "";
                const isPrimary = Boolean(image.is_primary);
                const imageUrl =
                  image.thumb_url || image.medium_url || image.original_url || "";

                if (!imageId || !imageUrl) return null;

                return (
                  <div
                    key={imageId}
                    className="min-w-0 rounded-[22px] border border-black/5 bg-white p-2 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryImage(image)}
                      disabled={isPrimary || primarySavingId === imageId}
                      className="group relative block h-24 w-full overflow-hidden rounded-[16px] bg-neutral-100 disabled:cursor-default"
                      aria-label={
                        isPrimary
                          ? `Pilt ${index + 1} on esimene`
                          : `Tee pilt ${index + 1} esimeseks`
                      }
                    >
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-full w-full object-cover object-[center_36%] transition duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                      />

                      <span
                        className={[
                          "absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-black shadow-sm",
                          isPrimary
                            ? "bg-emerald-50 text-emerald-700"
                            : "hidden",
                        ].join(" ")}
                      >
                        {isPrimary ? "✓ Esimene" : ""}
                      </span>
                    </button>

                    <div className="mt-2 grid gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(image)}
                        disabled={isPrimary || primarySavingId === imageId}
                        className={[
                          "rounded-full border px-3 py-2 text-xs font-black transition disabled:cursor-default disabled:opacity-60",
                          isPrimary
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                        ].join(" ")}
                      >
                        {isPrimary
                          ? "✓ Esimene"
                          : primarySavingId === imageId
                            ? "Muudan..."
                            : "Esimeseks"}
                      </button>

                      {listing.images.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(image)}
                          disabled={deletingImageId === imageId}
                          className="rounded-full border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          {deletingImageId === imageId ? "Kustutan..." : "Kustuta"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="rounded-full border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs font-black text-neutral-300"
                        >
                          Viimane pilt
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {imageError ? (
              <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm leading-6 text-red-800">
                {imageError}
              </p>
            ) : null}

            <div className="mt-5">
              {(listing.images.length || 0) >= 10 ? (
                <button
                  disabled
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-5 py-3 text-sm font-black text-neutral-400"
                >
                  Maksimum 10 pilti lisatud
                </button>
              ) : (
                <label
                  className={[
                    "inline-flex cursor-pointer rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50",
                    uploadingImage ? "pointer-events-none opacity-60" : "",
                  ].join(" ")}
                >
                  {uploadingImage ? "Laadin pilte..." : "Lisa pildid"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploadingImage}
                    className="sr-only"
                    onChange={(event) => {
                      const files = Array.from(event.currentTarget.files || []);
                      event.currentTarget.value = "";
                      void handleUploadImages(files);
                    }}
                  />
                </label>
              )}

              <p className="mt-2 text-xs leading-5 text-neutral-400">
                Lubatud JPG, PNG ja WEBP. Võid valida mitu pilti korraga. Maksimaalne suurus 10 MB pildi kohta.
              </p>
            </div>
          </section>
  );
}
