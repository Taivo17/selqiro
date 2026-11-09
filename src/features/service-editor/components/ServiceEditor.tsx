"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { ServiceOwnerSnapshot } from "../../../entities/service/model/servicePublication";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { serviceEditorMessages, type ServiceMessageKey } from "../model/serviceEditorMessages";
import { serviceEditorForm, serviceEditorDirty, buildServiceContent, type ServiceEditorForm } from "../model/serviceEditorForm";
import { useServiceOwnerContext } from "../model/useServiceOwnerContext";
import { useServicePublication } from "../model/useServicePublication";
import { useServicePolicy } from "../model/useServicePolicy";
import ServiceFields from "./ServiceFields";
import ServiceGalleryEditor, {serviceEditorPhotos, serviceGalleryDirty, type ServiceEditorPhoto} from "./ServiceGalleryEditor";
import ServicePolicyGate from "./ServicePolicyGate";
import ServicePublicationActions from "./ServicePublicationActions";

const button = "inline-flex min-h-12 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-bold disabled:opacity-40";
export default function ServiceEditor({userId, serviceId}: {userId: string; serviceId: string | null}) {
  const {t} = useV2Translation(serviceEditorMessages), router = useRouter(), context = useServiceOwnerContext(userId, serviceId);
  const publication = useServicePublication(context.actor, serviceId, context.active, context.canAct);
  const policy = useServicePolicy(context.actor, context.active, context.canAct);
  const refreshPolicy = policy.refresh;
  const [baseline, setBaseline] = useState<ServiceEditorForm>(() => serviceEditorForm()), [form, setForm] = useState<ServiceEditorForm>(() => serviceEditorForm());
  const [photos, setPhotos] = useState<ServiceEditorPhoto[]>([]), [formSnapshot, setFormSnapshot] = useState<ServiceOwnerSnapshot | null>(null);
  const [error, setError] = useState<ServiceMessageKey | null>(null);
  const [requiresReload, setRequiresReload] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const submittedRequest = useRef<string | null>(null), completion = useRef<{snapshot: ServiceOwnerSnapshot; preserveDraft: boolean} | null>(null);
  const createHandoff = useRef<string | null>(null), policyRefreshed = useRef<string | null>(null);
  useEffect(() => {
    if (!context.snapshot) return;
    const next = serviceEditorForm(context.snapshot.service);
    // Adopt one externally verified snapshot atomically. Until the matching form
    // and gallery are committed, editable remains false; no draft is rebased silently.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBaseline(next); setForm(next); setPhotos(serviceEditorPhotos(context.snapshot.images)); setFormSnapshot(context.snapshot); setError(null); setRequiresReload(false);
  }, [context.snapshot]);
  const dirty = serviceEditorDirty(baseline, form) || serviceGalleryDirty(context.snapshot?.images ?? [], photos);
  const phase = publication.view.phase, working = phase === "busy", session = publication.session;
  // Returning from a native file chooser starts a soft actor check before its
  // change event. Keep local edits available; only server actions wait for ready.
  const editable = context.active && !!session && phase === "editing" && !navigating && (!serviceId || !!context.snapshot && formSnapshot === context.snapshot);
  const confirmed = publication.view.confirmed, requestKey = publication.view.result?.request_key;
  const {active, canAct, snapshot, adopt} = context;
  useEffect(() => {
    if (phase !== "published" || !confirmed || !session || !active || !canAct()) return;
    if (!serviceId) {
      if (!requestKey || createHandoff.current === requestKey) return;
      createHandoff.current = requestKey;
      void (async () => {
        await session.inspect();
        const checked = session.getSnapshot();
        if (!canAct() || checked.phase !== "published" || checked.result?.request_key !== requestKey
          || checked.confirmed?.service.id !== confirmed.service.id) {createHandoff.current = null; return;}
        await session.reset(() => {setNavigating(true); router.replace(`/v2/my-area/services/${confirmed.service.id}/edit`);});
        createHandoff.current = null;
      })(); return;
    }
    if (completion.current?.snapshot !== confirmed) {
      const preserveDraft = dirty && requestKey !== submittedRequest.current;
      completion.current = {snapshot: confirmed, preserveDraft};
      if (!preserveDraft) adopt(confirmed);
      // A verified completion from another tab must mark this local draft stale
      // before finishEdit retires that operation and makes fields editable again.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      else setRequiresReload(true);
    }
    if (!completion.current.preserveDraft && (snapshot !== confirmed || formSnapshot !== confirmed)) return;
    void session.finishEdit(confirmed, completion.current.preserveDraft);
  }, [phase, confirmed, session, active, canAct, serviceId, requestKey, dirty, adopt, snapshot, formSnapshot, router]);
  useEffect(() => {
    if (publication.view.message === "policiesChanged" && requestKey !== policyRefreshed.current) {policyRefreshed.current = requestKey ?? "changed"; refreshPolicy();}
  }, [publication.view.message, requestKey, refreshPolicy]);
  useEffect(() => {const unload = (event: BeforeUnloadEvent) => {if (dirty) {event.preventDefault(); event.returnValue = "";}};
    window.addEventListener("beforeunload", unload); return () => window.removeEventListener("beforeunload", unload);}, [dirty]);
  const leave = (event: MouseEvent<HTMLAnchorElement>) => {if ((dirty || !["editing", "published", "closed"].includes(phase)) && !window.confirm(t("leaveConfirm"))) event.preventDefault();};
  const reload = () => {if (dirty && !window.confirm(t("reloadConfirm"))) return; void session?.inspect(); context.reload();};
  const submit = () => {
    if (!editable || !context.ready || !context.canAct() || !session || !policy.snapshot || requiresReload) return;
    setError(null);
    try {const content = buildServiceContent(form, serviceId, context.snapshot?.service);
      void session.start({content, expectedRevision: context.snapshot?.editRevision ?? null,
        gallery: photos.map(photo => photo.image ? {imageId: photo.image.id, isPrimary: photo.isPrimary} : {file: photo.file, isPrimary: photo.isPrimary}),
        policySnapshot: policy.snapshot}, key => {submittedRequest.current = key;});
    } catch {setError("invalidFields");}
  };
  const publish = !serviceId || context.snapshot?.service.status === "draft";
  const view = phase === "editing" && dirty && ["changesSaved", "changedAfterSave", "published"].includes(publication.view.message)
    ? {...publication.view, message: ""} : publication.view;
  return <div className="mx-auto min-w-0 max-w-5xl space-y-6 pb-8" data-service-editor-id={serviceId ?? "create"} data-service-editor-mode={editable ? "editing" : "read-only"}>
    <header><Link href="/v2/my-area#my-area-services" onClick={leave} className="inline-flex min-h-11 items-center font-bold underline">{t("myArea")}</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t(serviceId ? "editService" : "addService")}</h1>
      <p className="mt-3 leading-7 text-neutral-600">{t(serviceId ? "editHelp" : "createHelp")}</p></header>
    {!context.active || serviceId && !context.snapshot ? <section className="rounded-3xl border border-teal-200 bg-white p-6"><p role={context.error ? "alert" : "status"}>{t(context.error && context.error in serviceEditorMessages.en ? context.error as ServiceMessageKey : "loading")}</p>
      {context.error ? <button type="button" className={`${button} mt-4`} onClick={context.retry}>{t("retry")}</button> : null}</section> : <>
      <ServiceFields form={form} original={context.snapshot?.service} disabled={!editable} onChange={next => {if (editable && context.canAct()) {setForm(next); setError(null);}}} />
      <ServiceGalleryEditor title={form.title} photos={photos} actor={context.actor} disabled={!editable} onChange={next => {if (editable && context.canAct()) {setPhotos(next); setError(null);}}} />
      <ServicePolicyGate policy={policy} disabled={!editable || !context.ready} />
      <ServicePublicationActions key={publication.view.intent?.requestKey ?? "form"} session={session} view={view} ready={context.ready} publish={publish} error={error} canSubmit={editable && context.ready && !requiresReload && !!policy.snapshot && (publish || dirty)} onSubmit={submit} />
      <section className="rounded-3xl border border-neutral-200 bg-white p-5">
        {phase === "editing" ? <p className="text-sm">{t(dirty ? "unsaved" : "noChanges")}</p> : null}
        <div className="mt-3 flex flex-wrap gap-3">
          {serviceId ? <button type="button" className={button} disabled={working || phase !== "editing" || !context.ready} onClick={reload}>{t("reload")}</button> : null}
          <Link href="/v2/my-area#my-area-services" onClick={leave} className={button}>{t("myArea")}</Link>
          {context.snapshot?.service.status === "published" ? <Link className={button} href={`/v2/service/${context.snapshot.service.id}`} target="_blank" rel="noreferrer">{t("viewPublic")}</Link> : null}
        </div>
      </section>
    </>}
  </div>;
}
