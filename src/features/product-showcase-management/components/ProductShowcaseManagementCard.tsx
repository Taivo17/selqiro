"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  PRODUCT_SHOWCASE_CATEGORY_MAX_LENGTH,
  PRODUCT_SHOWCASE_DESCRIPTION_MAX_LENGTH,
  PRODUCT_SHOWCASE_TITLE_MAX_LENGTH,
  PRODUCT_SHOWCASE_TITLE_MIN_LENGTH,
  type ProductShowcase,
  type ProductShowcaseStatus,
} from "../../../entities/product-showcase/model/types";
import {
  getProductShowcaseActivity,
  isProductShowcasePubliclyActive,
} from "../../../entities/product-showcase/model/activity";
import { useMyProductShowcases } from "../model/useMyProductShowcases";
import ProductShowcaseActivityStatus from "./ProductShowcaseActivityStatus";
import ProductShowcaseDeleteControl from "./ProductShowcaseDeleteControl";
import ProductShowcaseImageManager from "./ProductShowcaseImageManager";

type ShowcaseForm = {
  title: string;
  description: string;
  category: string;
};

const EMPTY_FORM: ShowcaseForm = {
  title: "",
  description: "",
  category: "",
};

function buildForm(
  showcase: ProductShowcase
): ShowcaseForm {
  return {
    title: showcase.title,
    description: showcase.description,
    category: showcase.category || "",
  };
}

function getShowcaseActivityState(
  showcase: ProductShowcase,
  activityNow: number | null
) {
  if (
    showcase.status !== "published" ||
    activityNow === null
  ) {
    return null;
  }

  return getProductShowcaseActivity(
    showcase,
    activityNow
  ).state;
}

function statusLabel(
  showcase: ProductShowcase,
  activityNow: number | null
): string {
  const activityState =
    getShowcaseActivityState(
      showcase,
      activityNow
    );

  if (activityState === "expired") {
    return "Aegunud";
  }

  if (activityState === "invalid") {
    return "Vajab kontrolli";
  }

  if (showcase.status === "published") {
    return "Avalik";
  }

  if (showcase.status === "archived") {
    return "Arhiveeritud";
  }

  return "Mustand";
}

function statusClass(
  showcase: ProductShowcase,
  activityNow: number | null
): string {
  const activityState =
    getShowcaseActivityState(
      showcase,
      activityNow
    );

  if (
    activityState === "expired" ||
    activityState === "invalid"
  ) {
    return "border-red-100 bg-red-50 text-red-700";
  }

  if (showcase.status === "published") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (showcase.status === "archived") {
    return "border-neutral-200 bg-neutral-100 text-neutral-500";
  }

  return "border-amber-100 bg-amber-50 text-amber-700";
}

function getStatusSuccessMessage(
  showcase: ProductShowcase
): string {
  if (showcase.status === "published") {
    return `Tootenäidis „${showcase.title}” on nüüd avalik.`;
  }

  if (showcase.status === "archived") {
    return `Tootenäidis „${showcase.title}” arhiveeriti.`;
  }

  return `Tootenäidis „${showcase.title}” on nüüd mustand.`;
}

