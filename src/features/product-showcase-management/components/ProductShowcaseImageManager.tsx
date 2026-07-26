"use client";

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
  return error instanceof Error &&
    error.message
    ? error.message
    : fallback;
}

function ImagePlaceholder({
  className = "",
}: {
  className?: string;
}) {
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
            "Tootenäidise pilte ei saanud laadida."
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
        `Tootenäidisele saab lisada kuni ` +
          `${CONTENT_IMAGE_LIMIT} pilti.`
      );
      return;
    }

    if (
      selectedFiles.length >
      remainingSlots
    ) {
      setError(
        `Saad lisada veel ` +
          `${remainingSlots} pilti.`
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
          ? "Pilt lisatud."
          : `${uploadedCount} pilti lisatud.`
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
          "Pildi lisamine ebaõnnestus."
        );

      setError(
        uploadedCount > 0
          ? `${uploadedCount} pilti lisati, ` +
              `kuid järgmise pildi ` +
              `lisamine ebaõnnestus: ` +
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
        "Põhipilt muudetud."
      );
    } catch (primaryError) {
      setError(
        errorMessage(
          primaryError,
          "Põhipilti ei saanud muuta."
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
        "Avaldatud tootenäidise " +
          "viimast pilti ei saa kustutada."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Kas kustutada see pilt " +
          "tootenäidiselt?"
      );

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
          ? "Pildi kirje kustutati, " +
              "kuid Storage’i faili " +
              "puhastamine vajab kontrolli."
          : "Pilt kustutatud."
      );
    } catch (deleteError) {
      setError(
        errorMessage(
          deleteError,
          "Pilti ei saanud kustutada."
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
            Tootenäidise pildid
          </p>

          <p className="mt-1 text-sm leading-6 text-neutral-600">
            Esimene lisatud pilt muutub
            automaatselt põhipildiks.
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-neutral-500 shadow-sm">
          {images.length}/
          {CONTENT_IMAGE_LIMIT}
        </span>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <div className="h-52 animate-pulse rounded-[22px] bg-neutral-100" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-[18px] bg-neutral-100"
                />
              )
            )}
          </div>
        </div>
      ) : null}

      {!loading &&
      images.length === 0 ? (
        <div className="mt-4 rounded-[22px] border border-dashed border-neutral-200 bg-white p-5 text-center">
          <ImagePlaceholder className="mx-auto h-24 w-32 rounded-[18px]" />

          <p className="mt-3 font-black">
            Pilte ei ole veel lisatud
          </p>

          <p className="mt-1 text-xs leading-5 text-neutral-500">
            Mustandi võib salvestada ilma
            pildita. Avaldamiseks lisa
            vähemalt üks pilt.
          </p>
        </div>
      ) : null}

      {!loading &&
      primaryImageUrl ? (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
            Põhipilt
          </p>

          <img
            src={primaryImageUrl}
            alt=""
            className="h-56 w-full rounded-[22px] bg-neutral-100 object-contain md:h-72"
          />
        </div>
      ) : null}

      {!loading &&
      images.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map(
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
                      )
                    }
                    disabled={
                      busy ||
                      image.isPrimary
                    }
                    className="group relative block h-28 w-full overflow-hidden rounded-[15px] bg-neutral-100 disabled:cursor-default"
                    aria-label={
                      image.isPrimary
                        ? `Pilt ${index + 1} on põhipilt`
                        : `Määra pilt ${index + 1} põhipildiks`
                    }
                  >
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />

                    {image.isPrimary ? (
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 shadow-sm">
                        ✓ Põhipilt
                      </span>
                    ) : null}
                  </button>

                  <div className="mt-2 grid gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleSetPrimary(
                          image
                        )
                      }
                      disabled={
                        busy ||
                        image.isPrimary
                      }
                      className={[
                        "rounded-full border px-3 py-2 text-xs font-black transition disabled:cursor-default disabled:opacity-60",
                        image.isPrimary
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                      ].join(" ")}
                    >
                      {image.isPrimary
                        ? "✓ Põhipilt"
                        : settingPrimary
                          ? "Muudan..."
                          : "Põhipildiks"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDelete(
                          image
                        )
                      }
                      disabled={
                        busy ||
                        (status ===
                          "published" &&
                          images.length <= 1)
                      }
                      className="rounded-full border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deleting
                        ? "Kustutan..."
                        : "Kustuta"}
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-800"
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-800"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-4">
        {remainingSlots === 0 ? (
          <button
            type="button"
            disabled
            className="rounded-full border border-neutral-200 bg-neutral-100 px-5 py-3 text-sm font-black text-neutral-400"
          >
            Maksimum 10 pilti lisatud
          </button>
        ) : (
          <label
            className={[
              "inline-flex cursor-pointer items-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50",
              busy
                ? "pointer-events-none opacity-60"
                : "",
            ].join(" ")}
          >
            {uploading
              ? "Laadin pilte..."
              : images.length === 0
                ? "Lisa pildid"
                : "Lisa veel pilte"}

            <input
              type="file"
              accept={
                CONTENT_IMAGE_ACCEPT
              }
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
        )}

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          JPG, PNG või WEBP. Kuni 10 MB
          pildi kohta. Võid telefonist või
          arvutist valida mitu pilti korraga.
        </p>
      </div>
    </section>
  );
}
