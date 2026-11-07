"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, translateListingEditMessage } from "../model/listingEditMessages";
import type {RetiredImageCleanupStatus} from "../../../entities/listing/model/retiredListingImageCleanup";

type Props = Readonly<{status: RetiredImageCleanupStatus | null; loading: boolean; error: string | null;
  blocked: boolean; onCleanup: () => void; onRefresh: () => void}>;
/** Temporary testing detail; this is not the listing's publication status. */
export default function RetiredListingImageCleanup({status, loading, error, blocked, onCleanup, onRefresh}: Props) {
  const { language, t } = useV2Translation(listingEditMessages);

  if (!loading && !error && status?.filesRemaining === 0) return null;
  if (!loading && !error && !status) return null;
  const pending = status !== null && status.filesRemaining > status.needsAttention;
  return <section className="space-y-3 rounded-[30px] border bg-white p-6" aria-label={t("retiredPhotoCleanup")}>
    <h2 className="text-xl font-black">{t("retiredPhotoCleanup")}</h2>
    {loading ? <p role="status">{t("checkingRetiredPhotos")}</p> : error ? <p role="status">{translateListingEditMessage(language, error)}</p>
      : status ? <>
        <p>{t("retiredCleanupPending", { count: status.filesRemaining })}</p>
        {status.needsAttention > 0 ? <p role="status">{t("retiredCleanupAttention", { count: status.needsAttention })}</p> : null}
      </> : null}
    {pending && !error ? <button type="button" disabled={blocked || loading} onClick={onCleanup}
      className="rounded-full border px-5 py-3 font-bold disabled:opacity-50">{t("cleanNextFile")}</button>
      : <button type="button" disabled={blocked || loading} onClick={onRefresh}
        className="rounded-full border px-5 py-3 font-bold disabled:opacity-50">{t("checkRetiredPhotos")}</button>}
  </section>;
}
