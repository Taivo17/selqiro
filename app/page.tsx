"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { CATEGORY_TREE } from "../lib/categories";

const PAGE_SIZE = 30;

type ListingImage = {
  id: string;
  thumb_url?: string | null;
  medium_url?: string | null;
  original_url?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
};

type Listing = {
  id: number;
  user_id?: string | null;
  created_at?: string;
  title: string;
  description: string;
  price: string;
  price_amount?: number | null;
  image?: string | null;
  status?: "active" | "paused" | "sold";
  active_until?: string | null;
  category?: string | null;
  condition?: string | null;
  location?: string | null;
  country?: string | null;
  city?: string | null;
  listing_lat?: number | null;
  listing_lng?: number | null;
  subcategory?: string | null;
  search_text?: string | null;
  details?: Record<string, unknown> | null;
  listing_images?: ListingImage[];
};

type ProfileRow = {
  id: string;
  store_slug?: string | null;
  store_name?: string | null;
  is_premium?: boolean | null;
  home_country?: string | null;
  home_city?: string | null;
  home_lat?: number | null;
  home_lng?: number | null;
};

function parsePriceAmount(value: string) {
  const normalized = value
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePrice(value?: string | null) {
  if (!value) return null;

  const normalized = value
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeCity(country: string, city: string) {
  const response = await fetch("/api/location/geocode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      country,
      city,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    return null;
  }

  return {
    lat: data.lat,
    lng: data.lng,
  };
}

function getListingImage(item: Listing) {
  const sortedImages = [...(item.listing_images || [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  const img = sortedImages[0];

  return (
    img?.thumb_url ||
    img?.medium_url ||
    img?.original_url ||
    item.image ||
    ""
  );
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<
    Record<string, ProfileRow>
  >({});
  const [currentProfile, setCurrentProfile] = useState<ProfileRow | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [detailCategoryFilter, setDetailCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [searchNearCity, setSearchNearCity] = useState("");
  const [searchNearCoords, setSearchNearCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [nearOnly, setNearOnly] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setSubcategoryFilter("all");
    setDetailCategoryFilter("all");
    setConditionFilter("all");
    setPriceMin("");
    setPriceMax("");
    setLocationFilter("");
    setNearOnly(false);
    setShowMoreFilters(false);
  };

  const loadCurrentProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setCurrentProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, home_country, home_city, home_lat, home_lng")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading current profile:", error);
      return;
    }

    setCurrentProfile((data || null) as ProfileRow | null);
  };

  const loadProfiles = async (items: Listing[]) => {
    const userIds = Array.from(
      new Set(
        items
          .map((item) => item.user_id)
          .filter((value): value is string => Boolean(value))
      )
    ).filter((id) => !profilesByUserId[id]);

    if (userIds.length === 0) return;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, store_slug, store_name, is_premium")
      .in("id", userIds);

    if (profileError) {
      console.error("Error loading store profiles:", profileError);
      return;
    }

    const profileMap: Record<string, ProfileRow> = {};
    ((profileData || []) as ProfileRow[]).forEach((profile) => {
      profileMap[profile.id] = profile;
    });

    setProfilesByUserId((prev) => ({ ...prev, ...profileMap }));
  };

  const loadMarketplace = async (from = 0) => {
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("listings")
      .select(
        "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)"
      )
      .eq("status", "active")
      .gt("active_until", new Date().toISOString())
      .order("created_at", { ascending: false })
      .range(from, to);

    if (categoryFilter !== "all") {
      query = query.eq("category", categoryFilter);
    }

    if (subcategoryFilter !== "all") {
      query = query.eq("subcategory", subcategoryFilter);
    }

    if (conditionFilter !== "all") {
      query = query.eq("condition", conditionFilter);
    }

    const minPrice = priceMin.trim() ? Number(priceMin.trim()) : null;
    const maxPrice = priceMax.trim() ? Number(priceMax.trim()) : null;

    if (minPrice !== null && Number.isFinite(minPrice)) {
      query = query.gte("price_amount", minPrice);
    }

    if (maxPrice !== null && Number.isFinite(maxPrice)) {
      query = query.lte("price_amount", maxPrice);
    }

    // detail category still filtered client-side for now

    const searchNeedle = search.trim();

    if (searchNeedle) {
      const searchTokens = searchNeedle
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      if (searchTokens.length > 0) {
        const prefixQuery = searchTokens
          .map((token) => `${token}:*`)
          .join(" & ");

        query = query.filter("search_vector", "fts(simple)", prefixQuery);
      }
    }

    const locationNeedle = locationFilter.trim();

    if (nearOnly && currentProfile?.home_country) {
      query = query.eq("country", currentProfile.home_country);
    } else if (locationNeedle) {
      query = query.or(
        `country.ilike.%${locationNeedle}%,city.ilike.%${locationNeedle}%,location.ilike.%${locationNeedle}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading marketplace listings:", error);
      if (from === 0) setListings([]);
      return;
    }

    const loaded = (data || []) as Listing[];

    if (from === 0) {
      setListings(loaded);
    } else {
      setListings((prev) => [...prev, ...loaded]);
    }

    setHasMore(loaded.length === PAGE_SIZE);
    await loadProfiles(loaded);
  };


  useEffect(() => {
    const loadSearchNearCoords = async () => {
      if (!searchNearCity.trim()) {
        setSearchNearCoords(null);
        return;
      }

      const country =
        currentProfile?.home_country || "Estonia";

      const coords = await geocodeCity(
        country,
        searchNearCity.trim()
      );

      setSearchNearCoords(coords);
    };

    loadSearchNearCoords();
  }, [searchNearCity, currentProfile?.home_country]);

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      await loadMarketplace(0);
      setLoading(false);
    };

    loadCurrentProfile();
    initialLoad();
  }, [
    search,
    categoryFilter,
    subcategoryFilter,
    detailCategoryFilter,
    conditionFilter,
    locationFilter,
    nearOnly,
    currentProfile?.home_country,
    currentProfile?.home_city,
    currentProfile?.home_lat,
    currentProfile?.home_lng,
    priceMin,
    priceMax,
  ]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    await loadMarketplace(listings.length);
    setLoadingMore(false);
  };


  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      {
        rootMargin: "700px",
      }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, listings.length]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        listings
          .map((item) => (item.category || "general").toLowerCase())
          .filter(Boolean)
      )
    ).sort();
  }, [listings]);

  const selectedCategory = CATEGORY_TREE.find(
    (item) => item.value === categoryFilter
  );

  const subcategoryOptions = useMemo(() => {
    if (!selectedCategory?.children || categoryFilter === "all") return [];

    const usedSubcategories = new Set(
      listings
        .filter((item) => (item.category || "general") === categoryFilter)
        .map((item) => item.subcategory || "")
        .filter(Boolean)
    );

    return selectedCategory.children.filter((item) =>
      usedSubcategories.has(item.value)
    );
  }, [selectedCategory, categoryFilter, listings]);

  const selectedSubcategory = subcategoryOptions.find(
    (item) => item.value === subcategoryFilter
  );

  const detailCategoryOptions = useMemo(() => {
    if (!selectedSubcategory || subcategoryFilter === "all") return [];

    const usedDetailCategories = new Set(
      listings
        .filter(
          (item) =>
            (item.category || "general") === categoryFilter &&
            (item.subcategory || "") === subcategoryFilter
        )
        .map((item) =>
          typeof item.details?.detailCategory === "string"
            ? item.details.detailCategory
            : ""
        )
        .filter(Boolean)
    );

    return ((selectedSubcategory as any).children || []).filter(
      (item: { value: string; label: string }) =>
        usedDetailCategories.has(item.value)
    );
  }, [selectedSubcategory, categoryFilter, subcategoryFilter, listings]);

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
    subcategoryFilter !== "all" ||
    detailCategoryFilter !== "all" ||
    conditionFilter !== "all" ||
    priceMin.trim() ||
    priceMax.trim() ||
    locationFilter.trim() ||
    nearOnly;

  const filteredListings = useMemo(() => {
    const searchCenterLat =
      searchNearCoords?.lat ?? currentProfile?.home_lat;

    const searchCenterLng =
      searchNearCoords?.lng ?? currentProfile?.home_lng;

    const searchCenterCity =
      searchNearCity.trim() ||
      currentProfile?.home_city ||
      "";

    const filtered = listings.filter((item) => {
      const title = item.title?.toLowerCase() || "";
      const description = item.description?.toLowerCase() || "";
      const searchText = item.search_text?.toLowerCase() || "";
      const detailsText = Object.values(item.details || {})
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      const country = item.country?.toLowerCase() || "";
      const city = item.city?.toLowerCase() || "";
      const location = item.location?.toLowerCase() || "";
      const category = (item.category || "general").toLowerCase();
      const subcategory = (item.subcategory || "").toLowerCase();
      const detailCategory =
        typeof item.details?.detailCategory === "string"
          ? item.details.detailCategory.toLowerCase()
          : "";
      const condition = (item.condition || "used").toLowerCase();
      const priceValue =
        typeof item.price_amount === "number"
          ? item.price_amount
          : parsePrice(item.price);

      const searchNeedle = search.trim().toLowerCase();
      const locationNeedle = locationFilter.trim().toLowerCase();
      const minPrice = priceMin.trim() ? Number(priceMin.trim()) : null;
      const maxPrice = priceMax.trim() ? Number(priceMax.trim()) : null;

      const searchTokens = searchNeedle.split(/\s+/).filter(Boolean);
      const combinedSearchText = [
        title,
        description,
        searchText,
        detailsText,
      ].join(" ");

      const matchesSearch =
        searchTokens.length === 0 ||
        searchTokens.every((token) => combinedSearchText.includes(token));

      const matchesCategory =
        categoryFilter === "all" ? true : category === categoryFilter;

      const matchesSubcategory =
        subcategoryFilter === "all" ? true : subcategory === subcategoryFilter;

      const matchesDetailCategory =
        detailCategoryFilter === "all"
          ? true
          : detailCategory === detailCategoryFilter;

      const matchesPriceMin =
        minPrice === null || priceValue === null ? true : priceValue >= minPrice;

      const matchesPriceMax =
        maxPrice === null || priceValue === null ? true : priceValue <= maxPrice;

      const matchesCondition =
        conditionFilter === "all" ? true : condition === conditionFilter;

      return matchesDetailCategory;
    });

    const homeLat = currentProfile?.home_lat;
    const homeLng = currentProfile?.home_lng;
    const homeCity = currentProfile?.home_city || "";

    if (
      nearOnly &&
      typeof searchCenterLat === "number" &&
      typeof searchCenterLng === "number"
    ) {
      return [...filtered].sort((a, b) => {
        const aHasCoords =
          typeof a.listing_lat === "number" &&
          typeof a.listing_lng === "number";

        const bHasCoords =
          typeof b.listing_lat === "number" &&
          typeof b.listing_lng === "number";

        if (!aHasCoords && !bHasCoords) return 0;
        if (!aHasCoords) return 1;
        if (!bHasCoords) return -1;

        const aCity = (a.city || "").toLowerCase();
        const bCity = (b.city || "").toLowerCase();
        const normalizedHomeCity =
          searchCenterCity.toLowerCase();

        const aSameCity = aCity === normalizedHomeCity;
        const bSameCity = bCity === normalizedHomeCity;

        if (aSameCity && !bSameCity) return -1;
        if (!aSameCity && bSameCity) return 1;

        const aDistance = calculateDistanceKm(
          searchCenterLat,
          searchCenterLng,
          a.listing_lat!,
          a.listing_lng!
        );

        const bDistance = calculateDistanceKm(
          searchCenterLat,
          searchCenterLng,
          b.listing_lat!,
          b.listing_lng!
        );

        return aDistance - bDistance;
      });
    }

    return filtered;
  }, [
    listings,
    search,
    categoryFilter,
    subcategoryFilter,
    detailCategoryFilter,
    conditionFilter,
    priceMin,
    priceMax,
    locationFilter,
    nearOnly,
    currentProfile?.home_city,
    currentProfile?.home_lat,
    currentProfile?.home_lng,
    searchNearCity,
    searchNearCoords?.lat,
    searchNearCoords?.lng,
  ]);

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

          <div className="mt-5 grid gap-3 xl:grid-cols-[1.1fr_0.8fr_0.8fr_1fr_0.8fr]">
            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm"
            />

            <input
              type="number"
              inputMode="numeric"
              placeholder="Price from"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm"
            />

            <input
              type="number"
              inputMode="numeric"
              placeholder="Price to"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm"
            />

            <input
              type="text"
              placeholder="Search near city..."
              value={searchNearCity}
              onChange={(e) => {
                setSearchNearCity(e.target.value);
                if (e.target.value.trim()) {
                  setNearOnly(true);
                }
              }}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm"
            />

            <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={nearOnly}
                onChange={(e) => setNearOnly(e.target.checked)}
                className="h-5 w-5"
              />
              <span className="text-sm text-black/75">
                {searchNearCity.trim()
                  ? `Near: ${searchNearCity}`
                  : nearOnly && currentProfile?.home_city
                  ? `Near you: ${currentProfile.home_city}`
                  : "Near you"}
              </span>
            </label>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowMoreFilters((value) => !value)}
              className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
            >
              {showMoreFilters ? "Hide more filters" : "More filters"}
            </button>
          </div>

          {showMoreFilters && (
            <div className="mt-3 grid gap-3 xl:grid-cols-4">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setSubcategoryFilter("all");
                  setDetailCategoryFilter("all");
                }}
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
                value={subcategoryFilter}
                onChange={(e) => {
                  setSubcategoryFilter(e.target.value);
                  setDetailCategoryFilter("all");
                }}
                disabled={subcategoryOptions.length === 0}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 disabled:opacity-50 sm:text-sm"
              >
                <option value="all">All subcategories</option>
                {subcategoryOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={detailCategoryFilter}
                onChange={(e) => setDetailCategoryFilter(e.target.value)}
                disabled={detailCategoryOptions.length === 0}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 disabled:opacity-50 sm:text-sm"
              >
                <option value="all">All detailed categories</option>
                {detailCategoryOptions.map((item: { value: string; label: string }) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
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
            </div>
          )}
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
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {filteredListings.map((item) => {
                const sellerProfile = item.user_id
                  ? profilesByUserId[item.user_id]
                  : undefined;

                const storeSlug = sellerProfile?.store_slug || "";
                const storeName = sellerProfile?.store_name || "Seller store";
                const sellerIsPremium = Boolean(sellerProfile?.is_premium);
                const imageUrl = getListingImage(item);

                return (
                  <article
                    key={item.id}
                    className={`overflow-hidden rounded-[22px] border p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${
                      sellerIsPremium
                        ? "border-amber-200/70 bg-gradient-to-br from-amber-50/55 via-white to-white hover:shadow-[0_18px_45px_rgba(251,191,36,0.35)] hover:-translate-y-2 scale-[1.01]"
                        : "border-black/8 bg-white hover:-translate-y-1 hover:shadow-md"
                    }`}
                  >
                    <Link href={`/listing/${item.id}`}>
                      <div className="cursor-pointer">
                        <div className="relative mb-3 overflow-hidden rounded-2xl bg-neutral-100">
                          {imageUrl ? (
                            <img decoding="async"
                              src={imageUrl}
                              alt={item.title}
                              loading="lazy"
                              className="aspect-[4/3] h-auto w-full object-cover sm:aspect-[16/10]"
                            />
                          ) : (
                            <div className="h-40 w-full bg-neutral-100 sm:h-44" />
                          )}

                          {sellerIsPremium && (
                            <span className="absolute right-2 top-2 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-black/50 bg-white/30 backdrop-blur-sm rounded-full opacity-70">
                              Premium
                            </span>
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

            {hasMore && (
              <div ref={loadMoreRef} className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-2xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}