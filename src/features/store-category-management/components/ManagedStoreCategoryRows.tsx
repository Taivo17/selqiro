"use client";
import type { StoreCategory } from "../../../entities/store-category/model/types";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import type { ManagedStoreCategoryManagement } from "../model/useManagedStoreCategoryManagement";
import { managedStoreCategoryTree } from "../model/managedStoreCategoryTree";
import { storeCategoryManagementMessages } from "../model/storeCategoryManagementMessages";
import ManagedStoreCategoryEditor, { categoryButton } from "./ManagedStoreCategoryEditor";

type Props = { management: ManagedStoreCategoryManagement; blocked: boolean };

function CategoryRow({ category, level, childCount, management, blocked }: Props & {
  category: StoreCategory; level: "root" | "child" | "other"; childCount: number;
}) {
  const { t } = useV2Translation(storeCategoryManagementMessages);
  const editing = management.editor?.kind !== "create" && management.editor?.categoryId === category.id;
  const disabled = blocked || management.disabled || !!management.editor;
  return <div className="min-w-0 space-y-3" data-category-id={category.id} data-category-level={level}>
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t(level)}</p>
        <h3 className="mt-1 break-words font-bold">{category.name}</h3>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button type="button" disabled={disabled} aria-label={t("renameCategory", { name: category.name })}
          className={categoryButton} onClick={() => management.beginRename(category.id)}>{t("rename")}</button>
        <button type="button" disabled={disabled || childCount > 0} aria-label={t("removeCategory", { name: category.name })}
          className={categoryButton} onClick={() => management.beginDelete(category.id)}>{t("remove")}</button>
      </div>
    </div>
    {childCount > 0 ? <p className="text-xs leading-5 text-neutral-500">{t("childrenPreventRemoval")}</p> : null}
    {editing ? <ManagedStoreCategoryEditor management={management} blocked={blocked} /> : null}
  </div>;
}

export default function ManagedStoreCategoryRows({ management, blocked }: Props) {
  const { t } = useV2Translation(storeCategoryManagementMessages);
  const tree = managedStoreCategoryTree(management.categories);
  return <div className="space-y-5">
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
      {tree.roots.map(root => {
        const children = tree.childrenByParent.get(root.id) ?? [];
        const creatingChild = management.editor?.kind === "create" && management.editor.parentId === root.id;
        return <article key={root.id} className="min-w-0 space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <CategoryRow category={root} level="root" childCount={children.length} management={management} blocked={blocked} />
          {children.length ? <div className="space-y-4 border-l-2 border-neutral-200 pl-3">
            {children.map(child => <div key={child.id} className="min-w-0 rounded-xl border border-neutral-200 bg-white p-3">
              <CategoryRow category={child} level="child" childCount={(tree.childrenByParent.get(child.id) ?? []).length}
                management={management} blocked={blocked} />
            </div>)}
          </div> : <p className="text-sm text-neutral-500">{t("noChildren")}</p>}
          {creatingChild ? <ManagedStoreCategoryEditor management={management} blocked={blocked} parentName={root.name} />
            : <button type="button" className={categoryButton} disabled={blocked || management.disabled || !!management.editor}
              aria-label={t("addChildTo", { name: root.name })} onClick={() => management.beginCreate(root.id)}>{t("addChild")}</button>}
        </article>;
      })}
    </div>
    {tree.other.length ? <section className="space-y-3 rounded-2xl border border-neutral-200 p-4">
      <h3 className="font-bold">{t("otherTitle")}</h3>
      <p className="text-sm leading-6 text-neutral-600">{t("otherHelp")}</p>
      {tree.other.map(category => <div key={category.id} className="space-y-2 rounded-xl bg-neutral-50 p-3">
        <CategoryRow category={category} level="other" childCount={(tree.childrenByParent.get(category.id) ?? []).length}
          management={management} blocked={blocked} />
        <p className="break-words text-xs text-neutral-500">{category.parent_id && tree.byId.has(category.parent_id)
          ? t("parentName", { name: tree.byId.get(category.parent_id)!.name }) : t("parentMissing")}</p>
      </div>)}
    </section> : null}
  </div>;
}
