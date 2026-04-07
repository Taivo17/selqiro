"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ListingPage() {
  const params = useParams();
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("listings") || "[]");
    const found = stored.find((i: any) => String(i.id) === String(params.id));
    setItem(found);
  }, [params.id]);

  if (!item) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-black/8 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-medium">Listing not found</p>
          <p className="mt-2 text-black/55">
            This item may have been removed or is no longer available.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Back to marketplace
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
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
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[32px] border border-black/8 bg-white p-4 shadow-sm sm:p-6">
            <div className="overflow-hidden rounded-[28px] bg-neutral-100">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-[320px] w-full object-cover sm:h-[420px] lg:h-[520px]"
                />
              ) : (
                <div className="h-[320px] w-full bg-neutral-100 sm:h-[420px] lg:h-[520px]" />
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Listing
              </p>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {item.title}
              </h1>

              <p className="mt-4 text-base leading-7 text-black/60 sm:text-lg">
                {item.description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white">
                  {item.price}
                </span>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
                    item.status === "paused"
                      ? "bg-yellow-100 text-yellow-700"
                      : item.status === "sold"
                      ? "bg-neutral-200 text-neutral-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {item.status || "active"}
                </span>
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
                  <h2 className="text-2xl font-semibold tracking-tight">Taivo Garage</h2>
                  <p className="mt-1 text-black/60">Personal seller on Selqiro</p>
                </div>
              </div>

              <Link
                href="/store/taivo"
                className="mt-6 inline-flex rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
              >
                Open seller store
              </Link>
            </div>

            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Contact seller
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <button className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]">
                  Messenger
                </button>
                <button className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]">
                  Instagram
                </button>
                <button className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]">
                  WhatsApp
                </button>
                <button className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]">
                  Email
                </button>
              </div>

              <p className="mt-4 text-sm text-black/45">
                Contact actions are currently visual placeholders for the live preview.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}