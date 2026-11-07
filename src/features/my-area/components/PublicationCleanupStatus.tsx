"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { localeForLanguage } from "@/lib/i18n/useTranslation";

import { accountUiMessages } from "@/lib/i18n/catalogs/accountUi";

import {useEffect, useState} from "react";
import type {PublicationActor} from "../../../entities/listing/model/publicationJourney";
import {supabaseBrowserClient} from "../../../shared/supabase/browserClient";
import {ACTIVE_IDENTITY_CHANGED_EVENT} from "../../v2-shell/model/useV2IdentitySwitcher";
import {publicationJourneyRequest} from "../../../entities/listing/api/publicationJourneyClient";

type Summary = {pending: number; blocked: number; needs_attention: number; oldest_pending_seconds: number; reserved_bytes: number};
function summary(value: unknown): Summary {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("summary");
  const row = value as Record<string, unknown>;
  const names = ["pending", "blocked", "needs_attention", "oldest_pending_seconds", "reserved_bytes"] as const;
  if (row.schema_version !== 1 || Object.keys(row).length !== 6
    || names.some(name => !Number.isSafeInteger(row[name]) || Number(row[name]) < 0)) throw new Error("summary");
  return row as Summary;
}

/** Existing actor-bound cleanup counters. Refresh is read-only; it never retries an upload or a delete. */
export default function PublicationCleanupStatus({actor}: {actor: PublicationActor}) {
  const { language: uiLanguage, t } = useV2Translation(accountUiMessages);

  const [value, setValue] = useState<Summary | null>(null), [problem, setProblem] = useState(false);
  const [revision, refresh] = useState(0), [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    const drop = () => { active = false; abort.abort(); setValue(null); setBusy(false); };
    const {data: {subscription}} = supabaseBrowserClient.auth.onAuthStateChange((_event, next) => {
      if (next?.user.id !== actor.userId) drop();
    });
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, drop);
    setValue(null); setProblem(false); setBusy(true);
    void (async () => {
      try {
        const parsed = summary(await publicationJourneyRequest(actor, "owner-cleanup-status", {
          p_expected_user_id: actor.userId, p_expected_identity_id: actor.identityId}, abort.signal));
        if (active) setValue(parsed);
      } catch { if (active) setProblem(true); }
      finally { if (active) setBusy(false); }
    })();
    return () => { drop(); subscription.unsubscribe(); window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, drop); };
  }, [actor.userId, actor.identityId, revision]);
  return <section className="mt-6 space-y-3 rounded-2xl border border-neutral-200 p-4" aria-label={t("photo_cleanup_status")}>
    <h3 className="font-bold">{t("photo_cleanup_status")}</h3>
    {busy ? <p role="status" className="text-sm">{t("checking_photo_status")}</p> : null}
    {problem ? <p role="alert" className="text-sm">{t("could_not_read_photo_cleanup_status_check_again")}</p> : null}
    {value ? <div className="space-y-1 text-sm">
      <p>{t("cleanup_pending")} {value.pending}  {t("closure_check_pending")} {value.blocked}  {t("need_attention")} {value.needs_attention}</p>
      <p>{t("oldest_pending_cleanup")} {Math.floor(value.oldest_pending_seconds / 60)}  {t("min")}</p>
      <p>{t("storage_reserved_for_photos")} {(value.reserved_bytes / (1024 * 1024)).toLocaleString(localeForLanguage(uiLanguage), {maximumFractionDigits: 2})}  {t("mib")}</p>
      <p className="text-neutral-600">{t("listing_removal_and_final_file_cleanup_are_confirmed_separately")}</p>
    </div> : null}
    <button type="button" disabled={busy} onClick={() => refresh(n => n + 1)} className="min-h-10 rounded-full border px-4 text-sm font-bold disabled:opacity-50">{t("check_cleanup_status")}</button>
  </section>;
}
