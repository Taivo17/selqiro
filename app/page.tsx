"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [listings, setListings] = useState<any[]>([]);

  const correctPassword = "selqiro123";

  useEffect(() => {
    const savedAccess = localStorage.getItem("selqiro-access");
    if (savedAccess === "granted") {
      setAuthorized(true);
    }

    const stored = JSON.parse(localStorage.getItem("listings") || "[]");
    setListings(stored);
  }, []);

  const handleLogin = () => {
    if (password === correctPassword) {
      localStorage.setItem("selqiro-access", "granted");
      setAuthorized(true);
    } else {
      alert("Wrong password");
    }
  };

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-16 text-black">
        <div className="mx-auto max-w-md rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-black/40">
            Selqiro Private Access
          </p>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight">Enter project</h1>
          <p className="mb-6 text-black/60">
            This preview is protected while the platform is under development.
          </p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
          />

          <button
            onClick={handleLogin}
            className="mt-4 w-full rounded-2xl bg-black px-4 py-3 text-white transition hover:opacity-90"
          >
            Enter
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[36px] border border-black/8 bg-white px-6 py-6 shadow-sm sm:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-black/40">
                Selqiro
              </p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Marketplace
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-black/60 sm:text-lg">
                Discover active listings from nearby sellers, personal stores and useful finds
                in one clean marketplace.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-black/55">
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  Personal stores
                </span>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  Simple listing flow
                </span>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  AI-assisted future
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/sell"
                className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              >
                + Start selling
              </Link>
              <Link
                href="/my-page"
                className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
              >
                My page
              </Link>
            </div>
          </div>
        </header>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
              Featured store
            </p>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Taivo Garage</h2>
                <p className="mt-3 max-w-xl text-black/60">
                  Personal store for parts, tools and useful finds. A clean profile where
                  listings feel more like a real mini-shop than random ads.
                </p>
              </div>

              <Link
                href="/store/taivo"
                className="inline-flex rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
              >
                Visit store
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
              Current state
            </p>

            <div className="space-y-4">
              <div className="rounded-2xl bg-black/[0.03] px-4 py-4">
                <p className="text-sm text-black/45">Active listings</p>
                <p className="mt-1 text-3xl font-semibold">{listings.length}</p>
              </div>

              <div className="rounded-2xl bg-black/[0.03] px-4 py-4">
                <p className="text-sm text-black/45">Store status</p>
                <p className="mt-1 text-base font-medium">Private live preview</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Listings
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Latest items</h2>
            </div>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
              <p className="text-lg font-medium">No active listings yet</p>
              <p className="mt-2 text-black/55">
                Add your first item and it will appear here automatically.
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
                      <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
                      <p className="line-clamp-2 text-sm leading-6 text-black/60">
                        {item.description}
                      </p>
                      <p className="pt-2 text-2xl font-semibold">{item.price}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}