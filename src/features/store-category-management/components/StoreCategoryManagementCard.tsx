"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  normalizeStoreCategoryName,
  STORE_CATEGORY_NAME_MAX_LENGTH,
} from "../../../entities/store-category/model/types";
import {
  useMyAreaStoreCategories,
  type MyAreaStoreCategory,
} from "../../my-area/model/useMyAreaStoreCategories";
import StoreCategoryChildCreateForm from "./StoreCategoryChildCreateForm";
import StoreCategoryDeleteControl from "./StoreCategoryDeleteControl";
import StoreCategoryRenameControl from "./StoreCategoryRenameControl";

function compareCategories(
  first: MyAreaStoreCategory,
  second: MyAreaStoreCategory
) {
  const firstOrder =
    typeof first.sort_order === "number" ? first.sort_order : 0;
  const secondOrder =
    typeof second.sort_order === "number" ? second.sort_order : 0;

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return first.name.localeCompare(second.name, "et");
}

function buildCategoryView(categories: MyAreaStoreCategory[]) {
  const roots = categories
    .filter((category) => !category.parent_id)
    .sort(compareCategories);

  const rootIds = new Set(roots.map((category) => category.id));
  const childrenByParent = new Map<string, MyAreaStoreCategory[]>();
  let directChildCount = 0;
  let deeperCategoryCount = 0;

  for (const category of categories) {
    if (!category.parent_id) continue;

    if (!rootIds.has(category.parent_id)) {
      deeperCategoryCount += 1;
      continue;
    }

    const existingChildren =
      childrenByParent.get(category.parent_id) || [];

    existingChildren.push(category);
    childrenByParent.set(category.parent_id, existingChildren);
    directChildCount += 1;
  }

  for (const children of childrenByParent.values()) {
    children.sort(compareCategories);
  }

  return {
    roots,
    childrenByParent,
    directChildCount,
    deeperCategoryCount,
  };
}

function LoadingCategories() {
  const { language, r } = useMarketplaceTranslation();
  return (
    <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
      {r([0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse rounded-[22px] bg-neutral-100"
        />
      )))}
    </div>
  );
}

