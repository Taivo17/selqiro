"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

export default function StorePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching store listings:", error);
        setLoading(false);
        return;
      }

      setListings((data || []) as Listing[]);
      setLoading(false);
    };

    fetchListings();
  }, []);

  const latestListings = useMemo(() => listings.slice(0, 12), [listings]);

  const activeCount = listings.length;

  const categoryCount = useMemo(() => {
    return Array.from(
      new Set(listings.map((item) => item.category || "general"))
    ).length;
  }, [listings]);

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[36px] border border-black/8 bg-white px-6 py-6 shadow-sm sm:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-black/40">
                Selqiro Store
              </p>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#111827] text-xl font-semibold text-white">
                  T
                </div>

                <div>
                  <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                    Taivo Garage
                  </h1>
                  <p className="mt-2 text-base text-black/60">
                    Personal store for parts, tools and useful finds.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-black/55">
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  Personal store
                </span>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  Active listings only
                </span>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  Shared database
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/sell"
                className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              >
                + Add listing
              </Link>

              <Link
                href="/"
                className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
              >
                Back to marketplace
              </Link>
            </div>
          </div>
        </header>

        <section className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/45">Active listings</p>
            <p className="mt-2 text-4xl font-semibold">{activeCount}</p>
          </div>

          <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/45">Categories</p>
            <p className="mt-2 text-4xl font-semibold">{categoryCount}</p>
          </div>

          <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/45">Store status</p>
            <p className="mt-2 text-2xl font-semibold">Live preview</p>
          </div>
        </section>

        <section className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
            Listings
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Latest items from this store
          </h2>
        </section>

        {loading ? (
          <div className="rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">Loading store listings...</p>
          </div>
        ) : latestListings.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">No active listings yet</p>
            <p className="mt-2 text-black/55">
              Add a new listing and it will appear here automatically.
            </p>

            <Link
              href="/sell"
              className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Create listing
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {latestListings.map((item) => (
              <Link key={item.id} href={`/listing/${item.id}`}>
                <article className="group overflow-hidden rounded-[30px] border border-black/8 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
                  <div className="mb-4 overflow-hidden rounded-2xl bg-neutral-100">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="h-52 w-full bg-neutral-100" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xl font-semibold tracking-tight">
                        {item.title}
                      </h3>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        {item.status || "active"}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-sm leading-6 text-black/60">
                      {item.description}
                    </p>

                    <p className="pt-2 text-2xl font-semibold">{item.price}</p>

                    <div className="pt-2 text-sm text-black/45">
                      {(item.category || "general")} •{" "}
                      {(item.condition || "used")} •{" "}
                      {item.country || "No country"}
                      {item.city ? ` • ${item.city}` : ""}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}