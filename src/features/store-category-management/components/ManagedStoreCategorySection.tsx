"use client";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { useManagedStoreCategoryManagement } from "../model/useManagedStoreCategoryManagement";
import { useBoundManagementActor } from "../model/useBoundManagementActor";
import { storeCategoryManagementMessages } from "../model/storeCategoryManagementMessages";
import ManagedStoreCategoryEditor, { categoryButton, categoryPrimaryButton } from "./ManagedStoreCategoryEditor";
import ManagedStoreCategoryRows from "./ManagedStoreCategoryRows";

function BoundManagement({ actor, blocked }: { actor: PublicationActor; blocked: boolean }) {
  const { t } = useV2Translation(storeCategoryManagementMessages);
  const management = useManagedStoreCategoryManagement({ actor, blocked });
  const editor = management.editor;
  const rootEditor = editor?.kind === "create" && editor.parentId === null;
  const detachedEditor = !!editor && !rootEditor && (editor.kind === "create"
    ? !management.categories.some(category => category.id === editor.parentId && category.parent_id === null)
    : !management.categories.some(category => category.id === editor.categoryId));
  return <div className="space-y-5" aria-busy={blocked || management.loading || !!management.busy}>
    <button type="button" className={categoryPrimaryButton} disabled={blocked || management.disabled || !!editor}
      onClick={() => management.beginCreate()}>{t("addRoot")}</button>
    {management.loading ? <p role="status" className="text-sm text-neutral-600">{t("loading")}</p> : null}
    {management.error ? <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      {t(management.error)}</p> : null}
    {management.outcome ? <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
      {t(management.outcome.code, { name: management.outcome.name })}</p> : null}
    {rootEditor ? <ManagedStoreCategoryEditor management={management} blocked={blocked} /> : null}
    {management.loaded && management.categories.length === 0 ? <div className="rounded-2xl border border-dashed border-neutral-300 p-5">
      <h3 className="font-bold">{t("empty")}</h3><p className="mt-2 text-sm leading-6 text-neutral-600">{t("emptyHelp")}</p>
    </div> : null}
    <ManagedStoreCategoryRows management={management} blocked={blocked} />
    {detachedEditor ? <div className="space-y-2">
      <h3 className="font-bold">{t("detached")}</h3>
      <ManagedStoreCategoryEditor management={management} blocked={blocked} />
    </div> : null}
    <button type="button" className={categoryButton} disabled={blocked || management.loading || !!management.busy}
      onClick={() => { void management.refresh(); }}>{t(management.reviewRequired ? "checkSaved" : "refresh")}</button>
  </div>;
}

export default function ManagedStoreCategorySection({ actor, loading, error }: {
  actor: PublicationActor | null; loading: boolean; error: string | null;
}) {
  const { t } = useV2Translation(storeCategoryManagementMessages);
  const bound = useBoundManagementActor(actor);
  const blocked = !actor || loading || !!error;
  return <section id="my-area-categories" aria-labelledby="my-area-categories-title"
    className="min-w-0 scroll-mt-28 space-y-5 rounded-[30px] border border-amber-200 bg-white p-5 shadow-sm sm:p-7">
    <div>
      <h2 id="my-area-categories-title" className="text-2xl font-black">{t("title")}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{t("help")}</p>
    </div>
    {blocked ? <p role="status" className="text-sm text-neutral-600">{t(loading ? "checking" : "identityUnavailable")}</p> : null}
    {bound ? <BoundManagement key={`${bound.userId}:${bound.identityId}`} actor={bound} blocked={blocked} /> : null}
  </section>;
}
