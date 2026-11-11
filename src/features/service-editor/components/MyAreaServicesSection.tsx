"use client";
import Link from "next/link";
import {useV2Translation} from "../../../shared/i18n/V2LanguageProvider";
import {serviceEditorMessages} from "../model/serviceEditorMessages";
import {useMyServicePublications} from "../model/useMyServicePublications";
import {useListingActivityClock} from "../../my-area/model/useListingActivityClock";
import MyAreaServiceRow from "./MyAreaServiceRow";

const button = "inline-flex min-h-11 items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-3 text-sm font-bold hover:border-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-40";
export default function MyAreaServicesSection() {
  const {t} = useV2Translation(serviceEditorMessages), owner = useMyServicePublications(), {state, context} = owner;
  const now = useListingActivityClock();
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
        {state.items.map(row => <MyAreaServiceRow key={row.service.id} row={row} owner={owner} now={now} />)}
      </div>
      {state.next !== null ? <button type="button" className={`${button} mt-5 w-full`} disabled={state.moreLoading} onClick={() => void owner.loadMore()}>{t(state.moreLoading ? "loading" : "loadMore")}</button> : null}
    </> : null}
  </section>;
}
