"use client";
import { useId } from "react";
import { STORE_CATEGORY_NAME_MAX_LENGTH } from "../../../entities/store-category/model/types";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import type { ManagedStoreCategoryManagement } from "../model/useManagedStoreCategoryManagement";
import { storeCategoryManagementMessages } from "../model/storeCategoryManagementMessages";

const categoryButtonBase = "inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-40";
export const categoryButton = `${categoryButtonBase} border-neutral-200 bg-white hover:border-neutral-400`;
export const categoryPrimaryButton = `${categoryButtonBase} border-transparent bg-neutral-950 text-white hover:bg-neutral-800`;

export default function ManagedStoreCategoryEditor({ management, blocked, parentName }: {
  management: ManagedStoreCategoryManagement; blocked: boolean; parentName?: string;
}) {
  const { t } = useV2Translation(storeCategoryManagementMessages);
  const id = useId();
  const editor = management.editor;
  if (!editor) return null;
  const deleting = editor.kind === "delete";
  const confirmed = management.outcome?.code === "review_matches";
  const working = blocked || !!management.busy || management.loading;
  const readOnly = working || management.reviewRequired || confirmed;
  const title = deleting ? t("removeTitle") : editor.kind === "rename" ? t("renameTitle")
    : editor.parentId ? t("createChildTitle", { name: parentName ?? t("parentMissing") }) : t("createRootTitle");

  return <form aria-labelledby={`${id}-heading`} onSubmit={event => { event.preventDefault(); void management.submit(); }}
    className="min-w-0 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
    <h4 id={`${id}-heading`} className="break-words text-lg font-bold">{title}</h4>
    {deleting ? <p className="break-words text-sm leading-6">{t("deleteHelp", { name: editor.name })}</p>
      : <div>
        <label htmlFor={`${id}-name`} className="mb-2 block text-sm font-bold">{t("name")}</label>
        <input id={`${id}-name`} name="categoryName" type="text" value={editor.name} readOnly={readOnly}
          maxLength={STORE_CATEGORY_NAME_MAX_LENGTH * 2} aria-describedby={`${id}-help`}
          onChange={event => management.changeName(Array.from(event.target.value).slice(0, STORE_CATEGORY_NAME_MAX_LENGTH).join(""))}
          className="min-h-11 w-full min-w-0 rounded-xl border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 read-only:bg-neutral-100" />
        <p id={`${id}-help`} className="mt-2 text-xs leading-5 text-neutral-600">{t("nameHelp")}</p>
      </div>}
    {management.reviewRequired ? <p className="text-sm leading-6">{t("reviewHelp")}</p> : null}
    <div className="flex flex-wrap gap-2">
      {!confirmed ? <button type="submit" disabled={!management.canSubmit || blocked}
        className={deleting ? `${categoryPrimaryButton} bg-red-800 hover:bg-red-900` : categoryPrimaryButton}>
        {management.busy ? t(deleting ? "removing" : "saving")
          : t(deleting ? "confirmRemove" : editor.kind === "create" ? "create" : "save")}
      </button> : null}
      <button type="button" disabled={working || management.reviewRequired} className={categoryButton}
        onClick={management.cancelEdit}>{t(confirmed ? "done" : "cancel")}</button>
    </div>
  </form>;
}
