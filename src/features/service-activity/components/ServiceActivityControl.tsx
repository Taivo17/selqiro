"use client";
import Link from "next/link";
import {useV2Translation} from "../../../shared/i18n/V2LanguageProvider";
import {localeForLanguage} from "../../../../lib/i18n/useTranslation";
import {serviceActivityDisplay} from "../../../entities/service/model/serviceActivity";
import {useServiceActivity, type ServiceActivityControlOptions} from "../model/useServiceActivity";
import {serviceActivityMessages} from "../model/serviceActivityMessages";
import ServiceRenewalConfirmation from "./ServiceRenewalConfirmation";

const button = "inline-flex min-h-11 items-center justify-center rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-bold hover:border-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-40";
export default function ServiceActivityControl(props: ServiceActivityControlOptions & {title: string; now: number; expanded?: boolean; pendingChanges?: boolean}) {
  const {t, language} = useV2Translation(serviceActivityMessages), owner = useServiceActivity(props), {view} = owner;
  const snapshot = view.snapshot, display = snapshot ? serviceActivityDisplay(snapshot, props.now) : null;
  const busy = ["renewing", "checking"].includes(view.phase), blocked = view.phase === "blocked";
  const date = display?.deadline ? new Intl.DateTimeFormat(localeForLanguage(language), {dateStyle: "medium", timeStyle: "short"}).format(display.deadline) : "";
  return <div data-service-activity-id={props.serviceId} className="space-y-2 text-sm">
    {view.phase === "loading" ? <p role="status" className="text-neutral-500">{t("loading")}</p> : null}
    {display ? <>
      <p className={`font-semibold ${display.state === "expired" ? "text-amber-800" : "text-neutral-600"}`}>{t(display.state)}</p>
      {date ? <p className="text-neutral-500">{t(display.expired ? "expiredAt" : "validUntil", {date})}</p>
        : snapshot?.status === "draft" ? <p className="text-neutral-500">{t("draftHelp")}</p> : <p className="text-neutral-500">{t("noDeadline")}</p>}
      {props.expanded ? <>
        <p className="leading-6 text-neutral-600">{t("help")}</p>
        {display.state === "expired" ? <p className="leading-6 text-amber-800">{t("expiredHelp")}</p> : null}
        {snapshot?.status === "archived" ? <p className="leading-6 text-neutral-600">{t("pausedHelp")}</p> : null}
        {snapshot?.activity.origin === "transition" && !snapshot.activity.lastConfirmedAt ? <p className="leading-6 text-neutral-600">{t("transitionHelp")}</p> : null}
      </> : null}
    </> : null}
    {view.notice ? <p role={blocked || view.phase === "retired" ? "alert" : "status"} className="leading-6">{t(view.notice)}</p> : null}
    {props.pendingChanges ? <p className="leading-6 text-neutral-500">{t("pendingHelp")}</p> : null}
    <div className="flex flex-wrap gap-2">
      {display?.canRenew ? <button type="button" className={button} disabled={!!props.blocked || view.phase !== "ready"} onClick={owner.open}>{t(view.phase === "renewing" ? "renewing" : "renew")}</button> : null}
      {blocked || view.phase === "checking" ? <button type="button" className={button} disabled={busy || props.enabled === false} onClick={owner.check}>{t(busy ? "checking" : "check")}</button> : null}
      {props.expanded && display?.state === "active" ? <Link className={button} href={`/v2/service/${props.serviceId}`} target="_blank" rel="noreferrer">{t("viewPublic")}</Link> : null}
    </div>
    {snapshot && ["confirming", "renewing"].includes(view.phase) ? <ServiceRenewalConfirmation title={props.title} paused={snapshot.status === "archived"}
      busy={view.phase === "renewing"} blocked={!!props.blocked && view.phase !== "renewing"} onCancel={owner.cancel} onConfirm={owner.confirm} /> : null}
  </div>;
}
