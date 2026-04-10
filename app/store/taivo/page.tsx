"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Listing = {
  id: number;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  status?: "active" | "paused" | "sold";
};

export default function StorePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"active" | "all">("active");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("listings") || "[]");
    setListings(stored);
  }, []);

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const currentStatus = item.status || "active";
      const matchesStatus =
        filter === "all" ? true : currentStatus === "active";

      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [listings, search, filter]);

  const activeCount = listings.filter(
    (item) => !item.status || item.status === "active"
  ).length;

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[36px] border border-black/8 bg-white px-6 py-6 shadow-sm sm:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-black/40">
                Store page
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
                  Seller profile
                </span>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  Public store view
                </span>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  Searchable listings
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
              >
                Back to marketplace
              </Link>

              <Link
                href="/my-page"
                className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Manage listings
              </Link>
            </div>
          </div>
        </header>

        <section className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/45">Store items</p>
            <p className="mt-2 text-4xl font-semibold">{activeCount}</p>
          </div>

          <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/45">Seller type</p>
            <p className="mt-2 text-2xl font-semibold">Private seller</p>
          </div>

          <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/45">Store status</p>
            <p className="mt-2 text-2xl font-semibold">Open</p>
          </div>
        </section>

        <section className="mb-6 rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
              Browse store
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Find items in this store
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <input
              type="text"
              placeholder="Search this store..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "active" | "all")}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
            >
              <option value="active">Active only</option>
              <option value="all">Show all</option>
            </select>
          </div>
        </section>

        <section className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
            Listings
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Available items
          </h2>
        </section>

        {filteredListings.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">No matching listings in this store</p>
            <p className="mt-2 text-black/55">
              Try another search or change the filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((item) => (
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

                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {item.title}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        (item.status || "active") === "active"
                          ? "bg-green-100 text-green-700"
                          : item.status === "paused"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      {item.status || "active"}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-sm leading-6 text-black/60">
                    {item.description}
                  </p>

                  <p className="pt-4 text-2xl font-semibold">{item.price}</p>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}