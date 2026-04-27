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
  title: string;
  description: string;
  price: string;
  status?: string;
  category?: string | null;
  condition?: string | null;
  country?: string | null;
  city?: string | null;
  listing_images?: ListingImage[];
};

export default function StorePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("store_slug", slug)
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: listingsData } = await supabase
        .from("listings")
        .select(
          "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)"
        )
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false });

      setListings((listingsData || []) as Listing[]);
      setLoading(false);
    };

    load();
  }, [slug]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!profile) return <div className="p-6">Store not found</div>;

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-6 rounded-[28px] bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            {profile.store_name}
          </h1>

          {profile.bio && (
            <p className="mt-2 text-black/60">{profile.bio}</p>
          )}
        </div>

        {/* LISTINGS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {listings.map((item) => {
            const sortedImages = [...(item.listing_images || [])].sort(
              (a, b) => {
                if (a.is_primary) return -1;
                if (b.is_primary) return 1;
                return (a.sort_order || 0) - (b.sort_order || 0);
              }
            );

            const img = sortedImages[0];

            const imageUrl =
              img?.thumb_url ||
              img?.medium_url ||
              img?.original_url ||
              "";

            return (
              <Link key={item.id} href={`/listing/${item.id}`}>
                <div className="cursor-pointer rounded-[24px] border border-black/8 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md">

                  {/* IMAGE */}
                  <div className="mb-3 overflow-hidden rounded-xl bg-neutral-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        className="h-36 w-full object-cover sm:h-40"
                      />
                    ) : (
                      <div className="h-36 w-full bg-neutral-100" />
                    )}
                  </div>

                  {/* TITLE */}
                  <h3 className="line-clamp-1 text-lg font-semibold">
                    {item.title}
                  </h3>

                  {/* PRICE */}
                  <p className="mt-2 text-2xl font-semibold">
                    {item.price}
                  </p>

                  {/* META */}
                  <p className="mt-1 text-xs text-black/50">
                    {item.category} • {item.condition} • {item.city}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}