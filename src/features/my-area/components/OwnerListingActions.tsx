"use client";

import Link from "next/link";
import type { ListingStatus } from "../../../entities/listing/api/updateListingStatus";
import type { ListingActivity } from "../../../entities/listing/model/listingActivity";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { accountUiMessages } from "../../../../lib/i18n/catalogs/accountUi";

type Props = { itemKey: string; title: string; status: string; activity: ListingActivity;
  canRenew: boolean; busy: boolean; disabled: boolean; editHref: string;
  onRenew: () => void; onStatus: (status: ListingStatus) => void };

/** The same owner controls for ordinary listings and canonical horse offers. */
export default function OwnerListingActions({ itemKey, title, status, activity, canRenew, busy, disabled,
  editHref, onRenew, onStatus }: Props) {
  const { t } = useV2Translation(accountUiMessages);
  const knownStatus = ["active", "paused", "sold"].includes(status);
  const tone = activity.state === "active" ? "border-emerald-100 bg-emerald-50 text-emerald-800"
    : activity.state === "expired" || activity.state === "unknown" ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-neutral-200 bg-neutral-100 text-neutral-700";
  const controlId = `listing-status-${itemKey}`;
  return <div className="grid min-w-0 gap-2">
    <label className="sr-only" htmlFor={controlId}>{t("status_for_listing", {title})}</label>
    <select id={controlId} value={knownStatus ? status : "unknown"} disabled={disabled || !knownStatus}
      onChange={event => onStatus(event.target.value as ListingStatus)}
      className={`min-h-10 w-full min-w-0 rounded-full border px-3 py-2 text-xs font-bold disabled:opacity-60 ${tone}`}>
      {!knownStatus ? <option value="unknown">{t("status_needs_checking")}</option> : null}
      <option value="active">{status === "active" ? activity.label : t("activate")}</option>
      <option value="paused">{t("paused")}</option><option value="sold">{t("sold")}</option>
    </select>
    {canRenew ? <button type="button" disabled={disabled} onClick={onRenew}
      className="min-h-11 rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm font-bold disabled:opacity-50">
      {busy ? t("please_wait") : t("renew_listing")}
    </button> : null}
    <Link href={editHref} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined}
      onClick={event => { if (disabled) event.preventDefault(); }}
      className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold">
      {t("edit")}
    </Link>
  </div>;
}
