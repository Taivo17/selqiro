"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Listing = {
  id: number;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  status?: "active" | "paused" | "sold";
};

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("listings") || "[]");
    setListings(stored);
  }, []);

  const activeListings = listings.filter(
    (item) => item.status !== "paused" && item.status !== "sold"
  );

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm text-black/50">Selqiro</p>
            <h1 className="text-4xl font-semibold tracking-tight">
              Marketplace
            </h1>
            <p className="mt-2 text-black/60">
              Discover active listings from nearby sellers.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/sell"
              className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-600"
            >
              + Start selling
            </Link>

            <Link
              href="/my-page"
              className="rounded-2xl border border-black/10 px-5 py-3 text-sm font-medium transition hover:bg-black/5"
            >
              My page
            </Link>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-black/10 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm text-black/50">Featured store</p>
              <h2 className="text-2xl font-semibold tracking-tight">
                Taivo Garage
              </h2>
              <p className="mt-2 max-w-2xl text-black/60">
                Personal store for parts, tools and useful finds.
              </p>
            </div>

            <Link
              href="/my-page"
              className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-medium transition hover:bg-black/5"
            >
              Visit store
            </Link>
          </div>
        </div>

        {activeListings.length === 0 && (
          <p className="text-black/60">No active listings yet</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeListings.map((item) => (
            <Link key={item.id} href={`/listing/${item.id}`}>
              <div className="cursor-pointer rounded-3xl border border-black/10 p-4 shadow-sm">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="mb-3 h-40 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="mb-3 h-40 rounded-xl bg-neutral-100" />
                )}

                <h2 className="text-lg font-medium">{item.title}</h2>

                <p className="mb-2 text-sm text-black/60">
                  {item.description}
                </p>

                <p className="text-lg font-semibold">{item.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}