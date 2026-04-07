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
      <main className="min-h-screen bg-white px-6 py-16 text-black">
        <div className="mx-auto max-w-md rounded-3xl border border-black/10 p-8 shadow-sm">
          <h1 className="mb-3 text-3xl font-semibold">Selqiro</h1>
          <p className="mb-6 text-black/60">Enter password to access the project.</p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-black/15 px-4 py-3 outline-none"
          />

          <button
            onClick={handleLogin}
            className="mt-4 w-full rounded-2xl bg-black px-4 py-3 text-white"
          >
            Enter
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-black">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-black/50">Selqiro</p>
            <h1 className="mb-3 text-5xl font-semibold tracking-tight">Marketplace</h1>
            <p className="text-lg text-black/60">
              Discover active listings from nearby sellers.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/sell"
              className="rounded-2xl bg-green-500 px-5 py-3 text-white"
            >
              + Start selling
            </Link>
            <Link
              href="/my-page"
              className="rounded-2xl border border-black/10 px-5 py-3"
            >
              My page
            </Link>
          </div>
        </div>

        <div className="mb-10 rounded-3xl border border-black/10 p-8 shadow-sm">
          <p className="mb-2 text-sm text-black/50">Featured store</p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">Taivo Garage</h2>
              <p className="mt-2 text-lg text-black/60">
                Personal store for parts, tools and useful finds.
              </p>
            </div>

            <Link
              href="/store/taivo"
              className="rounded-2xl border border-black/10 px-5 py-3"
            >
              Visit store
            </Link>
          </div>
        </div>

        {listings.length === 0 && (
          <p className="text-black/60">No active listings yet</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((item) => (
            <Link key={item.id} href={`/listing/${item.id}`}>
              <div className="cursor-pointer rounded-3xl border border-black/10 p-4 shadow-sm">
                <div className="mb-3 h-40 w-full rounded-xl bg-neutral-100" />

                <h2 className="text-lg font-medium">{item.title}</h2>

                <p className="mb-2 text-sm text-black/60">{item.description}</p>

                <p className="text-lg font-semibold">{item.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}