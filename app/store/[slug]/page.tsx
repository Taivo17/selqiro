"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { getTranslation } from "../../../lib/i18n/useTranslation";

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
  identity_id?: string | null;
  identity_type?: string | null;
  business_account_id?: string | null;
  legacy_user_id?: string | null;
  store_name?: string | null;
  store_slug?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  banner_dominant_color?: string | null;
  avatar_dominant_color?: string | null;

  is_premium?: boolean | null;
};

type StoreCategory = {
  id: string;
  name: string;
  sort_order?: number | null;
};

type CurrentProfile = {
  id: string;
  language?: string | null;
  active_identity_id?: string | null;
};

type Listing = {
  id: number;
  user_id?: string | null;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  status?: "active" | "paused" | "sold";
  active_until?: string | null;
  category?: string | null;
  condition?: string | null;
  country?: string | null;
  city?: string | null;
  subcategory?: string | null;
  search_text?: string | null;
  details?: Record<string, unknown> | null;
  listing_images?: ListingImage[];
  listing_store_categories?: {
    store_category_id: string;
  }[];
};

function buildPrefixSearchQuery(value: string) {
  const tokens = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return "";

  return tokens.map((token) => `${token}:*`).join(" & ");
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

function isExpired(activeUntil?: string | null) {
  if (!activeUntil) return false;
  return new Date(activeUntil).getTime() <= Date.now();
}

export default function StorePage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [selectedStoreCategoryId, setSelectedStoreCategoryId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);

  const storeMenuRef = useRef<HTMLDivElement | null>(null);

  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("scam");
  const [reportDetails, setReportDetails] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused" | "sold"
  >("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const load = async () => {
      if (!profile) setLoading(true);

      let loadedCurrentProfile: CurrentProfile | null = null;

      if (user?.id) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("id, language, active_identity_id")
          .eq("id", user.id)
          .maybeSingle();

        loadedCurrentProfile = (profileRow || null) as CurrentProfile | null;
        setCurrentProfile(loadedCurrentProfile);
      } else {
        loadedCurrentProfile = null;
        setCurrentProfile(null);
      }

      const cleanSlug = decodeURIComponent((slug || "").trim());

      if (!cleanSlug) {
        setProfile(null);
        setListings([]);
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .rpc("get_store_by_slug", {
          store_slug_input: cleanSlug,
        })
        .maybeSingle();

      if (profileError || !profileData) {
        console.error("Error loading store:", profileError);
        setProfile(null);
        setListings([]);
        setLoading(false);
        return;
      }


      const storeData = profileData as any;
      const storeIdentityId = storeData.identity_id as string | null;
      const storeLegacyUserId = storeData.legacy_user_id as string | null;
      const storeOwnerKey = storeIdentityId || storeLegacyUserId;

      setProfile({
        id: storeData.legacy_user_id || storeData.identity_id,
        identity_id: storeData.identity_id,
        identity_type: storeData.identity_type,
        business_account_id: storeData.business_account_id,
        legacy_user_id: storeData.legacy_user_id,
        store_name: storeData.display_name,
        store_slug: storeData.slug,
        bio: storeData.bio,
        avatar_url: storeData.avatar_url,
        banner_url: storeData.banner_url,
        banner_dominant_color: storeData.banner_dominant_color,
        avatar_dominant_color: null,
        is_premium: storeData.is_premium,
      } as ProfileRow);
      setSelectedStoreCategoryId("all");

      const viewerActiveIdentityId =
        loadedCurrentProfile?.active_identity_id || null;

      const viewerIsStoreOwner =
        !!storeIdentityId && viewerActiveIdentityId === storeIdentityId;

      const { data: followState } = await supabase
        .rpc("get_identity_store_follow_status_v2", {
          p_follower_identity_id: viewerActiveIdentityId,
          p_store_identity_id: storeIdentityId,
        })
        .maybeSingle();

      setIsFollowing(Boolean((followState as any)?.is_following));
      setFollowersCount(Number((followState as any)?.followers_count || 0));

      if (user?.id && !viewerIsStoreOwner) {
        const { data: blockRows } = await supabase
          .from("user_blocks")
          .select("id, blocker_id")
          .or(
            `and(blocker_id.eq.${user?.id || ''},blocked_id.eq.${storeOwnerKey}),and(blocker_id.eq.${storeOwnerKey},blocked_id.eq.${user?.id || ''})`
          );

        const blocks = blockRows || [];

        setIsBlocked(blocks.length > 0);
        setBlockedByMe(
          blocks.some((row: any) => row.blocker_id === user?.id)
        );

        if (blocks.length > 0) {
          setProfile(null);
          setListings([]);
          setLoading(false);
          return;
        }

      } else {
        setIsBlocked(false);
        setBlockedByMe(false);
      }


      const { data: categoryData, error: categoryError } = await supabase
        .from("store_categories")
        .select("id, name, sort_order")
        .eq("identity_id", storeIdentityId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (categoryError) {
        console.error("Error loading store sections:", categoryError);
        setStoreCategories([]);
      } else {
        setStoreCategories((categoryData || []) as StoreCategory[]);
      }

      const ownerIsViewing = viewerIsStoreOwner;

      let listingsQuery = supabase
        .from("listings")
        .select(
          "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order), listing_store_categories(store_category_id)"
        )
        .eq("identity_id", storeIdentityId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (!ownerIsViewing) {
        listingsQuery = listingsQuery
          .eq("status", "active")
          .gt("active_until", new Date().toISOString());
      }

      const searchQuery = buildPrefixSearchQuery(debouncedSearch);

      if (searchQuery) {
        listingsQuery = listingsQuery.filter(
          "search_vector",
          "fts(simple)",
          searchQuery
        );
      }

      const { data: listingsData, error: listingsError } = await listingsQuery;

      if (listingsError) {
        console.error("Error loading store listings:", listingsError);
        setListings([]);
        setLoading(false);
        return;
      }

      setListings((listingsData || []) as Listing[]);
      setLoading(false);
    };

    if (!authLoading) {
      load();
    }
  }, [slug, user?.id, authLoading, debouncedSearch, currentProfile?.active_identity_id]);


  useEffect(() => {
    if (!storeMenuOpen) return;

    const closeMenu = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;

      if (
        storeMenuRef.current &&
        target &&
        !storeMenuRef.current.contains(target)
      ) {
        setStoreMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("touchstart", closeMenu);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("touchstart", closeMenu);
    };
  }, [storeMenuOpen]);

  const toggleFollow = async () => {
    if (!user?.id || !profile?.identity_id || followLoading) return;

    setFollowLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        "toggle_store_follow_identity",
        {
          p_store_identity_id: profile.identity_id,
        }
      );

      if (error) throw error;

      const nowFollowing = Boolean(data);

      setIsFollowing(nowFollowing);
      setFollowersCount((prev) =>
        nowFollowing ? prev + 1 : Math.max(0, prev - 1)
      );
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setFollowLoading(false);
    }
  };



  const reportUser = async () => {
    if (!user?.id || !profile?.identity_id) return;

    const { error } = await supabase.rpc("submit_identity_report", {
      p_reported_identity_id: profile.identity_id,
      p_reason: reportReason,
      p_details: reportDetails.trim() || null,
    });

    if (error) {
      console.error("Report submit error:", error);
      alert(`Could not submit report: ${error.message || "Unknown error"}`);
      return;
    }

    setReportOpen(false);
    setReportReason("scam");
    setReportDetails("");

    alert("Thank you. Your report has been submitted for review.");
  };

