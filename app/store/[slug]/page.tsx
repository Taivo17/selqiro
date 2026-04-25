"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";

type ProfileRow = {
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
  created_at?: string | null;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  status?: "active" | "paused" | "sold";
  category?: string | null;
  condition?: string | null;
  country?: string | null;
  city?: string | null;
  location?: string | null;
};

export default function StorePage() {
  const params = useParams();
  const slugParam = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.id ?? null;

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "sold">("all");

  useEffect(() => {
    let cancelled = false;

    const loadStore = async () => {
      setPageLoading(true);
      setNotFound(false);

      const slug = decodeURIComponent((slugParam || "").trim());

      if (!slug) {
        if (!cancelled) {
          setProfile(null);
          setListings([]);
          setNotFound(true);
          setPageLoading(false);
        }
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, store_name, store_slug, bio, avatar_url, banner_url")
        .eq("store_slug", slug)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error("Error loading store profile:", profileError);
        setProfile(null);
        setListings([]);
        setNotFound(true);
        setPageLoading(false);
        return;
      }

      if (!profileData) {
        setProfile(null);
        setListings([]);
        setNotFound(true);
        setPageLoading(false);
        return;
      }

      const loadedProfile = profileData as ProfileRow;
      setProfile(loadedProfile);

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", loadedProfile.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (listingError) {
        console.error("Error loading store listings:", listingError);
        setListings([]);
        setPageLoading(false);
        return;
      }

      setListings((listingData || []) as Listing[]);
      setPageLoading(false);
    };

    loadStore();

    return () => {
      cancelled = true;
    };
  }, [slugParam]);

  const isOwner = !!currentUserId && !!profile?.id && currentUserId === profile.id;

  const visibleListings = useMemo(() => {
    return listings.filter((item) => {
      const itemStatus = item.status || "active";

      if (!isOwner && itemStatus !== "active") {
        return false;
      }

      const matchesSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ? true : itemStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [listings, search, statusFilter, isOwner]);

  const stats = useMemo(() => {
    const active = listings.filter((item) => (item.status || "active") === "active").length;
    const paused = listings.filter((item) => item.status === "paused").length;
    const sold = listings.filter((item) => item.status === "sold").length;

    return {
      all: listings.length,
      active,
      paused,
      sold,
    };
  }, [listings]);

  if (pageLoading || authLoading) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-medium">Loading store...</p>
        </div>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-medium">Store not found</p>
          <p className="mt-2 text-black/55">
            This store link does not exist or is no longer available.
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
              Open profile
            </Link>
          </div>
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

          {isOwner && (
            <Link
              href="/my-page"
              className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
            >
              My page
            </Link>
          )}

          <Link
            href="/profile"
            className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            Edit profile
          </Link>
        </div>

        <section className="mb-8 overflow-hidden rounded-[36px] border border-black/8 bg-white shadow-sm">
          <div className="relative h-52 w-full bg-neutral-100 sm:h-64 lg:h-72">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt={profile.store_name || "Store banner"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-200" />
            )}
          </div>

          <div className="px-6 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-16 flex flex-col gap-6 sm:-mt-20 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-white shadow-md sm:h-32 sm:w-32">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.store_name || "Store avatar"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#111827] text-3xl font-semibold text-white">
                      {(profile.store_name || "S").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="pb-1">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-black/40">
                    Public store
                  </p>
                  <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                    {profile.store_name || "Unnamed store"}
                  </h1>
                  <p className="mt-2 text-lg text-black/55">
                    /store/{profile.store_slug}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {isOwner && (
                  <Link
                    href="/sell"
                    className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                  >
                    + Add listing
                  </Link>
                )}

                <Link
                  href="/"
                  className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
                >
                  Browse marketplace
                </Link>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-black/55">
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                {stats.active} active
              </span>
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                {stats.sold} sold
              </span>
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                {stats.all} total listings
              </span>
              {isOwner && (
                <span className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-green-700">
                  Owner view
                </span>
              )}
            </div>

            <div className="mt-6 max-w-3xl text-base leading-7 text-black/65">
              {profile.bio ? (
                <p>{profile.bio}</p>
              ) : (
                <p>This store has not added a public description yet.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
              Search
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Browse this store
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <input
              type="text"
              placeholder="Search store listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "active" | "paused" | "sold"
                )
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
            >
              <option value="all">All visible statuses</option>
              <option value="active">Active</option>
              {isOwner && <option value="paused">Paused</option>}
              {isOwner && <option value="sold">Sold</option>}
            </select>
          </div>
        </section>

        <section className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
            Listings
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Items from this store
          </h2>
        </section>

        {visibleListings.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">No visible listings</p>
            <p className="mt-2 text-black/55">
              {isOwner
                ? "This store has no listings matching the current filter."
                : "This store currently has no public active listings matching the current filter."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {visibleListings.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-[30px] border border-black/8 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <Link href={`/listing/${item.id}`}>
                  <div className="cursor-pointer">
                    <div className="mb-4 overflow-hidden rounded-2xl bg-neutral-100">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-56 w-full object-cover"
                        />
                      ) : (
                        <div className="h-56 w-full bg-neutral-100" />
                      )}
                    </div>

                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-2xl font-semibold tracking-tight">
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

                    <p className="line-clamp-2 text-base leading-7 text-black/60">
                      {item.description}
                    </p>

                    <p className="mt-5 text-4xl font-semibold">{item.price}</p>

                    <div className="mt-4 text-sm text-black/45">
                      {item.category || "general"} • {item.condition || "used"} •{" "}
                      {item.country || "No country"}
                      {item.city ? ` • ${item.city}` : ""}
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}