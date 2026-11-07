"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  deleteProductShowcaseImage,
  getProductShowcaseImages,
  setProductShowcasePrimaryImage,
  uploadProductShowcaseImage,
} from "../../../entities/product-showcase/api/productShowcaseImages";
import {
  getProductShowcaseImageUrl,
  type ProductShowcaseImage,
} from "../../../entities/product-showcase/model/image";
import {
  CONTENT_IMAGE_ACCEPT,
  CONTENT_IMAGE_LIMIT,
} from "../../../shared/media/imageRules";

type ProductShowcaseImageManagerProps = {
  showcaseId: string;
  status?: string | null;
  onChanged?: () => void;
};

function errorMessage(
  error: unknown,
  fallback: string
): string {
  return safeMarketplaceError(error, fallback);
}

function ImagePlaceholder({
  className = "",
}: {
  className?: string;
}) {
  const { language, r } = useMarketplaceTranslation();
  return (
    <div
      className={[
        "bg-gradient-to-br",
        "from-neutral-100",
        "to-neutral-200",
        className,
      ].join(" ")}
      aria-hidden="true"
    />
  );
}

export default function ProductShowcaseImageManager({
  showcaseId,
  status,
  onChanged,
}: ProductShowcaseImageManagerProps) {
  const { language, r } = useMarketplaceTranslation();
  const [
    images,
    setImages,
  ] = useState<ProductShowcaseImage[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    actionImageId,
    setActionImageId,
  ] = useState<string | null>(null);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    notice,
    setNotice,
  ] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadImages() {
      setLoading(true);
      setError(null);

      try {
        const nextImages =
          await getProductShowcaseImages(
            showcaseId
          );

        if (!mounted) return;

        setImages(nextImages);
      } catch (loadError) {
        if (!mounted) return;

        setImages([]);
        setError(
          errorMessage(
            loadError,
            marketplaceMessage("showcase.the_product_showcase_images_could_not_be_loaded.2cb0dc")
          )
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadImages();

    return () => {
      mounted = false;
    };
  }, [showcaseId]);

  const primaryImage = useMemo(
    () =>
      images.find(
        (image) => image.isPrimary
      ) ||
      images[0] ||
      null,
    [images]
  );

  const primaryImageUrl =
    primaryImage
      ? getProductShowcaseImageUrl(
          primaryImage
        )
      : "";

  const busy =
    uploading ||
    Boolean(actionImageId);

  const remainingSlots =
    Math.max(
      0,
      CONTENT_IMAGE_LIMIT -
        images.length
    );

  async function refreshImages(
    successMessage: string
  ) {
    const nextImages =
      await getProductShowcaseImages(
        showcaseId
      );

    setImages(nextImages);
    setNotice(successMessage);
    onChanged?.();
  }

  async function handleUpload(
    selectedFiles: File[]
  ) {
    if (
      uploading ||
      selectedFiles.length === 0
    ) {
      return;
    }

    setError(null);
    setNotice(null);

    if (remainingSlots <= 0) {
      setError(
        marketplaceMessage("showcase.a_product_showcase_can_have_up_to.2e1638") +
          marketplaceMessage("showcase.value_images.a82b8e", { p0: String(CONTENT_IMAGE_LIMIT) })
      );
      return;
    }

    if (
      selectedFiles.length >
      remainingSlots
    ) {
      setError(
        marketplaceMessage("showcase.you_can_add.4702ce") +
          marketplaceMessage("showcase.value_images.a82b8e", { p0: String(remainingSlots) })
      );
      return;
    }

    setUploading(true);

    let uploadedCount = 0;

    try {
      for (
        const file of selectedFiles
      ) {
        await uploadProductShowcaseImage({
          showcaseId,
          file,
        });

        uploadedCount += 1;
      }

      await refreshImages(
        uploadedCount === 1
          ? marketplaceMessage("showcase.image_added.f9fcd3")
          : marketplaceMessage("showcase.value_images_added.bb9dad", { p0: String(uploadedCount) })
      );
    } catch (uploadError) {
      try {
        const nextImages =
          await getProductShowcaseImages(
            showcaseId
          );

        setImages(nextImages);
      } catch {
        // Säilitame algse veateate.
      }

      const message =
        errorMessage(
          uploadError,
          marketplaceMessage("showcase.the_image_could_not_be_added.9c6459")
        );

      setError(
        uploadedCount > 0
          ? marketplaceMessage("showcase.value_images_were_added.cbef5c", { p0: String(uploadedCount) }) +
              marketplaceMessage("showcase.but_the_next_image.e49e90") +
              marketplaceMessage("showcase.could_not_be_added.ca74dc") +
              message
          : message
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSetPrimary(
    image: ProductShowcaseImage
  ) {
    if (
      image.isPrimary ||
      actionImageId
    ) {
      return;
    }

    setActionImageId(
      `primary:${image.id}`
    );
    setError(null);
    setNotice(null);

    try {
      await setProductShowcasePrimaryImage({
        showcaseId,
        imageId: image.id,
      });

      await refreshImages(
        marketplaceMessage("showcase.main_image_changed.48227d")
      );
    } catch (primaryError) {
      setError(
        errorMessage(
          primaryError,
          marketplaceMessage("showcase.the_main_image_could_not_be_changed.9d1e42")
        )
      );
    } finally {
      setActionImageId(null);
    }
  }

  async function handleDelete(
    image: ProductShowcaseImage
  ) {
    if (actionImageId) {
      return;
    }

    if (
      status === "published" &&
      images.length <= 1
    ) {
      setError(
        marketplaceMessage("showcase.the_last_image_of_a_published.02d42a") +
          marketplaceMessage("showcase.product_showcase_cannot_be_deleted.fc806f")
      );
      return;
    }

    const confirmed =
      window.confirm(r(marketplaceMessage("showcase.delete_this_image.92881c") +
          marketplaceMessage("showcase.from_the_product_showcase.313660")));

    if (!confirmed) {
      return;
    }

    setActionImageId(
      `delete:${image.id}`
    );
    setError(null);
    setNotice(null);

    try {
      const result =
        await deleteProductShowcaseImage({
          showcaseId,
          imageId: image.id,
        });

      await refreshImages(
        result.storageCleanupFailed
          ? marketplaceMessage("showcase.the_image_record_was_deleted.4dc3f5") +
              marketplaceMessage("showcase.but_the_stored_file.5d2c09") +
              marketplaceMessage("showcase.still_needs_a_cleanup_check.8f3773")
          : marketplaceMessage("showcase.image_deleted.aa8623")
      );
    } catch (deleteError) {
      setError(
        errorMessage(
          deleteError,
          marketplaceMessage("showcase.the_image_could_not_be_deleted.9acfb9")
        )
      );
    } finally {
      setActionImageId(null);
    }
  }

  return (
    <section
      className="rounded-[24px] border border-neutral-200 bg-[#fbfbfa] p-4"
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
            {r(marketplaceMessage("showcase.product_showcase_images.3b74ef"))}</p>

          <p className="mt-1 text-sm leading-6 text-neutral-600">
            {r(marketplaceMessage("service.the_first_image_you_add_automatically_becomes_the.31d635"))}</p>
        </div>

        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-neutral-500 shadow-sm">
          {r(images.length)}/
          {r(CONTENT_IMAGE_LIMIT)}
        </span>
      </div>

      {r(loading ? (
        <div className="mt-4 space-y-3">
          <div className="h-52 animate-pulse rounded-[22px] bg-neutral-100" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {r([0, 1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-[18px] bg-neutral-100"
                />
              )
            ))}
          </div>
        </div>
      ) : null)}

      {r(!loading &&
      images.length === 0 ? (
        <div className="mt-4 rounded-[22px] border border-dashed border-neutral-200 bg-white p-5 text-center">
          <ImagePlaceholder className="mx-auto h-24 w-32 rounded-[18px]" />

          <p className="mt-3 font-black">
            {r(marketplaceMessage("service.no_images_added_yet.d4bf76"))}</p>

          <p className="mt-1 text-xs leading-5 text-neutral-500">
            {r(marketplaceMessage("showcase.you_can_save_a_draft_without_an_image.f47296"))}</p>
        </div>
      ) : null)}

      {r(!loading &&
      primaryImageUrl ? (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
            {r(marketplaceMessage("service.main_image.7fc1c0"))}</p>

          <img
            src={primaryImageUrl}
            alt=""
            className="h-56 w-full rounded-[22px] bg-neutral-100 object-contain md:h-72"
          />
        </div>
      ) : null)}

      {r(!loading &&
      images.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {r(images.map(
            (image, index) => {
              const imageUrl =
                getProductShowcaseImageUrl(
                  image
                );

              const settingPrimary =
                actionImageId ===
                `primary:${image.id}`;

              const deleting =
                actionImageId ===
                `delete:${image.id}`;

              return (
                <article
                  key={image.id}
                  className="min-w-0 rounded-[20px] border border-neutral-200 bg-white p-2 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      void handleSetPrimary(
                        image
                      )}
                    disabled={busy ||
                      image.isPrimary}
                    className="group relative block h-28 w-full overflow-hidden rounded-[15px] bg-neutral-100 disabled:cursor-default"
                    aria-label={r(image.isPrimary
                        ? marketplaceMessage("showcase.image_value_is_the_main_image.eb4b11", { p0: String(index + 1) })
                        : marketplaceMessage("showcase.set_image_value_as_the_main_image.772dc8", { p0: String(index + 1) }))}
                  >
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />

                    {r(image.isPrimary ? (
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 shadow-sm">
                        {r(marketplaceMessage("showcase.main_image.946efd"))}</span>
                    ) : null)}
                  </button>

                  <div className="mt-2 grid gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleSetPrimary(
                          image
                        )}
                      disabled={busy ||
                        image.isPrimary}
                      className={[
                        "rounded-full border px-3 py-2 text-xs font-black transition disabled:cursor-default disabled:opacity-60",
                        image.isPrimary
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                      ].join(" ")}
                    >
                      {r(image.isPrimary
                        ? marketplaceMessage("showcase.main_image.946efd")
                        : settingPrimary
                          ? marketplaceMessage("service.updating.94c79c")
                          : marketplaceMessage("service.set_as_main.6960df"))}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDelete(
                          image
                        )}
                      disabled={busy ||
                        (status ===
                          "published" &&
                          images.length <= 1)}
                      className="rounded-full border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {r(deleting
                        ? marketplaceMessage("service.deleting.b12b82")
                        : marketplaceMessage("service.delete.b50cda"))}
                    </button>
                  </div>
                </article>
              );
            }
          ))}
        </div>
      ) : null)}

      {r(error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-800"
        >
          {r(error)}
        </p>
      ) : null)}

      {r(notice ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-800"
        >
          {r(notice)}
        </p>
      ) : null)}

      <div className="mt-4">
        {r(remainingSlots === 0 ? (
          <button
            type="button"
            disabled
            className="rounded-full border border-neutral-200 bg-neutral-100 px-5 py-3 text-sm font-black text-neutral-400"
          >
            {r(marketplaceMessage("showcase.maximum_of_10_images_added.1a5efb"))}</button>
        ) : (
          <label
            className={[
              "inline-flex cursor-pointer items-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50",
              busy
                ? "pointer-events-none opacity-60"
                : "",
            ].join(" ")}
          >
            {r(uploading
              ? marketplaceMessage("service.uploading_images.7c5e1c")
              : images.length === 0
                ? marketplaceMessage("showcase.add_images.e0e2fc")
                : marketplaceMessage("showcase.add_more_images.9a4003"))}

            <input
              type="file"
              accept={CONTENT_IMAGE_ACCEPT}
              multiple
              disabled={busy}
              className="sr-only"
              onChange={(event) => {
                const selectedFiles =
                  Array.from(
                    event.currentTarget
                      .files || []
                  );

                event.currentTarget.value =
                  "";

                void handleUpload(
                  selectedFiles
                );
              }}
            />
          </label>
        ))}

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          {r(marketplaceMessage("showcase.jpg_png_or_webp_up_to_10_mb.cc0d55"))}</p>
      </div>
    </section>
  );
}
