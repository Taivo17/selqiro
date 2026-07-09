"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicProfile } from "../../../entities/profile/model/types";
import type { ProductListingCard } from "../../../entities/listing/model/types";
import { usePublicProfileListings } from "../model/usePublicProfileListings";

function ProfileListingCard({ listing }: { listing: ProductListingCard }) {
  const router = useRouter();
  const listingHref = `/v2/listing/${listing.id}`;

  function openListingFromCard(event: { target: EventTarget | null }) {
    const target = event.target as HTMLElement | null;

    if (target?.closest("button, a, input, select, textarea")) return;

    router.push(listingHref);
  }

  return (
    <article onClick={openListingFromCard} role="link" tabIndex={0} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== " ") return; const target = event.target as HTMLElement | null; if (target?.closest("button, a, input, select, textarea")) return; event.preventDefault(); router.push(listingHref); }} className="w-[230px] flex-none rounded-[24px] border border-black/5 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt=""
          className="h-28 w-full rounded-[20px] object-cover"
          loading="lazy"
        />
      ) : (
        <div className="h-28 rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200" />
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
          Kuulutus
        </span>

        <button className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-500">
          ♡
        </button>
      </div>

      <h3 className="mt-2 line-clamp-2 text-base font-black">{listing.title}</h3>

      <p className="mt-1 text-sm leading-5 text-neutral-500">
        {listing.category || "Kategooria puudub"} · {listing.locationLabel}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-lg font-black">{listing.priceLabel}</p>
      </div>
    </article>
  );
}

function HorizontalScrollArea({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-2">
      <div className="flex w-max gap-4 px-1">{children}</div>
    </div>
  );
}

function LoadingCards() {
  return (
    <HorizontalScrollArea>
      {Array.from({ length: 3 }).map((_, index) => (
        <article
          key={index}
          className="w-[230px] flex-none rounded-[24px] border border-black/5 bg-white p-3 shadow-sm"
        >
          <div className="h-28 rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200" />
          <div className="mt-4 h-5 w-3/4 rounded-full bg-neutral-100" />
          <div className="mt-3 h-4 w-1/2 rounded-full bg-neutral-100" />
        </article>
      ))}
    </HorizontalScrollArea>
  );
}

export default function PublicProfileListingsSection({
  profile,
}: {
  profile: PublicProfile;
}) {
  const { listings, loading, error } = usePublicProfileListings(profile);

  return (
    <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
            Kuulutused
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
            Müügis praegu
          </h2>
        </div>

        <button className="hidden rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold shadow-sm transition hover:border-neutral-300 md:inline-flex">
          Vaata kõiki
        </button>
      </div>

      {loading ? <LoadingCards /> : null}

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
          <h3 className="font-black">Aktiivseid kuulutusi ei ole</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Kui profiilil on aktiivsed kuulutused, ilmuvad need siia.
          </p>
        </div>
      ) : null}

      {!loading && !error && listings.length > 0 ? (
        <HorizontalScrollArea>
          {listings.map((listing) => (
            <ProfileListingCard key={listing.id} listing={listing} />
          ))}
        </HorizontalScrollArea>
      ) : null}
    </section>
  );
}