export default function ProductShowcaseManagementCard() {
  const {
    activeIdentityId,
    showcases,
    loading,
    error,
    savingShowcaseId,
    changingStatusShowcaseId,
    deletingShowcaseId,
    refresh,
    saveShowcase,
    changeStatus,
    deleteShowcase,
    clearError,
  } = useMyProductShowcases();

  const [formOpen, setFormOpen] =
    useState(false);

  const [
    editingShowcaseId,
    setEditingShowcaseId,
  ] = useState<string | null>(null);

  const [form, setForm] =
    useState<ShowcaseForm>({
      ...EMPTY_FORM,
    });

  const [formError, setFormError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [
    confirmingDeleteShowcaseId,
    setConfirmingDeleteShowcaseId,
  ] = useState<string | null>(null);

  const [
    activityNow,
    setActivityNow,
  ] = useState<number | null>(null);

  const actionBusy =
    savingShowcaseId !== null ||
    changingStatusShowcaseId !== null ||
    deletingShowcaseId !== null ||
    confirmingDeleteShowcaseId !== null;

  const publishedCount = showcases.filter(
    (showcase) =>
      activityNow === null
        ? showcase.status === "published"
        : isProductShowcasePubliclyActive(
            showcase,
            activityNow
          )
  ).length;

  const draftCount = showcases.filter(
    (showcase) =>
      showcase.status === "draft"
  ).length;

  const archivedCount = showcases.filter(
    (showcase) =>
      showcase.status === "archived"
  ).length;

  useEffect(() => {
    function updateActivityNow() {
      setActivityNow(Date.now());
    }

    updateActivityNow();

    const intervalId = window.setInterval(
      updateActivityNow,
      60_000
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setFormOpen(false);
    setEditingShowcaseId(null);
    setForm({
      ...EMPTY_FORM,
    });
    setFormError(null);
    setSuccessMessage(null);
    setConfirmingDeleteShowcaseId(
      null
    );
  }, [activeIdentityId]);

  useEffect(() => {
    if (
      !loading &&
      activeIdentityId &&
      showcases.length === 0
    ) {
      setFormOpen(true);
    }
  }, [
    activeIdentityId,
    loading,
    showcases.length,
  ]);

  function updateField<
    Key extends keyof ShowcaseForm
  >(
    field: Key,
    value: ShowcaseForm[Key]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFormError(null);
    setSuccessMessage(null);
    clearError();
  }

  function openCreateForm() {
    setEditingShowcaseId(null);
    setForm({
      ...EMPTY_FORM,
    });
    setFormError(null);
    setSuccessMessage(null);
    clearError();
    setFormOpen(true);
  }

  function openEditForm(
    showcase: ProductShowcase
  ) {
    setEditingShowcaseId(showcase.id);
    setForm(buildForm(showcase));
    setFormError(null);
    setSuccessMessage(null);
    clearError();
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingShowcaseId(null);
    setForm({
      ...EMPTY_FORM,
    });
    setFormError(null);
    clearError();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanTitle = form.title
      .trim()
      .replace(/\s+/g, " ");

    setFormError(null);
    setSuccessMessage(null);
    clearError();

    if (
      cleanTitle.length <
      PRODUCT_SHOWCASE_TITLE_MIN_LENGTH
    ) {
      setFormError(
        `Pealkiri peab olema vähemalt ${PRODUCT_SHOWCASE_TITLE_MIN_LENGTH} tähemärki.`
      );
      return;
    }

    if (
      cleanTitle.length >
      PRODUCT_SHOWCASE_TITLE_MAX_LENGTH
    ) {
      setFormError(
        `Pealkiri võib olla kuni ${PRODUCT_SHOWCASE_TITLE_MAX_LENGTH} tähemärki.`
      );
      return;
    }

    const existingShowcase =
      editingShowcaseId
        ? showcases.find(
            (showcase) =>
              showcase.id ===
              editingShowcaseId
          ) || null
        : null;

    try {
      const savedShowcase =
        await saveShowcase({
          showcaseId:
            editingShowcaseId,
          title: cleanTitle,
          description:
            form.description,
          category: form.category,
          imageUrl:
            existingShowcase?.imageUrl ||
            null,
          externalUrl:
            existingShowcase?.externalUrl ||
            null,
        });

      setSuccessMessage(
        editingShowcaseId
          ? `Tootenäidis „${savedShowcase.title}” salvestatud.`
          : `Tootenäidis „${savedShowcase.title}” lisatud mustandina. Lisa nüüd pildid.`
      );

      setEditingShowcaseId(
        savedShowcase.id
      );
      setForm(
        buildForm(savedShowcase)
      );
      setFormOpen(true);
      void refresh();
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Tootenäidist ei saanud salvestada."
      );
    }
  }

  function openDeleteConfirmation(
    showcase: ProductShowcase
  ) {
    if (actionBusy) {
      return;
    }

    setFormOpen(false);
    setEditingShowcaseId(null);
    setForm({
      ...EMPTY_FORM,
    });
    setFormError(null);
    setSuccessMessage(null);
    clearError();

    setConfirmingDeleteShowcaseId(
      showcase.id
    );
  }

  function closeDeleteConfirmation() {
    if (deletingShowcaseId !== null) {
      return;
    }

    setConfirmingDeleteShowcaseId(
      null
    );

    clearError();
  }

  async function handleDeleteShowcase(
    showcase: ProductShowcase
  ): Promise<void> {
    if (
      showcase.status !==
      "archived"
    ) {
      throw new Error(
        "Tootenäidis tuleb enne jäädavat kustutamist arhiveerida."
      );
    }

    setSuccessMessage(null);
    setFormError(null);
    clearError();

    try {
      await deleteShowcase(
        showcase.id
      );

      setConfirmingDeleteShowcaseId(
        null
      );

      setSuccessMessage(
        `Tootenäidis „${showcase.title}” kustutati jäädavalt.`
      );
    } catch (deleteError) {
      /*
       * Hooki üldine veateade eemaldatakse,
       * sest kinnituse komponent näitab vea
       * kustutatava tootenäidise juures.
       */
      clearError();
      throw deleteError;
    }
  }

  async function handleStatusChange(
    showcase: ProductShowcase,
    status: ProductShowcaseStatus
  ) {
    setSuccessMessage(null);
    setFormError(null);
    clearError();

    try {
      const updatedShowcase =
        await changeStatus(
          showcase.id,
          status
        );

      setSuccessMessage(
        getStatusSuccessMessage(
          updatedShowcase
        )
      );
    } catch {
      /*
       * Hook kuvab turvalise kasutajale
       * mõeldud veateate.
       */
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            Tootenäidised
          </p>

          <h2 className="mt-2 break-words text-2xl font-black">
            Sinu tootenäidised
          </h2>

          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-neutral-600">
            Lisa oma tööde, toodete või
            varasema kogemuse näiteid.
            Avalikus profiilis kuvatakse
            ainult avaldatud tootenäidised.
          </p>
        </div>

        <button
          type="button"
          onClick={
            formOpen
              ? closeForm
              : openCreateForm
          }
          disabled={
            loading ||
            !activeIdentityId ||
            actionBusy
          }
          className="w-full shrink-0 rounded-full bg-black px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500 sm:w-auto"
        >
          {formOpen
            ? "Sulge vorm"
            : "Lisa tootenäidis"}
        </button>
      </div>

      {!loading &&
      activeIdentityId ? (
        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-600">
            {showcases.length} kokku
          </span>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
            {publishedCount} avalikku
          </span>

          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
            {draftCount} mustandit
          </span>

          {archivedCount > 0 ? (
            <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-500">
              {archivedCount} arhiveeritud
            </span>
          ) : null}
        </div>
      ) : null}

      {formOpen &&
      activeIdentityId ? (
        <form
          onSubmit={handleSubmit}
          className="mt-5 rounded-[24px] border border-neutral-200 bg-[#fbfbfa] p-4 sm:p-5"
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                {editingShowcaseId
                  ? "Tootenäidise muutmine"
                  : "Uus tootenäidis"}
              </p>

              <h3 className="mt-1 break-words text-lg font-black">
                {editingShowcaseId
                  ? "Muuda andmeid"
                  : "Lisa profiilile uus näide"}
              </h3>
            </div>
          </div>

          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="min-w-0">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                Pealkiri
              </span>

              <input
                value={form.title}
                onChange={(event) =>
                  updateField(
                    "title",
                    event.target.value
                  )
                }
                maxLength={
                  PRODUCT_SHOWCASE_TITLE_MAX_LENGTH
                }
                disabled={actionBusy}
                placeholder="Näiteks Hooldatud murutraktorid"
                className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:opacity-60"
              />

              <span className="mt-1 block text-right text-[11px] font-bold text-neutral-400">
                {form.title.length}/
                {
                  PRODUCT_SHOWCASE_TITLE_MAX_LENGTH
                }
              </span>
            </label>

            <label className="min-w-0">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                Kategooria või teema
              </span>

              <input
                value={form.category}
                onChange={(event) =>
                  updateField(
                    "category",
                    event.target.value
                  )
                }
                maxLength={
                  PRODUCT_SHOWCASE_CATEGORY_MAX_LENGTH
                }
                disabled={actionBusy}
                placeholder="Näiteks Aiatehnika"
                className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:opacity-60"
              />
            </label>

            <label className="min-w-0 sm:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                Kirjeldus
              </span>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value
                  )
                }
                maxLength={
                  PRODUCT_SHOWCASE_DESCRIPTION_MAX_LENGTH
                }
                rows={4}
                disabled={actionBusy}
                placeholder="Kirjelda lühidalt toodet, tehtud tööd või kogemust."
                className="w-full min-w-0 resize-y rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-neutral-400 disabled:opacity-60"
              />

              <span className="mt-1 block text-right text-[11px] font-bold text-neutral-400">
                {form.description.length}/
                {
                  PRODUCT_SHOWCASE_DESCRIPTION_MAX_LENGTH
                }
              </span>
            </label>

            </div>

            {editingShowcaseId ? (
              <div className="mt-4">
                <ProductShowcaseImageManager
                  showcaseId={
                    editingShowcaseId
                  }
                  status={
                    showcases.find(
                      (showcase) =>
                        showcase.id ===
                        editingShowcaseId
                    )?.status || "draft"
                  }
                  onChanged={() => {
                    void refresh();
                  }}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-4">
                <p className="font-black">
                  Salvesta esmalt mustand
                </p>

                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  Pärast mustandi salvestamist
                  saad telefonist või arvutist
                  valida kuni 10 pilti ja
                  määrata põhipildi.
                </p>
              </div>
            )}


          {formError ? (
            <p
              role="alert"
              className="mt-3 break-words rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
            >
              {formError}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={actionBusy}
              className="w-full rounded-full bg-black px-5 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50 sm:w-auto"
            >
              {savingShowcaseId
                ? "Salvestan..."
                : editingShowcaseId
                  ? "Salvesta muudatused"
                  : "Lisa mustand"}
            </button>

            <button
              type="button"
              onClick={closeForm}
              disabled={actionBusy}
              className="w-full rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black text-neutral-700 disabled:opacity-50 sm:w-auto"
            >
              Tühista
            </button>
          </div>
        </form>
      ) : null}

      {successMessage ? (
        <p
          aria-live="polite"
          className="mt-4 break-words rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800"
        >
          {successMessage}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-5 space-y-3">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-[22px] bg-neutral-100"
            />
          ))}
        </div>
      ) : null}

      {!loading &&
      !activeIdentityId ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-5">
          <p className="font-black">
            Aktiivne identiteet puudub
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Tootenäidiste haldamiseks vali
            päises aktiivne identiteet.
          </p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-5 rounded-[22px] border border-red-100 bg-red-50 p-5">
          <p className="font-black text-red-950">
            Tootenäidiseid ei saanud laadida
          </p>

          <p className="mt-2 break-words text-sm leading-6 text-red-800">
            {error}
          </p>

          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-4 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-800"
          >
            Proovi uuesti
          </button>
        </div>
      ) : null}

      {!loading &&
      !error &&
      activeIdentityId &&
      showcases.length === 0 &&
      !formOpen ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-5 text-center">
          <p className="font-black">
            Tootenäidiseid ei ole veel
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Lisa esimene töö, toode või
            portfoolionäide.
          </p>

          <button
            type="button"
            onClick={openCreateForm}
            className="mt-4 rounded-full bg-black px-5 py-3 text-sm font-black text-white"
          >
            Lisa esimene tootenäidis
          </button>
        </div>
      ) : null}

      {!loading &&
      !error &&
      showcases.length > 0 ? (
        <div className="mt-5 space-y-3">
          {showcases.map((showcase) => {
            const statusChanging =
              changingStatusShowcaseId ===
              showcase.id;

            return (
              <article
                key={showcase.id}
                className="grid min-w-0 gap-4 rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-start"
              >
                <div className="h-28 min-w-0 overflow-hidden rounded-[18px] bg-gradient-to-br from-neutral-100 to-neutral-200 md:h-[140px] md:self-start">
                  {showcase.imageUrl ? (
                    <img
                      src={showcase.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black",
                          statusClass(
                              showcase,
                              activityNow
                            ),
                        ].join(" ")}
                      >
                        {statusLabel(
                            showcase,
                            activityNow
                          )}
                      </span>

                      <h3 className="mt-2 break-words text-lg font-black">
                        {showcase.title}
                      </h3>

                      {showcase.category ? (
                        <p className="mt-1 break-words text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                          {showcase.category}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {showcase.description ? (
                    <p className="line-clamp-4 mt-2 break-words text-sm leading-6 text-neutral-600">
                      {showcase.description}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-neutral-400">
                      Kirjeldus puudub.
                    </p>
                  )}


                  <ProductShowcaseActivityStatus
                    showcase={showcase}
                    now={activityNow}
                  />

                  <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(showcase)
                      }
                      disabled={actionBusy}
                      className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 disabled:opacity-40"
                    >
                      Muuda
                    </button>

                    {showcase.status !==
                    "published" ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(
                            showcase,
                            "published"
                          )
                        }
                        disabled={actionBusy}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
                      >
                        {statusChanging
                          ? "Muudan..."
                          : "Avalda"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(
                            showcase,
                            "draft"
                          )
                        }
                        disabled={actionBusy}
                        className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 disabled:opacity-40"
                      >
                        {statusChanging
                          ? "Muudan..."
                          : "Peida"}
                      </button>
                    )}

                    {showcase.status ===
                    "archived" ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(
                            showcase,
                            "draft"
                          )
                        }
                        disabled={actionBusy}
                        className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 disabled:opacity-40"
                      >
                        {statusChanging
                          ? "Muudan..."
                          : "Taasta mustandiks"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(
                            showcase,
                            "archived"
                          )
                        }
                        disabled={actionBusy}
                        className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-500 disabled:opacity-40"
                      >
                        {statusChanging
                          ? "Muudan..."
                          : "Arhiveeri"}
                      </button>
                    )}

                      {showcase.status ===
                      "archived" ? (
                        <ProductShowcaseDeleteControl
                          showcase={showcase}
                          confirming={
                            confirmingDeleteShowcaseId ===
                            showcase.id
                          }
                          deleting={
                            deletingShowcaseId ===
                            showcase.id
                          }
                          disabled={actionBusy}
                          onStart={() =>
                            openDeleteConfirmation(
                              showcase
                            )
                          }
                          onCancel={
                            closeDeleteConfirmation
                          }
                          onConfirm={() =>
                            handleDeleteShowcase(
                              showcase
                            )
                          }
                        />
                      ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
