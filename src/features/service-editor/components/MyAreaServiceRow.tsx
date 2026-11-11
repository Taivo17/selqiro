"use client";
import Link from "next/link";
import {useMemo} from "react";
import {useV2Translation} from "../../../shared/i18n/V2LanguageProvider";
import {serviceEditorMessages} from "../model/serviceEditorMessages";
import {serviceActivityMessages} from "../../service-activity/model/serviceActivityMessages";
import {serviceActivityDisplay, serviceActivityOf, type ServiceOwnerActivitySnapshot} from "../../../entities/service/model/serviceActivity";
import {serviceLocationLabel, servicePriceLabel} from "../../../entities/service/model/publicService";
import type {useMyServicePublications} from "../model/useMyServicePublications";
import ServiceActivityControl from "../../service-activity/components/ServiceActivityControl";
import ServiceOwnerImage from "./ServiceOwnerImage";

const button = "inline-flex min-h-11 items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-3 text-sm font-bold hover:border-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-40";
export default function MyAreaServiceRow({row, owner, now}: {row: ServiceOwnerActivitySnapshot; owner: ReturnType<typeof useMyServicePublications>; now: number}) {
  const {t, language} = useV2Translation(serviceEditorMessages), {t: activityText} = useV2Translation(serviceActivityMessages);
  const initial = useMemo(() => serviceActivityOf(row), [row]);
  const {service} = row, display = serviceActivityDisplay(initial, now), {state} = owner;
  const editHref = `/v2/my-area/services/${service.id}/edit`, href = display.state === "active" ? `/v2/service/${service.id}` : editHref;
  const image = row.images.find(image => image.isPrimary) ?? row.images[0], busy = state.busyId === service.id;
  if (!owner.actor) return null;
  return <article className="grid min-w-0 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5" data-service-id={service.id}>
    <div className="min-w-0">
      <Link href={href} className="flex min-w-0 items-center gap-4 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
        {image ? <ServiceOwnerImage actor={owner.actor} source={image.thumbnailUrl} className="h-20 w-28 shrink-0 rounded-xl" />
          : <span className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-xs text-neutral-500">{t("noImage")}</span>}
        <span className="min-w-0"><span className="block break-words text-base font-black">{service.title}</span>
          {service.description ? <span className="mt-1 line-clamp-2 break-words text-sm leading-6 text-neutral-600">{service.description}</span> : null}
          <span className="mt-1 block text-sm text-neutral-500">{serviceLocationLabel(service) || t("locationMissing")}</span></span>
      </Link>
      <div className="mt-3 sm:pl-32"><ServiceActivityControl actor={owner.actor} serviceId={service.id} scopeKey={owner.scopeKey}
        initial={initial} title={service.title} now={now} blocked={state.busyId !== null || state.uncertainIds.includes(service.id)}
        canAct={() => owner.canActService(service.id)} onVerified={owner.adoptActivity}
        onBusyChange={value => owner.activityBusy(service.id, value)} onCheckRequired={value => owner.activityCheckRequired(service.id, value)} /></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 sm:w-52 sm:flex-col sm:items-stretch sm:justify-start">
      <p className="font-bold sm:text-right">{servicePriceLabel(service, language)}</p>
      {service.status === "draft" ? <Link href={editHref} className={button}>{t("publish")}</Link> : <label className="min-w-36 text-sm font-semibold">
        <span className="sr-only">{t("status")}: {service.title}</span>
        <select value={service.status} disabled={state.busyId !== null || state.uncertainIds.includes(service.id) || state.activityCheckIds.includes(service.id)} aria-busy={busy}
          onChange={event => {const value = event.target.value; if (value === "published" || value === "archived") void owner.changeStatus(row, value);}}
          className={`min-h-11 w-full rounded-full border px-4 py-3 disabled:opacity-40 ${display.state === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-neutral-100 text-neutral-700"}`}>
          <option value="published">{display.expired ? activityText("expired") : t("active")}</option><option value="archived">{t("paused")}</option>
        </select>
      </label>}
      <Link href={editHref} className={button}>{t("edit")}</Link>
    </div>
  </article>;
}
