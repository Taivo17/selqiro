"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { jobMessages } from "../model/jobMessages";
import { jobSecondary } from "./jobStyles";
export default function JobPagination({previous,next,canPrevious,canNext,loading}: {previous: () => void;next: () => void;canPrevious: boolean;canNext: boolean;loading: boolean}) {
  const {t} = useV2Translation(jobMessages);
  if (!canPrevious && !canNext) return null;
  return <nav aria-label={t("jobs")} className="mt-6 flex flex-wrap gap-3">
    <button type="button" className={jobSecondary} disabled={loading || !canPrevious} onClick={previous}>{t("previous")}</button>
    <button type="button" className={jobSecondary} disabled={loading || !canNext} onClick={next}>{t("next")}</button>
  </nav>;
}