export default function StoreCategoryManagementCard() {
  const { language, r } = useMarketplaceTranslation();
  const {
    categories,
    loading,
    error,
    creatingRootCategory,
    creatingChildParentId,
    renamingCategoryId,
    deletingCategoryId,
    createRootCategory,
    createChildCategory,
    renameCategory,
    deleteCategory,
  } = useMyAreaStoreCategories();

  const [newRootName, setNewRootName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [childFormParentId, setChildFormParentId] =
    useState<string | null>(null);
  const [childSuccess, setChildSuccess] = useState<{
    parentId: string;
    message: string;
  } | null>(null);
  const [editingCategoryId, setEditingCategoryId] =
    useState<string | null>(null);
  const [renameSuccess, setRenameSuccess] = useState<{
    categoryId: string;
    message: string;
  } | null>(null);
  const [deleteConfirmCategoryId, setDeleteConfirmCategoryId] =
    useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] =
    useState<string | null>(null);

  const categoryActionBusy =
    creatingRootCategory ||
    Boolean(creatingChildParentId) ||
    Boolean(renamingCategoryId) ||
    Boolean(deletingCategoryId) ||
    Boolean(childFormParentId) ||
    Boolean(editingCategoryId) ||
    Boolean(deleteConfirmCategoryId);

  async function handleCreateRootCategory(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = normalizeStoreCategoryName(newRootName);

    setCreateError(null);
    setCreateSuccess(null);

    if (!cleanName) {
      setCreateError(marketplaceMessage("category.enter_a_category_name.730cbc"));
      return;
    }

    if (cleanName.length > STORE_CATEGORY_NAME_MAX_LENGTH) {
      setCreateError(
        marketplaceMessage("category.the_category_name_can_contain_up_to_value.0188e5", { p0: String(STORE_CATEGORY_NAME_MAX_LENGTH) })
      );
      return;
    }

    try {
      const createdCategory = await createRootCategory(cleanName);

      setNewRootName("");
      setCreateSuccess(
        marketplaceMessage("category.parent_category_value_added.9e2121", { p0: String(createdCategory.name) })
      );
    } catch (creationError) {
      setCreateError(
        safeMarketplaceError(creationError, marketplaceMessage("category.the_parent_category_could_not_be_added.fb0b3a"))
      );
    }
  }

  function openChildForm(parentId: string) {
    setEditingCategoryId(null);
    setRenameSuccess(null);
    setDeleteConfirmCategoryId(null);
    setDeleteSuccess(null);
    setChildFormParentId(parentId);
    setChildSuccess(null);
  }

  function closeChildForm() {
    setChildFormParentId(null);
  }

  async function handleCreateChildCategory(
    parentId: string,
    name: string
  ) {
    const createdCategory = await createChildCategory(parentId, name);

    setChildFormParentId(null);
    setChildSuccess({
      parentId,
      message: marketplaceMessage("category.subcategory_value_added.d94a43", { p0: String(createdCategory.name) }),
    });
  }

  function openRenameForm(categoryId: string) {
    setChildFormParentId(null);
    setChildSuccess(null);
    setDeleteConfirmCategoryId(null);
    setDeleteSuccess(null);
    setEditingCategoryId(categoryId);
    setRenameSuccess(null);
  }

  function closeRenameForm() {
    setEditingCategoryId(null);
  }

  async function handleRenameCategory(
    categoryId: string,
    name: string
  ) {
    const updatedCategory = await renameCategory(
      categoryId,
      name
    );

    setEditingCategoryId(null);
    setRenameSuccess({
      categoryId,
      message: marketplaceMessage("category.category_renamed_value.dd55a2", { p0: String(updatedCategory.name) }),
    });
  }

  function openDeleteConfirm(categoryId: string) {
    setChildFormParentId(null);
    setChildSuccess(null);
    setEditingCategoryId(null);
    setRenameSuccess(null);
    setDeleteSuccess(null);
    setDeleteConfirmCategoryId(categoryId);
  }

  function closeDeleteConfirm() {
    setDeleteConfirmCategoryId(null);
  }

  async function handleDeleteCategory(
    categoryId: string
  ) {
    const deletedCategory =
      await deleteCategory(categoryId);

    setDeleteConfirmCategoryId(null);

    const removedLinksText =
      deletedCategory.removedListingLinks === 1
        ? marketplaceMessage("category.1_listing_link_removed.bf1a97")
        : marketplaceMessage("category.value_listing_links_removed.1c41c2", { p0: String(deletedCategory.removedListingLinks) });

    setDeleteSuccess(
      marketplaceMessage("category.category_value_deleted_value_listings_were_preserved.b990e1", { p0: String(deletedCategory.name), p1: String(removedLinksText) })
    );
  }

  const {
    roots,
    childrenByParent,
    directChildCount,
    deeperCategoryCount,
  } = buildCategoryView(categories);

  return (
    <section className="min-w-0 overflow-hidden rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            {r(marketplaceMessage("category.shop_structure.f31e91"))}</p>

          <h2 className="mt-2 text-2xl font-black">
            {r(marketplaceMessage("category.your_shop_categories.ee1750"))}</h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            {r(marketplaceMessage("category.these_categories_belong_only_to_the_active_identity.1e6abd"))}</p>
        </div>

        {r(!loading && !error ? (
          <span className="w-fit whitespace-nowrap rounded-full bg-neutral-100 px-2.5 py-1.5 text-[11px] font-black text-neutral-600">
            {r(roots.length)}  {r(marketplaceMessage("category.parent_categories.036de0"))} {r(directChildCount)}  {r(marketplaceMessage("category.subcategories.1bf744"))}</span>
        ) : null)}
      </div>

      <form
        onSubmit={handleCreateRootCategory}
        className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-[#fbfbfa] p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
              {r(marketplaceMessage("category.new_parent_category.033804"))}</span>

            <input
              value={newRootName}
              onChange={(event) => {
                setNewRootName(event.target.value);
                setCreateError(null);
                setCreateSuccess(null);
              }}
              maxLength={STORE_CATEGORY_NAME_MAX_LENGTH}
              placeholder={r(marketplaceMessage("category.for_example_spare_parts.5350b8"))}
              disabled={categoryActionBusy}
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <button
            type="submit"
            disabled={categoryActionBusy || !newRootName.trim()}
            className="inline-flex w-full justify-center rounded-full bg-black px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {r(creatingRootCategory ? marketplaceMessage("category.adding.57ede3") : marketplaceMessage("category.add_parent_category.db594d"))}
          </button>
        </div>

        <div className="mt-2 flex items-start justify-between gap-3">
          <p className="text-xs leading-5 text-neutral-500">
            {r(marketplaceMessage("category.the_category_will_be_added_to_the_active.bcaa0e"))}</p>

          <span className="shrink-0 text-xs font-black text-neutral-400">
            {r(newRootName.length)}/{r(STORE_CATEGORY_NAME_MAX_LENGTH)}
          </span>
        </div>

        {r(createError ? (
          <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {r(createError)}
          </p>
        ) : null)}

        {r(createSuccess ? (
          <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            {r(createSuccess)}
          </p>
        ) : null)}
      </form>

      {r(deleteSuccess ? (
        <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold leading-6 text-emerald-800">
          {r(deleteSuccess)}
        </p>
      ) : null)}

      {r(loading ? <LoadingCategories /> : null)}

      {r(!loading && error ? (
        <div className="mt-5 rounded-[22px] border border-red-100 bg-red-50 p-5">
          <p className="font-black text-red-950">
            {r(marketplaceMessage("category.categories_could_not_be_loaded.acac19"))}</p>
          <p className="mt-2 text-sm leading-6 text-red-800">{r(error)}</p>
        </div>
      ) : null)}

      {r(!loading && !error && roots.length === 0 ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-5">
          <p className="font-black">{r(marketplaceMessage("category.no_categories_added_yet.1d217c"))}</p>
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            {r(marketplaceMessage("category.add_your_first_parent_category_using_the_form.096ebe"))}</p>
        </div>
      ) : null)}

      {r(!loading && !error && roots.length > 0 ? (
        <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          {r(roots.map((rootCategory) => {
            const children =
              childrenByParent.get(rootCategory.id) || [];

            return (
              <article
                key={rootCategory.id}
                className="rounded-2xl border border-neutral-200 bg-[#fbfbfa] p-3"
              >
                <StoreCategoryRenameControl
                  category={rootCategory}
                  level="root"
                  editing={editingCategoryId === rootCategory.id}
                  saving={renamingCategoryId === rootCategory.id}
                  disabled={categoryActionBusy}
                  successMessage={renameSuccess?.categoryId === rootCategory.id
                      ? renameSuccess.message
                      : null}
                  trailing={children.length > 0 ? (
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-neutral-500">
                        {r(children.length)}
                      </span>
                    ) : null}
                  footer={<StoreCategoryDeleteControl
                      category={rootCategory}
                      level="root"
                      childCount={children.length}
                      confirming={deleteConfirmCategoryId ===
                        rootCategory.id}
                      deleting={deletingCategoryId ===
                        rootCategory.id}
                      disabled={categoryActionBusy &&
                        deleteConfirmCategoryId !==
                          rootCategory.id}
                      onStart={() =>
                        openDeleteConfirm(rootCategory.id)}
                      onCancel={closeDeleteConfirm}
                      onConfirm={() =>
                        handleDeleteCategory(rootCategory.id)}
                    />}
                  onStartEdit={() =>
                    openRenameForm(rootCategory.id)}
                  onSave={(name) =>
                    handleRenameCategory(
                      rootCategory.id,
                      name
                    )}
                  onCancel={closeRenameForm}
                />

                {r(children.length > 0 ? (
                  <div className="mt-3 space-y-2 border-l-2 border-neutral-200 pl-3">
                    {r(children.map((childCategory) => (
                      <StoreCategoryRenameControl
                        key={childCategory.id}
                        category={childCategory}
                        level="child"
                        editing={editingCategoryId === childCategory.id}
                        saving={renamingCategoryId === childCategory.id}
                        disabled={categoryActionBusy}
                        successMessage={renameSuccess?.categoryId ===
                          childCategory.id
                            ? renameSuccess.message
                            : null}
                        footer={<StoreCategoryDeleteControl
                            category={childCategory}
                            level="child"
                            childCount={0}
                            confirming={deleteConfirmCategoryId ===
                              childCategory.id}
                            deleting={deletingCategoryId ===
                              childCategory.id}
                            disabled={categoryActionBusy &&
                              deleteConfirmCategoryId !==
                                childCategory.id}
                            onStart={() =>
                              openDeleteConfirm(
                                childCategory.id
                              )}
                            onCancel={closeDeleteConfirm}
                            onConfirm={() =>
                              handleDeleteCategory(
                                childCategory.id
                              )}
                          />}
                        onStartEdit={() =>
                          openRenameForm(childCategory.id)}
                        onSave={(name) =>
                          handleRenameCategory(
                            childCategory.id,
                            name
                          )}
                        onCancel={closeRenameForm}
                      />
                    )))}
                  </div>
                ) : null)}
                <div className="mt-3 border-t border-neutral-200 pt-3">
                  {r(childFormParentId === rootCategory.id ? (
                    <StoreCategoryChildCreateForm
                      parentName={rootCategory.name}
                      creating={creatingChildParentId === rootCategory.id}
                      onCreate={(name) =>
                        handleCreateChildCategory(
                          rootCategory.id,
                          name
                        )}
                      onCancel={closeChildForm}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => openChildForm(rootCategory.id)}
                      disabled={categoryActionBusy}
                      className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-black text-neutral-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {r(marketplaceMessage("category.add_subcategory.c03d9e"))}</button>
                  ))}

                  {r(childSuccess?.parentId === rootCategory.id &&
                  childFormParentId !== rootCategory.id ? (
                    <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-xs font-semibold leading-5 text-emerald-800">
                      {r(childSuccess.message)}
                    </p>
                  ) : null)}
                </div>
              </article>
            );
          }))}
        </div>
      ) : null)}

      {r(!loading && !error && deeperCategoryCount > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {r(deeperCategoryCount)}  {r(marketplaceMessage("category.categories_at_deeper_levels_are_not_shown_in.15dc80"))}</div>
      ) : null)}
    </section>
  );
}
