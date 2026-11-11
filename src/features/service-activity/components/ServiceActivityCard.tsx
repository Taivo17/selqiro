"use client";
import {useV2Translation} from "../../../shared/i18n/V2LanguageProvider";
import type {ServiceActivityControlOptions} from "../model/useServiceActivity";
import {serviceActivityMessages} from "../model/serviceActivityMessages";
import ServiceActivityControl from "./ServiceActivityControl";
import {useListingActivityClock} from "../../my-area/model/useListingActivityClock";

export default function ServiceActivityCard(props: ServiceActivityControlOptions & {title: string; pendingChanges: boolean}) {
  const {t} = useV2Translation(serviceActivityMessages), now = useListingActivityClock();
  return <section className="rounded-3xl border border-teal-200 bg-white p-5 sm:p-6">
    <h2 className="mb-4 text-xl font-black">{t("heading")}</h2>
    <ServiceActivityControl {...props} now={now} expanded />
  </section>;
}
