"use client";

import { useEffect, useState } from "react";

type Listing = {
  id: number;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  status?: "active" | "paused" | "sold";
};

export default function MyPage() {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("listings") || "[]");
    setListings(stored);
  }, []);

  const updateListingStatus = (
    id: number,
    status: "active" | "paused" | "sold"
  ) => {
    const updated = listings.map((item) =>
      item.id === id ? { ...item, status } : item
    );

    setListings(updated);
    localStorage.setItem("listings", JSON.stringify(updated));
  };

  const deleteListing = (id: number) => {
    const confirmed = confirm("Are you sure you want to delete this listing?");
    if (!confirmed) return;

    const updated = listings.filter((item) => item.id !== id);
    setListings(updated);
    localStorage.setItem("listings", JSON.stringify(updated));
  };

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 overflow-hidden rounded-3xl border border-black/10 shadow-sm">
          <div className="h-40 bg-gradient-to-r from-neutral-100 to-neutral-200" />

          <div className="px-6 pb-6">
            <div className="-mt-10 mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-black text-2xl font-semibold text-white">
              T
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-sm text-black/50">Selqiro store</p>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Taivo Garage
                </h1>
                <p className="mt-2 max-w-2xl text-black/60">
                  Personal store for parts, tools and useful finds.
                </p>
              </div>

              <div className="rounded-2xl border border-black/10 px-4 py-3 text-sm text-black/60">
                {listings.length} listings
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">My listings</h2>
        </div>

        {listings.length === 0 && (
          <p className="text-black/60">No items yet.</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="h-44 bg-neutral-100" />
              )}

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-lg font-medium">{item.title}</p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.status === "sold"
                        ? "bg-black text-white"
                        : item.status === "paused"
                        ? "bg-neutral-200 text-black"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.status || "active"}
                  </span>
                </div>

                <p className="mb-3 text-sm text-black/60">
                  {item.description}
                </p>

                <p className="mb-4 text-xl font-semibold">{item.price}</p>

                <div className="grid gap-2">
                  <button
                    onClick={() => updateListingStatus(item.id, "active")}
                    className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/5"
                  >
                    Mark active
                  </button>

                  <button
                    onClick={() => updateListingStatus(item.id, "paused")}
                    className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/5"
                  >
                    Pause
                  </button>

                  <button
                    onClick={() => updateListingStatus(item.id, "sold")}
                    className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/5"
                  >
                    Mark as sold
                  </button>

                  <button
                    onClick={() => deleteListing(item.id)}
                    className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}