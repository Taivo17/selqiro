"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function MyPage() {
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("listings") || "[]");
    setListings(stored);
  }, []);

  const updateStatus = (id: number, status: string) => {
    const updated = listings.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    setListings(updated);
    localStorage.setItem("listings", JSON.stringify(updated));
  };

  const deleteListing = (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this listing?");
    if (!confirmed) return;

    const updated = listings.filter((item) => item.id !== id);
    setListings(updated);
    localStorage.setItem("listings", JSON.stringify(updated));
  };

  const activeCount = listings.filter((item) => item.status === "active").length;
  const pausedCount = listings.filter((item) => item.status === "paused").length;
  const soldCount = listings.filter((item) => item.status === "sold").length;

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
                  Private seller
                </span>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  Live preview
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
            <p className="text-sm text-black/45">All listings</p>
            <p className="mt-2 text-4xl font-semibold">{listings.length}</p>
          </div>

          <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/45">Active</p>
            <p className="mt-2 text-4xl font-semibold">{activeCount}</p>
          </div>

          <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/45">Paused / Sold</p>
            <p className="mt-2 text-4xl font-semibold">{pausedCount + soldCount}</p>
          </div>
        </section>

        <section className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
            Listings
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Manage your items</h2>
        </section>

        {listings.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">No listings yet</p>
            <p className="mt-2 text-black/55">
              Add your first listing and start building your store.
            </p>

            <Link
              href="/sell"
              className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Create first listing
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-[30px] border border-black/8 bg-white p-4 shadow-sm"
              >
                <Link href={`/listing/${item.id}`}>
                  <div className="cursor-pointer">
                    <div className="mb-4 overflow-hidden rounded-2xl bg-neutral-100">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-52 w-full object-cover"
                        />
                      ) : (
                        <div className="h-52 w-full bg-neutral-100" />
                      )}
                    </div>

                    <div className="mb-4 flex items-start justify-between gap-3">
                      <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                          item.status === "active"
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

                    <p className="mt-4 text-2xl font-semibold">{item.price}</p>
                  </div>
                </Link>

                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => updateStatus(item.id, "active")}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
                  >
                    Mark active
                  </button>

                  <button
                    onClick={() => updateStatus(item.id, "paused")}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
                  >
                    Pause
                  </button>

                  <button
                    onClick={() => updateStatus(item.id, "sold")}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
                  >
                    Mark as sold
                  </button>

                  <button
                    onClick={() => deleteListing(item.id)}
                    className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}