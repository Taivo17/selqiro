"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";

type ListingImage = {
  id: string;
  thumb_url?: string | null;
  medium_url?: string | null;
  original_url?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
};

type ProfileRow = {
  id: string;
  store_name?: string | null;
  store_slug?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
};

type Listing = {
  id: number;
  user_id?: string | null;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  status?: "active" | "paused" | "sold";
  category?: string | null;
  condition?: string | null;
  country?: string | null;
  city?: string | null;
  listing_images?: ListingImage[];
};

export default function StorePage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused" | "sold"
  >("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const cleanSlug = decodeURIComponent((slug || "").trim());

      if (!cleanSlug) {
        setProfile(null);
        setListings([]);
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, store_name, store_slug, bio, avatar_url, banner_url")
        .eq("store_slug", cleanSlug)
        .maybeSingle();

      if (profileError || !profileData) {
        console.error("Error loading store:", profileError);
        setProfile(null);
        setListings([]);
        setLoading(false);
        return;
      }

      setProfile(profileData as ProfileRow);

      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select(
          "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)"
        )
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false })
        .limit(60);

      if (listingsError) {
        console.error("Error loading store listings:", listingsError);
        setListings([]);
        setLoading(false);
        return;
      }

      setListings((listingsData || []) as Listing[]);
      setLoading(false);
    };

    load();
  }, [slug]);

  const isOwner = !!user?.id && !!profile?.id && user.id === profile.id;

  const stats = useMemo(() => {
    return {
      total: listings.length,
      active: listings.filter((item) => (item.status || "active") === "active")
        .length,
      sold: listings.filter((item) => item.status === "sold").length,
    };
  }, [listings]);

  const visibleListings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return listings.filter((item) => {
      const itemStatus = item.status || "active";

      if (!isOwner && itemStatus !== "active") return false;
      if (statusFilter !== "all" && itemStatus !== statusFilter) return false;

      if (!query) return true;

      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });
  }, [listings, search, statusFilter, isOwner]);

  if (loading || authLoading) {
    return <main className="p-6">Loading store...</main>;
  }

  if (!profile) {
    return <main className="p-6">Store not found</main>;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f8f6] px-4 py-5 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-5 overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-sm sm:rounded-[36px]">
          <div className="relative h-36 w-full bg-neutral-100 sm:h-56 lg:h-64">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt={profile.store_name || "Store banner"}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-200" />
            )}
          </div>

          <div className="px-5 pb-5 sm:px-8 sm:pb-8">
            <div className="-mt-10 flex flex-col gap-4 sm:-mt-14 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-end gap-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-md sm:h-28 sm:w-28">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.store_name || "Store avatar"}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#111827] text-3xl font-semibold text-white">
                      {(profile.store_name || "S").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 pb-1">
                  <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-black/40">
                    Public store
                  </p>
                  <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-5xl">
                    {profile.store_name || "Unnamed store"}
                  </h1>
                  <p className="mt-1 break-words text-sm text-black/50 sm:text-base">
                    /store/{profile.store_slug}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {isOwner && (
                  <Link
                    href="/sell"
                    className="rounded-2xl bg-green-500 px-4 py-2 text-sm font-medium text-white"
                  >
                    + Add listing
                  </Link>
                )}

                <Link
                  href="/"
                  className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium"
                >
                  Marketplace
                </Link>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-sm text-black/55">
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-2">
                {stats.active} active
              </span>
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-2">
                {stats.sold} sold
              </span>
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-2">
                {stats.total} total
              </span>
              {isOwner && (
                <span className="rounded-full border border-green-200 bg-green-50 px-3 py-2 text-green-700">
                  Owner
                </span>
              )}
            </div>

            <div className="mt-5 max-w-3xl text-sm leading-6 text-black/65 sm:text-base">
              {profile.bio ? (
                <p className="break-words">{profile.bio}</p>
              ) : (
                <p>This store has not added a public description yet.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-[26px] border border-black/8 bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <input
              type="text"
              placeholder="Search store listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm"
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "active" | "paused" | "sold"
                )
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm"
            >
              <option value="all">All visible</option>
              <option value="active">Active</option>
              {isOwner && <option value="paused">Paused</option>}
              {isOwner && <option value="sold">Sold</option>}
            </select>
          </div>
        </section>

        <section className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
              Listings
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Items from this store
            </h2>
          </div>

          <p className="text-sm text-black/45">{visibleListings.length} shown</p>
        </section>

        {visibleListings.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">No visible listings</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleListings.map((item) => {
              const sortedImages = [...(item.listing_images || [])].sort(
                (a, b) => {
                  if (a.is_primary && !b.is_primary) return -1;
                  if (!a.is_primary && b.is_primary) return 1;
                  return (a.sort_order || 0) - (b.sort_order || 0);
                }
              );

              const img = sortedImages[0];

              const imageUrl =
                img?.thumb_url ||
                img?.medium_url ||
                img?.original_url ||
                item.image ||
                "";

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[22px] border border-black/8 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <Link href={`/listing/${item.id}`}>
                    <div className="cursor-pointer">
                      <div className="mb-3 overflow-hidden rounded-2xl bg-neutral-100">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.title}
                            loading="lazy"
                            className="h-40 w-full object-cover sm:h-44"
                          />
                        ) : (
                          <div className="h-40 w-full bg-neutral-100 sm:h-44" />
                        )}
                      </div>

                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 break-words text-lg font-semibold tracking-tight sm:text-xl">
                          {item.title}
                        </h3>

                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium capitalize ${
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

                      <p className="line-clamp-2 break-words text-sm leading-5 text-black/60">
                        {item.description}
                      </p>

                      <p className="mt-3 break-words text-2xl font-semibold sm:text-3xl">
                        {item.price}
                      </p>

                      <div className="mt-2 line-clamp-1 text-xs text-black/45 sm:text-sm">
                        {item.category || "general"} •{" "}
                        {item.condition || "used"} •{" "}
                        {item.country || "No country"}
                        {item.city ? ` • ${item.city}` : ""}
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}