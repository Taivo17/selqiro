"use client";

import ListingPrice from "../../../entities/listing/ui/ListingPrice";
import Link from "next/link";
import type { ListingStatus } from "../../../entities/listing/api/updateListingStatus";
import { getListingActivity, isRenewableListingId } from "../../../entities/listing/model/listingActivity";
import type { MyAreaListingMarketplaceItemRow } from "../model/myAreaMarketplaceItemRow";

type Props = { listing: MyAreaListingMarketplaceItemRow; now: number; busy: boolean; disabled: boolean;
  activeIdentityId: string | null; onRenew: () => void; onStatus: (status: ListingStatus) => void };
export default function MyAreaListingRow({ listing, now, busy, disabled, activeIdentityId, onRenew, onStatus }: Props) {
  const activity = getListingActivity(listing.status, listing.activeUntil, now);
  const knownStatus = ["active", "paused", "sold"].includes(listing.status);
  const canRenew = activity.canRenew && listing.identityId === activeIdentityId && isRenewableListingId(listing.id);
  const tone = activity.state === "active" ? "border-emerald-100 bg-emerald-50 text-emerald-800"
    : activity.state === "expired" || activity.state === "unknown" ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-neutral-200 bg-neutral-100 text-neutral-700";
  return (
    <div className="grid w-full min-w-0 gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_105px_150px] md:items-center">
      <Link href={listing.href} className="flex min-w-0 items-center gap-3 rounded-2xl p-2 hover:bg-neutral-50 sm:gap-4">
        {listing.imageUrl ? <img src={listing.imageUrl} alt="" loading="lazy"
          className="h-16 w-24 shrink-0 rounded-2xl object-cover object-[center_42%] sm:w-28" />
          : <div className="h-16 w-24 shrink-0 rounded-2xl bg-neutral-100 sm:w-28" />}
        <div className="min-w-0">
          <h3 className="truncate text-base font-black">{listing.title}</h3>
          <p className="mt-1 truncate text-sm text-neutral-500">{listing.category || "Kategooria puudub"} · {listing.locationLabel}</p>
          <p className="mt-1 text-xs font-semibold text-neutral-600">{activity.label}</p>
          {activity.deadlineLabel ? <p className="mt-1 text-xs text-neutral-500">{activity.deadlineLabel}</p> : null}
          {activity.state === "expired" ? <p className="mt-1 text-xs text-amber-800">Aegunud kuulutust otsingus ei näidata.</p> : null}
        </div>
      </Link>
      <div className="flex min-w-0 items-center justify-between gap-3 md:block md:text-right">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 md:hidden">Hind</span>
        <ListingPrice price={listing} labelClassName="text-base" />
      </div>
      <div className="grid min-w-0 gap-2">
        <label className="sr-only" htmlFor={`listing-status-${listing.id}`}>Kuulutuse „{listing.title}” staatus</label>
        <select id={`listing-status-${listing.id}`} value={knownStatus ? listing.status : "unknown"}
          disabled={disabled || !knownStatus} onChange={e => onStatus(e.target.value as ListingStatus)}
          className={`min-h-10 w-full min-w-0 rounded-full border px-3 py-2 text-xs font-bold disabled:opacity-60 ${tone}`}>
          {!knownStatus ? <option value="unknown">Staatus vajab kontrolli</option> : null}
          <option value="active">{listing.status === "active" ? activity.label : "Aktiveeri"}</option>
          <option value="paused">Peatatud</option><option value="sold">Müüdud</option>
        </select>
        {canRenew ? <button type="button" disabled={disabled} onClick={onRenew}
          className="min-h-11 rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm font-bold disabled:opacity-50">
          {busy ? "Palun oota…" : "Uuenda kuulutust"}
        </button> : null}
        <Link href={listing.editHref} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined}
          onClick={e => { if (disabled) e.preventDefault(); }}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold">
          Muuda
        </Link>
      </div>
    </div>
  );
}
