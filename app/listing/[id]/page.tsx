"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Listing = {
  id: number;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  seller?: {
    name: string;
    bio: string;
    messenger?: string;
    instagram?: string;
    whatsapp?: string;
    email?: string;
  };
};

export default function ListingPage() {
  const params = useParams();
  const [item, setItem] = useState<Listing | null>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("listings") || "[]");
    const found = stored.find((i: Listing) => i.id == Number(params.id));
    setItem(found || null);
  }, [params.id]);

  if (!item) {
    return <p className="p-10">Listing not found</p>;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-black">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                className="h-80 w-full rounded-3xl object-cover"
              />
            ) : (
              <div className="h-80 w-full rounded-3xl bg-neutral-100" />
            )}
          </div>

          <div>
            <h1 className="mb-4 text-4xl font-semibold tracking-tight">
              {item.title}
            </h1>

            <p className="mb-6 text-black/70">{item.description}</p>

            <p className="mb-8 text-3xl font-bold">{item.price}</p>

            <div className="mb-8 rounded-3xl border border-black/10 p-6">
              <p className="mb-2 text-sm text-black/50">Seller</p>
              <h2 className="text-xl font-semibold">
                {item.seller?.name || "Unknown seller"}
              </h2>
              <p className="mt-2 text-sm text-black/60">
                {item.seller?.bio || "Seller on Selqiro"}
              </p>
            </div>

            <div className="rounded-3xl border border-black/10 p-6">
              <h3 className="mb-4 text-lg font-semibold">Contact seller</h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {item.seller?.messenger && (
                  <a
                    href={item.seller.messenger}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-black/10 px-4 py-3 text-center text-sm font-medium transition hover:bg-black/5"
                  >
                    Messenger
                  </a>
                )}

                {item.seller?.instagram && (
                  <a
                    href={item.seller.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-black/10 px-4 py-3 text-center text-sm font-medium transition hover:bg-black/5"
                  >
                    Instagram
                  </a>
                )}

                {item.seller?.whatsapp && (
                  <a
                    href={item.seller.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-black/10 px-4 py-3 text-center text-sm font-medium transition hover:bg-black/5"
                  >
                    WhatsApp
                  </a>
                )}

                {item.seller?.email && (
                  <a
                    href={item.seller.email}
                    className="rounded-2xl border border-black/10 px-4 py-3 text-center text-sm font-medium transition hover:bg-black/5"
                  >
                    Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}