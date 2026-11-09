"use client";
import Link from "next/link";
import {useV2Translation} from "../../../shared/i18n/V2LanguageProvider";
import {serviceEditorMessages} from "../model/serviceEditorMessages";
import {useMyServicePublications} from "../model/useMyServicePublications";
import {serviceLocationLabel, servicePriceLabel} from "../../../entities/service/model/publicService";
import ServiceOwnerImage from "./ServiceOwnerImage";

const button = "inline-flex min-h-11 items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-3 text-sm font-bold hover:border-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-40";
export default function MyAreaServicesSection() {
  const {t, language} = useV2Translation(serviceEditorMessages), owner = useMyServicePublications(), {state, context} = owner;
  if (context.anonymous) return null;
  return <section aria-labelledby="my-services-heading" className="min-w-0 rounded-[32px] border border-teal-200 bg-teal-50/40 p-4 sm:p-6">
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="my-services-heading" className="text-2xl font-black">{t("myServices")}</h2><p className="mt-2 text-sm text-neutral-600">{t("manageHelp")}</p></div>
      <Link href="/v2/services/new" className={button}>{t("addService")}</Link>
    </header>
    {context.loading || state.loading && owner.actor ? <p role="status" className="py-6">{t("loading")}</p> : null}
    {context.error ? <div role="alert" className="rounded-2xl bg-white p-4"><p>{t("identityUnavailable")}</p><button type="button" className={`${button} mt-3`} onClick={context.refresh}>{t("retry")}</button></div> : null}
    {state.error && owner.actor ? <div role="alert" className="mb-4 rounded-2xl bg-white p-4"><p>{t("ownerError")}</p><button type="button" className={`${button} mt-3`} onClick={state.items.length ? owner.loadMore : owner.reload}>{t("retry")}</button></div> : null}
    {state.notice ? <div role={state.notice === "statusError" ? "alert" : "status"} className="mb-4 rounded-2xl bg-white p-4"><p>{t(state.notice)}</p>
      {state.notice === "statusError" ? <button type="button" className={`${button} mt-3`} onClick={owner.reload}>{t("reload")}</button> : null}</div> : null}
    {!state.loading && !state.error && owner.actor && state.items.length === 0 ? <p className="rounded-2xl bg-white p-5">{t("emptyOwner")}</p> : null}
    {state.items.length && owner.actor ? <>
      <p className="mb-3 text-sm text-neutral-500">{t("ownerCount", {count: state.total})}</p>
      <div className="divide-y divide-neutral-100 overflow-hidden rounded-3xl bg-white">
        {state.items.map(row => {
          const service = row.service, editHref = `/v2/my-area/services/${service.id}/edit`, href = service.status === "published" ? `/v2/service/${service.id}` : editHref;
          const image = row.images.find(image => image.isPrimary) ?? row.images[0], busy = state.busyId === service.id;
          const status = service.status === "published" ? "active" : service.status === "archived" ? "paused" : "draft";
          return <article key={service.id} className="grid min-w-0 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5" data-service-id={service.id}>
            <Link href={href} className="flex min-w-0 items-center gap-4 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
              {image ? <ServiceOwnerImage actor={owner.actor!} source={image.thumbnailUrl} className="h-20 w-28 shrink-0 rounded-xl" />
                : <span className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-xs text-neutral-500">{t("noImage")}</span>}
              <span className="min-w-0"><span className="block break-words text-base font-black">{service.title}</span>
                {service.description ? <span className="mt-1 line-clamp-2 break-words text-sm leading-6 text-neutral-600">{service.description}</span> : null}
                <span className="mt-1 block text-sm text-neutral-500">{serviceLocationLabel(service) || t("locationMissing")}</span>
                <span className="mt-1 block text-sm font-semibold text-neutral-600">{t(status)}</span></span>
            </Link>
            <div className="flex flex-wrap items-center justify-between gap-3 sm:w-52 sm:flex-col sm:items-stretch">
              <p className="font-bold sm:text-right">{servicePriceLabel(service, language)}</p>
              {service.status === "draft" ? <Link href={editHref} className={button}>{t("publish")}</Link> : <label className="min-w-36 text-sm font-semibold">
                <span className="sr-only">{t("status")}: {service.title}</span>
                <select value={service.status} disabled={state.busyId !== null || state.uncertainIds.includes(service.id)} aria-busy={busy}
                  onChange={event => {const value = event.target.value; if (value === "published" || value === "archived") void owner.changeStatus(row, value);}}
                  className={`min-h-11 w-full rounded-full border px-4 py-3 disabled:opacity-40 ${service.status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-neutral-100 text-neutral-700"}`}>
                  <option value="published">{t("active")}</option><option value="archived">{t("paused")}</option>
                </select>
              </label>}
              <Link href={editHref} className={button}>{t("edit")}</Link>
            </div>
          </article>;
        })}
      </div>
      {state.next !== null ? <button type="button" className={`${button} mt-5 w-full`} disabled={state.moreLoading} onClick={() => void owner.loadMore()}>{t(state.moreLoading ? "loading" : "loadMore")}</button> : null}
    </> : null}
  </section>;
}
