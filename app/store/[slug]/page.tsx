"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Profile = {
  id: string;
  email?: string | null;
  store_name?: string | null;
  store_slug?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
};

type Listing = {
  id: number;
  user_id?: string | null;
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

export default function StoreSlugPage() {
  const params = useParams();
  const slug = String(params?.slug || "");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("store_slug", slug)
        .maybeSingle();

      if (profileError) {
        console.error("Error loading profile:", profileError);
        setLoading(false);
        return;
      }

      if (!profileData) {
        setProfile(null);
        setListings([]);
        setLoading(false);
        return;
      }

      setProfile(profileData as Profile);

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", profileData.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (listingError) {
        console.error("Error loading store listings:", listingError);
        setListings([]);
        setLoading(false);
        return;
      }

      setListings((listingData || []) as Listing[]);
      setLoading(false);
    };

    fetchStore();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-medium">Loading store...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-medium">Store not found</p>
          <p className="mt-2 text-black/55">
            This store does not exist or has not been set up yet.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Back to marketplace
            </Link>

            <Link
              href="/profile"
              className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
            >
              Go to profile settings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const storeName = profile.store_name || "Unnamed store";
  const storeBio = profile.bio || "This seller has not added a store bio yet.";
  const activeCount = listings.length;
  const categoryCount = Array.from(
    new Set(listings.map((item) => item.category || "general"))
  ).length;

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
            href="/my-page"
            className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            My page
          </Link>

          <Link
            href="/profile"
            className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            Edit profile
          </Link>
        </div>

        <header className="mb-8 overflow-hidden rounded-[36px] border border-black/8 bg-white shadow-sm">
          <div className="h-44 bg-neutral-200 sm:h-56">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt="Store banner"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-neutral-200" />
            )}
          </div>

          <div className="px-6 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-10 flex flex-col gap-6 sm:-mt-12 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#111827] text-2xl font-semibold text-white shadow-sm">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Store avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (storeName.trim().charAt(0) || "S").toUpperCase()
                  )}
                </div>

                <p className="mt-5 text-xs font-medium uppercase tracking-[0.24em] text-black/40">
                  Public store
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                  {storeName}
                </h1>
                <p className="mt-3 text-sm text-black/45">/store/{profile.store_slug}</p>
                <p className="mt-4 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
                  {storeBio}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/sell"
                  className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                >
                  + Add listing
                </Link>
              </div>
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
            <p className="mt-2 text-2xl font-semibold">Live</p>
          </div>
        </section>

        <section className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
            Listings
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Active items from this store
          </h2>
        </section>

        {listings.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">No active listings yet</p>
            <p className="mt-2 text-black/55">
              This seller has no active listings at the moment.
            </p>
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