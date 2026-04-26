"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Listing = {
  id: number;
  user_id?: string | null;
  created_at?: string;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  status?: "active" | "paused" | "sold";
  category?: string | null;
  condition?: string | null;
  location?: string | null;
  country?: string | null;
  city?: string | null;
};

type ProfileRow = {
  id: string;
  store_slug?: string | null;
  store_name?: string | null;
};

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, ProfileRow>>({});
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [nearOnly, setNearOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setConditionFilter("all");
    setLocationFilter("");
    setNearOnly(false);
  };

  useEffect(() => {
    const loadMarketplace = async () => {
      setLoading(true);

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(30);

      if (listingError) {
        console.error("Error loading marketplace listings:", listingError);
        setListings([]);
        setProfilesByUserId({});
        setLoading(false);
        return;
      }

      const loadedListings = (listingData || []) as Listing[];
      setListings(loadedListings);

      const userIds = Array.from(
        new Set(
          loadedListings
            .map((item) => item.user_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      if (userIds.length === 0) {
        setProfilesByUserId({});
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, store_slug, store_name")
        .in("id", userIds);

      if (profileError) {
        console.error("Error loading store profiles:", profileError);
        setProfilesByUserId({});
        setLoading(false);
        return;
      }

      const profileMap: Record<string, ProfileRow> = {};
      ((profileData || []) as ProfileRow[]).forEach((profile) => {
        profileMap[profile.id] = profile;
      });

      setProfilesByUserId(profileMap);
      setLoading(false);
    };

    loadMarketplace();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        listings
          .map((item) => (item.category || "general").toLowerCase())
          .filter(Boolean)
      )
    ).sort();
  }, [listings]);

  const conditions = useMemo(() => {
    return Array.from(
      new Set(
        listings
          .map((item) => (item.condition || "used").toLowerCase())
          .filter(Boolean)
      )
    ).sort();
  }, [listings]);

  const filtersActive =
    search.trim() ||
    categoryFilter !== "all" ||
    conditionFilter !== "all" ||
    locationFilter.trim() ||
    nearOnly;

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const title = item.title?.toLowerCase() || "";
      const description = item.description?.toLowerCase() || "";
      const country = item.country?.toLowerCase() || "";
      const city = item.city?.toLowerCase() || "";
      const location = item.location?.toLowerCase() || "";
      const category = (item.category || "general").toLowerCase();
      const condition = (item.condition || "used").toLowerCase();

      const searchNeedle = search.trim().toLowerCase();
      const locationNeedle = locationFilter.trim().toLowerCase();

      const matchesSearch =
        !searchNeedle ||
        title.includes(searchNeedle) ||
        description.includes(searchNeedle);

      const matchesCategory =
        categoryFilter === "all" ? true : category === categoryFilter;

      const matchesCondition =
        conditionFilter === "all" ? true : condition === conditionFilter;

      const matchesLocation =
        !locationNeedle ||
        country.includes(locationNeedle) ||
        city.includes(locationNeedle) ||
        location.includes(locationNeedle);

      const matchesNearOnly = nearOnly ? matchesLocation : true;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesCondition &&
        matchesLocation &&
        matchesNearOnly
      );
    });
  }, [listings, search, categoryFilter, conditionFilter, locationFilter, nearOnly]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f8f6] px-4 py-5 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-5 rounded-[26px] border border-black/8 bg-white p-4 shadow-sm sm:rounded-[36px] sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <button
                type="button"
                onClick={resetFilters}
                className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-black/40"
              >
                Filters
              </button>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                Browse marketplace
              </h1>
            </div>

            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="w-fit rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[1.1fr_0.9fr_0.9fr_1fr_0.8fr]">
            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm"
            >
              <option value="all">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm"
            >
              <option value="all">All conditions</option>
              {conditions.map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm"
            />

            <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={nearOnly}
                onChange={(e) => setNearOnly(e.target.checked)}
                className="h-5 w-5"
              />
              <span className="text-sm text-black/75">Near you</span>
            </label>
          </div>
        </section>

        <section className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
              Listings
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Latest items
            </h2>
          </div>

          <p className="text-sm text-black/45">{filteredListings.length} shown</p>
        </section>

        {loading ? (
          <div className="rounded-[28px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">Loading marketplace...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">No matching listings</p>
            <p className="mt-2 text-black/55">
              Try changing your filters or search term.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredListings.map((item) => {
              const sellerProfile = item.user_id
                ? profilesByUserId[item.user_id]
                : undefined;

              const storeSlug = sellerProfile?.store_slug || "";
              const storeName = sellerProfile?.store_name || "Seller store";

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[22px] border border-black/8 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <Link href={`/listing/${item.id}`}>
                    <div className="cursor-pointer">
                      <div className="mb-3 overflow-hidden rounded-2xl bg-neutral-100">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            loading="lazy"
                            className="h-36 w-full object-contain p-1 sm:h-40"
                          />
                        ) : (
                          <div className="h-36 w-full bg-neutral-100 sm:h-40" />
                        )}
                      </div>

                      <h3 className="line-clamp-1 break-words text-lg font-semibold tracking-tight sm:text-xl">
                        {item.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 break-words text-sm leading-5 text-black/60">
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

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/6 pt-3">
                    <span className="min-w-0 truncate text-xs text-black/45 sm:text-sm">
                      {storeName}
                    </span>

                    {storeSlug ? (
                      <Link
                        href={`/store/${storeSlug}`}
                        className="shrink-0 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium transition hover:bg-black/[0.03] sm:text-sm"
                      >
                        Store
                      </Link>
                    ) : (
                      <span className="shrink-0 rounded-xl border border-black/8 bg-black/[0.02] px-3 py-2 text-xs text-black/35 sm:text-sm">
                        No store
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}