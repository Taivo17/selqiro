"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import Link from "next/link";
import {
  saveMyAreaContentReturnContext,
} from "../../my-area-navigation/model/myAreaContentReturnContext";
import {
  useMyAreaContentReturnRestoration,
} from "../../my-area-navigation/model/useMyAreaContentReturnRestoration";
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
    return marketplaceMessage("showcase.expired.00e195");
  }

  if (activityState === "invalid") {
    return marketplaceMessage("showcase.needs_review.95fc34");
  }

  if (showcase.status === "published") {
    return marketplaceMessage("service.public.22d0d3");
  }

  if (showcase.status === "archived") {
    return marketplaceMessage("horse.archived.c37d62");
  }

  return marketplaceMessage("horse.draft.e9670d");
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
    return marketplaceMessage("showcase.product_showcase_value_is_now_public.9275ab", { p0: String(showcase.title) });
  }

  if (showcase.status === "archived") {
    return marketplaceMessage("showcase.product_showcase_value_was_archived.676a68", { p0: String(showcase.title) });
  }

  return marketplaceMessage("showcase.product_showcase_value_is_now_a_draft.3d8c1d", { p0: String(showcase.title) });
}

export default function ProductShowcaseManagementCard() {
  const { language, r } = useMarketplaceTranslation();
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

  useMyAreaContentReturnRestoration({
    contentType: "showcase",
    ready: !loading && !error,
    contentIds: showcases.map(
      (showcase) => showcase.id
    ),
  });

  function handleOpenShowcase(
    event: MouseEvent<HTMLAnchorElement>,
    showcaseId: string
  ) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const card =
      event.currentTarget.closest(
        "[data-my-area-content-card]"
      ) as HTMLElement | null;

    saveMyAreaContentReturnContext({
      contentType: "showcase",
      contentId: showcaseId,
      cardViewportTop:
        card?.getBoundingClientRect()
          .top ?? 0,
    });
  }

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
        marketplaceMessage("service.the_title_must_contain_at_least_value_characters.154417", { p0: String(PRODUCT_SHOWCASE_TITLE_MIN_LENGTH) })
      );
      return;
    }

    if (
      cleanTitle.length >
      PRODUCT_SHOWCASE_TITLE_MAX_LENGTH
    ) {
      setFormError(
        marketplaceMessage("service.the_title_can_contain_up_to_value_characters.6b5ca7", { p0: String(PRODUCT_SHOWCASE_TITLE_MAX_LENGTH) })
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
          ? marketplaceMessage("showcase.product_showcase_value_saved.67dff9", { p0: String(savedShowcase.title) })
          : marketplaceMessage("showcase.product_showcase_value_added_as_a_draft_you.c5323e", { p0: String(savedShowcase.title) })
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
        safeMarketplaceError(saveError, marketplaceMessage("showcase.the_product_showcase_could_not_be_saved.8e58b1"))
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
        marketplaceMessage("showcase.archive_the_product_showcase_before_deleting_it_permanently.245945")
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
        marketplaceMessage("showcase.product_showcase_value_was_permanently_deleted.65c2ad", { p0: String(showcase.title) })
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
    <section className="min-w-0 overflow-hidden rounded-[26px] border border-black/5 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            {r(marketplaceMessage("showcase.product_showcases.ab81b6"))}</p>

          <h2 className="mt-2 break-words text-2xl font-black">
            {r(marketplaceMessage("showcase.your_product_showcases.bb6496"))}</h2>

          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-neutral-600">
            {r(marketplaceMessage("showcase.add_examples_of_your_work_products_or_experience.a803b2"))}</p>
        </div>

        <button
          type="button"
          onClick={formOpen
              ? closeForm
              : openCreateForm}
          disabled={loading ||
            !activeIdentityId ||
            actionBusy}
          className="w-full shrink-0 rounded-full bg-black px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500 sm:w-auto"
        >
          {r(formOpen
            ? marketplaceMessage("showcase.close_form.e8704e")
            : marketplaceMessage("showcase.add_product_showcase.b25b1a"))}
        </button>
      </div>

      {r(!loading &&
      activeIdentityId ? (
        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-600">
            {r(showcases.length)}  {r(marketplaceMessage("service.total.1d0b5c"))}</span>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
            {r(publishedCount)}  {r(marketplaceMessage("service.public.78e906"))}</span>

          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
            {r(draftCount)}  {r(marketplaceMessage("service.drafts.7dc5e1"))}</span>

          {r(archivedCount > 0 ? (
            <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-500">
              {r(archivedCount)}  {r(marketplaceMessage("service.archived.2ba0d9"))}</span>
          ) : null)}
        </div>
      ) : null)}

      {r(formOpen &&
      activeIdentityId ? (
        <form
          onSubmit={handleSubmit}
          className="mt-5 rounded-[24px] border border-neutral-200 bg-[#fbfbfa] p-4 sm:p-5"
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                {r(editingShowcaseId
                  ? marketplaceMessage("showcase.edit_product_showcase.1e0005")
                  : marketplaceMessage("showcase.new_product_showcase.ae2566"))}
              </p>

              <h3 className="mt-1 break-words text-lg font-black">
                {r(editingShowcaseId
                  ? marketplaceMessage("showcase.edit_details.9bc45e")
                  : marketplaceMessage("showcase.add_a_new_example_to_your_profile.f27858"))}
              </h3>
            </div>
          </div>

          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="min-w-0">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                {r(marketplaceMessage("horse.title.abe10a"))}</span>

              <input
                value={form.title}
                onChange={(event) =>
                  updateField(
                    "title",
                    event.target.value
                  )}
                maxLength={PRODUCT_SHOWCASE_TITLE_MAX_LENGTH}
                disabled={actionBusy}
                placeholder={r(marketplaceMessage("showcase.for_example_serviced_ride_on_mowers.58f0a8"))}
                className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:opacity-60"
              />

              <span className="mt-1 block text-right text-[11px] font-bold text-neutral-400">
                {r(form.title.length)}/
                {r(PRODUCT_SHOWCASE_TITLE_MAX_LENGTH)}
              </span>
            </label>

            <label className="min-w-0">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                {r(marketplaceMessage("showcase.category_or_topic.edd84a"))}</span>

              <input
                value={form.category}
                onChange={(event) =>
                  updateField(
                    "category",
                    event.target.value
                  )}
                maxLength={PRODUCT_SHOWCASE_CATEGORY_MAX_LENGTH}
                disabled={actionBusy}
                placeholder={r(marketplaceMessage("showcase.for_example_garden_equipment.f849ea"))}
                className="min-h-12 w-full min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:opacity-60"
              />
            </label>

            <label className="min-w-0 sm:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                {r(marketplaceMessage("horse.description.8dbc42"))}</span>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value
                  )}
                maxLength={PRODUCT_SHOWCASE_DESCRIPTION_MAX_LENGTH}
                rows={4}
                disabled={actionBusy}
                placeholder={r(marketplaceMessage("showcase.briefly_describe_the_product_work_or_experience.68da7b"))}
                className="w-full min-w-0 resize-y rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-neutral-400 disabled:opacity-60"
              />

              <span className="mt-1 block text-right text-[11px] font-bold text-neutral-400">
                {r(form.description.length)}/
                {r(PRODUCT_SHOWCASE_DESCRIPTION_MAX_LENGTH)}
              </span>
            </label>

            </div>

            {r(editingShowcaseId ? (
              <div className="mt-4">
                <ProductShowcaseImageManager
                  showcaseId={editingShowcaseId}
                  status={showcases.find(
                      (showcase) =>
                        showcase.id ===
                        editingShowcaseId
                    )?.status || "draft"}
                  onChanged={() => {
                    void refresh();
                  }}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-4">
                <p className="font-black">
                  {r(marketplaceMessage("showcase.save_a_draft_first.1829a2"))}</p>

                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  {r(marketplaceMessage("showcase.after_saving_the_draft_you_can_choose_up.d06ed7"))}</p>
              </div>
            ))}


          {r(formError ? (
            <p
              role="alert"
              className="mt-3 break-words rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
            >
              {r(formError)}
            </p>
          ) : null)}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={actionBusy}
              className="w-full rounded-full bg-black px-5 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50 sm:w-auto"
            >
              {r(savingShowcaseId
                ? marketplaceMessage("service.saving.cf92f2")
                : editingShowcaseId
                  ? marketplaceMessage("horse.save_changes.10e8e6")
                  : marketplaceMessage("service.add_draft.05d673"))}
            </button>

            <button
              type="button"
              onClick={closeForm}
              disabled={actionBusy}
              className="w-full rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black text-neutral-700 disabled:opacity-50 sm:w-auto"
            >
              {r(marketplaceMessage("service.cancel.a6b940"))}</button>
          </div>
        </form>
      ) : null)}

      {r(successMessage ? (
        <p
          aria-live="polite"
          className="mt-4 break-words rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800"
        >
          {r(successMessage)}
        </p>
      ) : null)}

      {r(loading ? (
        <div className="mt-5 space-y-3">
          {r([0, 1].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-[22px] bg-neutral-100"
            />
          )))}
        </div>
      ) : null)}

      {r(!loading &&
      !activeIdentityId ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-5">
          <p className="font-black">
            {r(marketplaceMessage("service.no_active_identity.579519"))}</p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {r(marketplaceMessage("showcase.select_an_active_identity_in_the_header_to.79b8fb"))}</p>
        </div>
      ) : null)}

      {r(!loading && error ? (
        <div className="mt-5 rounded-[22px] border border-red-100 bg-red-50 p-5">
          <p className="font-black text-red-950">
            {r(marketplaceMessage("showcase.product_showcases_could_not_be_loaded.f7b090"))}</p>

          <p className="mt-2 break-words text-sm leading-6 text-red-800">
            {r(error)}
          </p>

          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-4 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-800"
          >
            {r(marketplaceMessage("horse.try_again.8c63df"))}</button>
        </div>
      ) : null)}

      {r(!loading &&
      !error &&
      activeIdentityId &&
      showcases.length === 0 &&
      !formOpen ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-5 text-center">
          <p className="font-black">
            {r(marketplaceMessage("showcase.no_product_showcases_yet.cd1aba"))}</p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {r(marketplaceMessage("showcase.add_your_first_work_product_or_portfolio_example.b6d1e8"))}</p>

          <button
            type="button"
            onClick={openCreateForm}
            className="mt-4 rounded-full bg-black px-5 py-3 text-sm font-black text-white"
          >
            {r(marketplaceMessage("showcase.add_your_first_product_showcase.46bada"))}</button>
        </div>
      ) : null)}

      {r(!loading &&
      !error &&
      showcases.length > 0 ? (
        <div className="mt-5 space-y-3">
          {r(showcases.map((showcase) => {
            const statusChanging =
              changingStatusShowcaseId ===
              showcase.id;

            const detailHref =
              `/v2/showcase/${showcase.id}?from=my-area`;


            return (
              <article
                key={showcase.id}
                data-my-area-content-card=""
                data-my-area-content-type="showcase"
                data-my-area-content-id={showcase.id}
                className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] items-start gap-3 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-4 sm:rounded-[22px] sm:p-4 md:grid-cols-[140px_minmax(0,1fr)]"
              >
                <Link
                  href={detailHref}
                  onClick={(event) =>
                    handleOpenShowcase(
                      event,
                      showcase.id
                    )}
                  aria-label={r(marketplaceMessage("showcase.view_product_showcase_value.292c3b", { p0: String(showcase.title) }))}
                  className="group h-24 min-w-0 overflow-hidden rounded-[16px] bg-gradient-to-br from-neutral-100 to-neutral-200 outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-black sm:h-28 sm:rounded-[18px] md:h-[140px] md:self-start"
                >
                  {r(showcase.imageUrl ? (
                    <img
                      src={showcase.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]"
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  ) : null)}
                </Link>

                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black sm:px-2.5 sm:py-1 sm:text-[11px]",
                          statusClass(
                              showcase,
                              activityNow
                            ),
                        ].join(" ")}
                      >
                        {r(statusLabel(
                            showcase,
                            activityNow
                          ))}
                      </span>

                      <Link
                        href={detailHref}
                        onClick={(event) =>
                          handleOpenShowcase(
                            event,
                            showcase.id
                          )}
                        className="block rounded-lg outline-none ring-offset-2 transition hover:text-neutral-600 focus-visible:ring-2 focus-visible:ring-black"
                      >
                        <h3 className="mt-1.5 line-clamp-2 break-words text-base font-black leading-5 sm:mt-2 sm:text-lg sm:leading-6">
                          {r(showcase.title)}
                        </h3>

                        {r(showcase.category ? (
                          <p className="mt-1 line-clamp-2 break-words text-[10px] font-bold uppercase leading-4 tracking-[0.1em] text-neutral-400 sm:text-xs sm:tracking-[0.14em]">
                            {r(showcase.category)}
                          </p>
                        ) : null)}
                      </Link>
                    </div>
                  </div>

                  <Link
                    href={detailHref}
                    onClick={(event) =>
                      handleOpenShowcase(
                        event,
                        showcase.id
                      )}
                    className="block rounded-lg outline-none ring-offset-2 transition hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-black"
                  >
                    {r(showcase.description ? (
                      <p className="mt-1.5 line-clamp-3 break-words text-xs leading-5 text-neutral-600 sm:mt-2 sm:line-clamp-4 sm:text-sm sm:leading-6">
                        {r(showcase.description)}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs leading-5 text-neutral-400 sm:mt-2 sm:text-sm">
                        {r(marketplaceMessage("service.no_description.5b24f9"))}</p>
                    ))}
                  </Link>


                  <ProductShowcaseActivityStatus
                    showcase={showcase}
                    now={activityNow}
                  />

                  <div className="mt-3 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(76px,1fr))] gap-2 [&>button]:w-full sm:mt-4 sm:flex sm:flex-wrap sm:[&>button]:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(showcase)}
                      disabled={actionBusy}
                      className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 disabled:opacity-40"
                    >
                      {r(marketplaceMessage("service.edit.b81741"))}</button>

                    {r(showcase.status !==
                    "published" ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(
                            showcase,
                            "published"
                          )}
                        disabled={actionBusy}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
                      >
                        {r(statusChanging
                          ? marketplaceMessage("service.updating.94c79c")
                          : marketplaceMessage("service.publish.1b6402"))}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(
                            showcase,
                            "draft"
                          )}
                        disabled={actionBusy}
                        className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 disabled:opacity-40"
                      >
                        {r(statusChanging
                          ? marketplaceMessage("service.updating.94c79c")
                          : marketplaceMessage("showcase.hide.562631"))}
                      </button>
                    ))}

                    {r(showcase.status ===
                    "archived" ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(
                            showcase,
                            "draft"
                          )}
                        disabled={actionBusy}
                        className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 disabled:opacity-40"
                      >
                        {r(statusChanging
                          ? marketplaceMessage("service.updating.94c79c")
                          : marketplaceMessage("service.restore_as_draft.88e185"))}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(
                            showcase,
                            "archived"
                          )}
                        disabled={actionBusy}
                        className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-500 disabled:opacity-40"
                      >
                        {r(statusChanging
                          ? marketplaceMessage("service.updating.94c79c")
                          : marketplaceMessage("service.archive.016685"))}
                      </button>
                    ))}

                      {r(showcase.status ===
                      "archived" ? (
                        <ProductShowcaseDeleteControl
                          showcase={showcase}
                          confirming={confirmingDeleteShowcaseId ===
                            showcase.id}
                          deleting={deletingShowcaseId ===
                            showcase.id}
                          disabled={actionBusy}
                          onStart={() =>
                            openDeleteConfirmation(
                              showcase
                            )}
                          onCancel={closeDeleteConfirmation}
                          onConfirm={() =>
                            handleDeleteShowcase(
                              showcase
                            )}
                        />
                      ) : null)}
                  </div>
                </div>
              </article>
            );
          }))}
        </div>
      ) : null)}
    </section>
  );
}