const blockUser = async () => {
    if (!user?.id || !profile?.identity_id) return;

    const confirmed = window.confirm(
      `Block this user?

You will no longer see this user's listings in your marketplace view.`
    );

    if (!confirmed) return;

    const { data, error } = await supabase.rpc("block_store_identity_owner", {
      p_store_identity_id: profile.identity_id,
    });

    if (error) {
      console.error(error);
      alert("Could not block user.");
      return;
    }

    if (data === "own_identity") {
      alert("See identiteet kuulub sinu kontole. Oma identiteete ei saa blokeerida.");
      setStoreMenuOpen(false);
      return;
    }

    if (data !== "blocked") {
      alert("Could not identify store owner.");
      return;
    }

    setIsBlocked(true);
    setBlockedByMe(true);
    setStoreMenuOpen(false);
  };

  const unblockUser = async () => {
    if (!user?.id || !profile?.id) return;

    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", profile.id);

    if (error) {
      console.error(error);
      alert("Could not unblock user.");
      return;
    }

    setIsBlocked(false);
    setBlockedByMe(false);
    setStoreMenuOpen(false);
  };

  const isOwner =
    !!currentProfile?.active_identity_id &&
    !!profile?.identity_id &&
    currentProfile.active_identity_id === profile.identity_id;

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
      const expired = isExpired(item.active_until);

      if (!isOwner && itemStatus !== "active") return false;
      if (!isOwner && expired) return false;

      if (statusFilter !== "all" && itemStatus !== statusFilter) return false;

      if (
        selectedStoreCategoryId !== "all" &&
        !item.listing_store_categories?.some(
          (category) =>
            category.store_category_id === selectedStoreCategoryId
        )
      ) {
        return false;
      }

      const searchTokens = query.split(/\s+/).filter(Boolean);
      if (searchTokens.length === 0) return true;

      const detailsText = Object.values(item.details || {})
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      const combinedSearchText = [
        item.title || "",
        item.description || "",
        item.search_text || "",
        detailsText,
        item.category || "",
        item.subcategory || "",
        item.condition || "",
        item.country || "",
        item.city || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchTokens.every((token) =>
        combinedSearchText.includes(token)
      );
    });
  }, [listings, search, statusFilter, selectedStoreCategoryId, isOwner]);

  const language = currentProfile?.language || "en";
  const t = (key: any) => getTranslation(language, key);

  if (loading || authLoading) {
    return <main className="p-6">{t("storePage.loadingStore")}</main>;
  }

  if (!profile) {
    return <main className="p-6">{t("storePage.storeNotFound")}</main>;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f8f6] px-4 py-5 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section
          className={`relative mb-5 overflow-hidden rounded-[28px] border shadow-sm sm:rounded-[36px] ${
            profile.is_premium
              ? "border-yellow-200 bg-white shadow-[0_12px_50px_rgba(251,191,36,0.18)]"
              : "border-black/8 bg-white"
          }`}
        >

                    {profile.is_premium && (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background: `
                    radial-gradient(
                      circle at left bottom,
                      ${(profile.avatar_dominant_color || "#3b82f6")}99 0%,
                      ${(profile.avatar_dominant_color || "#3b82f6")}55 22%,
                      transparent 46%
                    ),
                    linear-gradient(
                      to bottom,
                      rgba(255,255,255,0.00) 0%,
                      rgba(255,255,255,0.08) 34%,
                      rgba(255,255,255,0.42) 58%,
                      rgba(255,255,255,0.78) 100%
                    ),
                    linear-gradient(
                      135deg,
                      transparent 0%,
                      transparent 58%,
                      ${(profile.banner_dominant_color || "#f59e0b")}22 82%,
                      ${(profile.banner_dominant_color || "#f59e0b")}44 100%
                    )
                  `,
                }}
              />

              <div
                className="absolute inset-0"
                style={{
                  backdropFilter: "blur(0.45px)",
                  WebkitBackdropFilter: "blur(0.45px)",
                  maskImage:
                    "linear-gradient(to bottom, transparent 0%, transparent 42%, rgba(0,0,0,0.42) 76%, rgba(0,0,0,0.85) 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 0%, transparent 42%, rgba(0,0,0,0.42) 76%, rgba(0,0,0,0.85) 100%)",
                }}
              />
            </>
          )}

          <div className="relative z-10">
          <div className={`h-36 w-full sm:h-52 lg:h-60 ${profile.is_premium ? "bg-transparent" : "bg-neutral-100"}`}>
            {profile.banner_url ? (
              <img decoding="async"
                src={profile.banner_url}
                alt={profile.store_name || "Store banner"}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-200" />
            )}
          </div>

          <div
            className="px-5 pb-5 pt-0 sm:px-8 sm:pb-8"
            style={
              profile.is_premium && profile.banner_url
                ? {
                    backgroundImage: `
                      radial-gradient(
                        circle at left bottom,
                        ${(profile.avatar_dominant_color || "#3b82f6")}99 0%,
                        ${(profile.avatar_dominant_color || "#3b82f6")}55 24%,
                        transparent 52%
                      ),
                      linear-gradient(
                        135deg,
                        ${(profile.banner_dominant_color || "#f59e0b")}24 0%,
                        rgba(255,255,255,0.62) 42%,
                        ${(profile.banner_dominant_color || "#f59e0b")}38 100%
                      ),
                      linear-gradient(
                        to bottom,
                        rgba(255,255,255,0.28) 0%,
                        rgba(255,255,255,0.72) 55%,
                        rgba(255,255,255,0.90) 100%
                      )
                    `,
                  }
                : undefined
            }
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="-mt-10 h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-md sm:-mt-12 sm:h-28 sm:w-28">
                  {profile.avatar_url ? (
                    <img decoding="async"
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
                    {t("storePage.publicStore")}
                  </p>
                  <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-5xl">
                    {profile.store_name || "Unnamed store"}
                  </h1>
                  <p className="mt-1 break-words text-sm text-black/50 sm:text-base">
                    /store/{profile.store_slug}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:pb-1">
                {isOwner && (
                  <Link
                    href="/sell"
                    className="rounded-2xl bg-green-500 px-4 py-2 text-sm font-medium text-white"
                  >
                    {t("storePage.addListing")}
                  </Link>
                )}

                {!isOwner && (
                  <button
                    type="button"
                    onClick={toggleFollow}
                    disabled={followLoading}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                      isFollowing
                        ? "border border-black/10 bg-white text-black"
                        : "bg-black text-white"
                    }`}
                  >
                    {followLoading
                      ? t("storePage.loading")
                      : isFollowing
                      ? t("storePage.following")
                      : t("storePage.follow")}
                  </button>
                )}

                <Link
                  href="/"
                  className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium"
                >
                  {t("navigation.marketplace")}
                </Link>

                {!isOwner && user?.id && (
                  <div ref={storeMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setStoreMenuOpen((v) => !v)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-sm font-semibold text-black/65"
                    >
                      i
                    </button>

                    {storeMenuOpen && (
                      <div className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-black/10 bg-white p-2 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setStoreMenuOpen(false);
                            setReportOpen(true);
                          }}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-black/70 hover:bg-black/[0.04]"
                        >
                          Report user
                        </button>

                        <div className="my-1 border-t border-black/10" />

                        {blockedByMe ? (
                          <button
                            type="button"
                            onClick={unblockUser}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-black/70 hover:bg-black/[0.04]"
                          >
                            Unblock user
                          </button>
                        ) : isBlocked ? (
                          <button
                            type="button"
                            disabled
                            className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-black/45"
                          >
                            User blocked
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={blockUser}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-black/70 hover:bg-black/[0.04]"
                          >
                            Block user
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-sm text-black/55">
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-2">
                {stats.active} {t("storePage.active")}
              </span>
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-2">
                {stats.sold} {t("storePage.sold")}
              </span>
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-2">
                {stats.total} {t("storePage.total")}
              </span>

              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-2">
                {followersCount} {t("storePage.followers")}
              </span>
              {profile.is_premium && (
                <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-2 text-yellow-800">
                  Premium
                </span>
              )}

              {isOwner && (
                <span className="rounded-full border border-green-200 bg-green-50 px-3 py-2 text-green-700">
                  {t("storePage.owner")}
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
          </div>
        </section>


        {reportOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setReportOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold">
                Report user
              </h3>

              <p className="mt-2 text-sm text-black/55">
                Tell us why you are reporting this user.
              </p>

              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="mt-4 w-full rounded-2xl border border-black/10 px-4 py-3"
              >
                <option value="scam">Scam or fraud</option>
                <option value="harassment">Harassment</option>
                <option value="spam">Spam</option>
                <option value="fake_account">Fake account</option>
                <option value="suspicious_behavior">Suspicious behavior</option>
                <option value="other">Other</option>
              </select>

              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Optional details..."
                className="mt-3 h-28 w-full resize-none rounded-2xl border border-black/10 px-4 py-3"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="rounded-2xl border border-black/10 px-4 py-3"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={reportUser}
                  className="rounded-2xl bg-black px-4 py-3 text-white"
                >
                  Submit report
                </button>
              </div>
            </div>
          </div>
        )}

        {storeCategories.length > 0 && (
          <section className="mb-5 rounded-[26px] border border-black/8 bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
              {t("storePage.storeSections")}
            </p>

            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              <button
                type="button"
                onClick={() => setSelectedStoreCategoryId("all")}
                className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  selectedStoreCategoryId === "all"
                    ? "bg-black text-white"
                    : "border border-black/10 bg-white text-black hover:bg-black/[0.03]"
                }`}
              >
                {t("storePage.all")}
              </button>

              {storeCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedStoreCategoryId(category.id)}
                  className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    selectedStoreCategoryId === category.id
                      ? "bg-black text-white"
                      : "border border-black/10 bg-white text-black hover:bg-black/[0.03]"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mb-5 rounded-[26px] border border-black/8 bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <input
              type="text"
              placeholder={t("storePage.searchStoreListings")}
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
              <option value="all">{t("storePage.allVisible")}</option>
              <option value="active">Active</option>
              {isOwner && <option value="paused">Paused</option>}
              {isOwner && <option value="sold">Sold</option>}
            </select>
          </div>
        </section>

        <section className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
              {t("storePage.listings")}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {t("storePage.itemsFromThisStore")}
            </h2>
          </div>

          <p className="text-sm text-black/45">{visibleListings.length} {t("storePage.shown")}</p>
        </section>

        {visibleListings.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">No visible listings</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleListings.map((item) => {
              const imageUrl = getListingImage(item);
              const expired = isExpired(item.active_until);
              const itemStatus = item.status || "active";

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[22px] border border-black/8 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <Link href={`/listing/${item.id}`}>
                    <div className="cursor-pointer">
                      <div className="mb-3 overflow-hidden rounded-2xl bg-neutral-100">
                        {imageUrl ? (
                          <img decoding="async"
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

                        {isOwner && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium capitalize ${
                              expired && itemStatus === "active"
                                ? "bg-yellow-100 text-yellow-800"
                                : itemStatus === "active"
                                ? "bg-green-100 text-green-700"
                                : itemStatus === "paused"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-neutral-200 text-neutral-700"
                            }`}
                          >
                            {expired && itemStatus === "active"
                              ? "expired"
                              : itemStatus}
                          </span>
                        )}
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