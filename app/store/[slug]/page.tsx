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
  listing_images?: ListingImage[];
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused" | "sold"
  >("all");

  useEffect(() => {
    let cancelled = false;

    const loadStore = async () => {
      setPageLoading(true);
      setNotFound(false);

      const slug = decodeURIComponent((slugParam || "").trim());

      if (!slug) {
        setNotFound(true);
        setPageLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("store_slug", slug)
        .maybeSingle();

      if (!profileData) {
        setNotFound(true);
        setPageLoading(false);
        return;
      }

      setProfile(profileData as ProfileRow);

      const { data: listingData } = await supabase
        .from("listings")
        .select(
          "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)"
        )
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false });

      setListings((listingData || []) as Listing[]);
      setPageLoading(false);
    };

    loadStore();
    return () => {
      cancelled = true;
    };
  }, [slugParam]);

  const isOwner =
    !!currentUserId && !!profile?.id && currentUserId === profile.id;

  const visibleListings = useMemo(() => {
    return listings.filter((item) => {
      const status = item.status || "active";

      if (!isOwner && status !== "active") return false;

      const query = search.toLowerCase();

      return (
        (!query ||
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)) &&
        (statusFilter === "all" || status === statusFilter)
      );
    });
  }, [listings, search, statusFilter, isOwner]);

  if (pageLoading || authLoading) {
    return <div className="p-6">Loading store...</div>;
  }

  if (notFound || !profile) {
    return <div className="p-6">Store not found</div>;
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">
        {profile.store_name}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleListings.map((item) => {
          const sortedImages = [...(item.listing_images || [])].sort(
            (a, b) => {
              if (a.is_primary) return -1;
              if (b.is_primary) return 1;
              return (a.sort_order || 0) - (b.sort_order || 0);
            }
          );

          const primaryImage = sortedImages[0];

          const imageUrl =
            primaryImage?.thumb_url ||
            primaryImage?.medium_url ||
            primaryImage?.original_url ||
            item.image ||
            "";

          return (
            <article key={item.id} className="border rounded-xl p-3">
              <Link href={`/listing/${item.id}`}>
                <div>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      className="h-40 w-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="h-40 bg-gray-100" />
                  )}

                  <h3 className="mt-2 font-semibold">{item.title}</h3>
                  <p className="text-sm">{item.price}</p>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </main>
  );
}