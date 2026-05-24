"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

type ListingImage = {
  thumb_url?: string | null;
  medium_url?: string | null;
  original_url?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
};

type FeedListing = {
  id: number;
  user_id: string;
  created_at?: string | null;
  title: string;
  description: string;
  price: string;
  category?: string | null;
  condition?: string | null;
  country?: string | null;
  city?: string | null;
  image?: string | null;
  listing_images?: ListingImage[];
  profiles?: {
    store_name?: string | null;
    store_slug?: string | null;
    avatar_url?: string | null;
  } | null;
};

function getListingImage(item: FeedListing) {
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

function timeAgo(value?: string | null) {
  if (!value) return "";

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(value).toLocaleDateString();
}

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<FeedListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeed = async () => {
      if (authLoading) return;

      if (!user?.id) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: follows, error: followsError } = await supabase
        .from("store_follows")
        .select("store_owner_id")
        .eq("follower_id", user.id);

      if (followsError) {
        console.error("Error loading follows:", followsError);
        setItems([]);
        setLoading(false);
        return;
      }

      const followedIds = (follows || [])
        .map((row) => row.store_owner_id)
        .filter(Boolean);

      if (followedIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, user_id, created_at, title, description, price, category, condition, country, city, image, listing_images(thumb_url, medium_url, original_url, is_primary, sort_order), profiles(store_name, store_slug, avatar_url)"
        )
        .in("user_id", followedIds)
        .eq("status", "active")
        .gt("active_until", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(80);

      if (error) {
        console.error("Error loading feed:", error);
        setItems([]);
        setLoading(false);
        return;
      }

      setItems((data || []) as FeedListing[]);
      setLoading(false);
    };

    loadFeed();
  }, [user?.id, authLoading]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-8">
        <div className="mx-auto max-w-5xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          Loading feed...
        </div>
      </main>
    );
  }

  if (!user?.id) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-8">
        <div className="mx-auto max-w-5xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-medium">Sign in to view your feed</p>
          <Link
            href="/auth"
            className="mt-5 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
          >
            Go to auth
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            Feed
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                New from stores you follow
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
                Latest listings from stores you follow.
              </p>
            </div>

            <Link
              href="/"
              className="w-fit rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium"
            >
              Marketplace
            </Link>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-black/10 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-medium">Your feed is empty</p>
            <p className="mt-2 text-black/55">
              Follow stores to see their newest listings here.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Browse marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const imageUrl = getListingImage(item);
              const storeName = item.profiles?.store_name || "Store";
              const storeSlug = item.profiles?.store_slug || "";

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[28px] border border-black/8 bg-white p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-black text-white">
                        {item.profiles?.avatar_url ? (
                          <img
                            src={item.profiles.avatar_url}
                            alt={storeName}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                            {storeName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {storeName}
                        </p>
                        <p className="text-xs text-black/45">
                          added a listing • {timeAgo(item.created_at)}
                        </p>
                      </div>
                    </div>

                    {storeSlug && (
                      <Link
                        href={`/store/${storeSlug}`}
                        className="shrink-0 rounded-xl border border-black/10 px-3 py-2 text-xs font-medium"
                      >
                        Store
                      </Link>
                    )}
                  </div>

                  <Link href={`/listing/${item.id}`}>
                    <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                      <div className="overflow-hidden rounded-2xl bg-neutral-100">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
                            className="aspect-[4/3] w-full object-cover"
                          />
                        ) : (
                          <div className="aspect-[4/3] bg-neutral-100" />
                        )}
                      </div>

                      <div>
                        <h2 className="line-clamp-2 break-words text-2xl font-semibold tracking-tight">
                          {item.title}
                        </h2>

                        <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-black/60">
                          {item.description}
                        </p>

                        <p className="mt-4 break-words text-3xl font-semibold">
                          {item.price}
                        </p>

                        <p className="mt-3 text-sm text-black/45">
                          {item.category || "general"} •{" "}
                          {item.condition || "used"} •{" "}
                          {item.country || "No country"}
                          {item.city ? ` • ${item.city}` : ""}
                        </p>
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
