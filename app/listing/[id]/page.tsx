"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Listing = {
  id: number;
  created_at?: string;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  status?: "active" | "paused" | "sold";
  category?: string;
  condition?: string;
  location?: string;
  country?: string;
  city?: string;
};

export default function ListingDetailPage() {
  const params = useParams();
  const id = Number(params?.id);

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id || Number.isNaN(id)) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching listing:", error);
        setListing(null);
        setLoading(false);
        return;
      }

      setListing(data as Listing);
      setLoading(false);
    };

    fetchListing();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">Loading listing...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[32px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">Listing not found</p>
            <p className="mt-2 text-black/55">
              This item may have been deleted or does not exist.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/"
                className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Back to marketplace
              </Link>

              <Link
                href="/my-page"
                className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
              >
                Back to my page
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const visibleLocation =
    listing.location ||
    [listing.country, listing.city].filter(Boolean).join(" • ") ||
    "No location";

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            Back to marketplace
          </Link>

          <Link
            href="/store/taivo"
            className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            Visit store
          </Link>

          <Link
            href="/my-page"
            className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            My page
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-[32px] border border-black/8 bg-white shadow-sm">
            <div className="bg-neutral-100">
              {listing.image ? (
                <img
                  src={listing.image}
                  alt={listing.title}
                  className="h-[340px] w-full object-cover sm:h-[460px]"
                />
              ) : (
                <div className="h-[340px] w-full bg-neutral-100 sm:h-[460px]" />
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Listing details
              </p>

              <div className="mb-4 flex items-start justify-between gap-4">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {listing.title}
                </h1>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    (listing.status || "active") === "active"
                      ? "bg-green-100 text-green-700"
                      : listing.status === "paused"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {listing.status || "active"}
                </span>
              </div>

              <p className="text-3xl font-semibold sm:text-4xl">
                {listing.price}
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-black/55">
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  {listing.category || "general"}
                </span>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  {listing.condition || "used"}
                </span>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  {visibleLocation}
                </span>
              </div>

              <div className="mt-8">
                <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
                  Description
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-black/70">
                  {listing.description}
                </p>
              </div>
            </div>

            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Seller
              </p>

              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#111827] text-lg font-semibold text-white">
                  T
                </div>

                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Taivo Garage
                  </h2>
                  <p className="text-sm text-black/60">
                    Personal store for parts, tools and useful finds.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/store/taivo"
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Visit store
                </Link>

                <Link
                  href="/sell"
                  className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
                >
                  Sell similar item
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}