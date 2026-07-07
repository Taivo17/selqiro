"use client";

import Link from "next/link";
import type { MyIdentityListingCard } from "../../../entities/listing/model/types";
import { useMyAreaListings } from "../model/useMyAreaListings";

function statusLabel(status: string) {
  if (status === "active") return "Aktiivne";
  if (status === "paused") return "Pausil";
  if (status === "sold") return "Müüdud";

  return status;
}

function statusClass(status: string) {
  if (status === "active") return "bg-emerald-50 text-emerald-700";
  if (status === "paused") return "bg-amber-50 text-amber-700";
  if (status === "sold") return "bg-neutral-100 text-neutral-700";

  return "bg-neutral-100 text-neutral-700";
}

function MyAreaListingRow({ listing }: { listing: MyIdentityListingCard }) {
  return (
    <div className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_120px_100px_120px] md:items-center">
      <div className="flex min-w-0 items-center gap-4">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt=""
            className="h-16 w-20 shrink-0 rounded-2xl object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-16 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200" />
        )}

        <div className="min-w-0">
          <h3 className="truncate text-base font-black">{listing.title}</h3>

          <p className="mt-1 truncate text-sm text-neutral-500">
            {listing.category || "Kategooria puudub"} · {listing.locationLabel}
          </p>

          {listing.daysLeft !== null ? (
            <p className="mt-1 text-xs text-neutral-400">
              {listing.daysLeft > 0
                ? `${listing.daysLeft} päeva aktiivne`
                : "Aegunud või vajab uuendamist"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 md:block md:text-right">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400 md:hidden">
          Hind
        </span>
        <p className="whitespace-nowrap text-base font-black">
          {listing.priceLabel}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 md:justify-center">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400 md:hidden">
          Staatus
        </span>
        <span
          className={[
            "inline-flex justify-center rounded-full px-3 py-1 text-xs font-black",
            statusClass(listing.status),
          ].join(" ")}
        >
          {statusLabel(listing.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
        <Link
          href={listing.href}
          className="inline-flex justify-center rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-black shadow-sm"
        >
          Vaata
        </Link>

        <Link
          href={`/v2/my-area/listings/${listing.id}/edit`}
          className="inline-flex justify-center rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-black shadow-sm"
        >
          Muuda
        </Link>
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-black/5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="grid gap-3 py-4 first:pt-0 md:grid-cols-[minmax(0,1fr)_120px_100px_120px] md:items-center"
        >
          <div className="flex items-center gap-4">
            <div className="h-16 w-20 rounded-2xl bg-neutral-100" />
            <div className="min-w-0 flex-1">
              <div className="h-5 w-2/3 rounded-full bg-neutral-100" />
              <div className="mt-2 h-4 w-1/3 rounded-full bg-neutral-100" />
            </div>
          </div>

          <div className="h-5 rounded-full bg-neutral-100" />
          <div className="h-6 rounded-full bg-neutral-100" />
          <div className="h-8 rounded-full bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

export default function MyAreaListingsSection() {
  const { listings, loading, error } = useMyAreaListings();

  return (
    <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            Kuulutused
          </p>
          <h2 className="mt-2 text-2xl font-black">Sinu kuulutused</h2>
        </div>

        <button className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black shadow-sm">
          Vaata kõiki
        </button>
      </div>

      <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_120px_100px_120px] px-1 text-xs font-black uppercase tracking-[0.16em] text-neutral-400 md:grid">
        <span>Kuulutus</span>
        <span className="text-right">Hind</span>
        <span className="text-center">Staatus</span>
        <span className="text-center">Tegevused</span>
      </div>

      {loading ? <LoadingRows /> : null}

      {!loading && error ? (
        <div className="rounded-[22px] border border-red-100 bg-red-50 p-5">
          <h3 className="font-black text-red-950">
            Kuulutusi ei saanud laadida
          </h3>
          <p className="mt-2 text-sm leading-6 text-red-800">{error}</p>
        </div>
      ) : null}

      {!loading && !error && listings.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-6 text-center">
          <h3 className="font-black">Sul ei ole veel kuulutusi</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Kui lisad toote, ilmub see siia haldamiseks.
          </p>
        </div>
      ) : null}

      {!loading && !error && listings.length > 0 ? (
        <div className="divide-y divide-black/5">
          {listings.map((listing) => (
            <MyAreaListingRow key={listing.id} listing={listing} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
