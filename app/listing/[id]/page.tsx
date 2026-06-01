"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

type SellerProfile = {
  id: string;
  store_name?: string | null;
  store_slug?: string | null;
};

type Listing = {
  id: number;
  user_id?: string | null;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  category?: string;
  subcategory?: string;
  condition?: string;
  country?: string;
  city?: string;
  location?: string;
  manufacturer?: string;
  part_number?: string;
  oem_number?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  engine?: string;
  details?: Record<string, unknown> | null;
  ai_status?: string;
  ai_level?: string;
  listing_images?: ListingImage[];
};

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 text-sm sm:grid-cols-[160px_1fr]">
      <span className="text-black/45">{label}</span>
      <span className="min-w-0 break-words font-medium text-black/75">
        {value}
      </span>
    </div>
  );
}

function formatDetailLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getVisibleDetails(details?: Record<string, unknown> | null) {
  if (!details) return [];

  const hiddenKeys = new Set([
    "detailCategory",
    "manufacturer",
    "partNumber",
    "oemNumber",
    "vehicleBrand",
    "vehicleModel",
    "vehicleYear",
    "engine",
  ]);

  return Object.entries(details)
    .filter(([key, value]) => {
      if (hiddenKeys.has(key)) return false;
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && !value.trim()) return false;
      return true;
    })
    .map(([key, value]) => ({
      key,
      label: formatDetailLabel(key),
      value: String(value),
    }));
}

function sortImages(images: ListingImage[]) {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

export default function ListingPage() {
  const params = useParams();
  const id = params?.id;

  const router = useRouter();
  const { user } = useAuth();

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [listing, setListing] = useState<Listing | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [fullImageOpen, setFullImageOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const showControlsTemporarily = () => {
    setControlsVisible(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("listings")
        .select(
          "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)"
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error(error);
        setListing(null);
        setSellerProfile(null);
        setLoading(false);
        return;
      }

      const loadedListing = data as Listing;

      setListing(loadedListing);
      setSelectedImageIndex(0);

      if (loadedListing.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, store_name, store_slug")
          .eq("id", loadedListing.user_id)
          .maybeSingle();

        if (profileError) {
          console.error("Error loading seller profile:", profileError);
          setSellerProfile(null);
        } else {
          setSellerProfile((profileData || null) as SellerProfile | null);
        }
      } else {
        setSellerProfile(null);
      }

      setLoading(false);
    };

    load();
  }, [id]);

  const sortedImages = useMemo(() => {
    return sortImages(listing?.listing_images || []);
  }, [listing]);

  const galleryImages = useMemo(() => {
    if (sortedImages.length > 0) return sortedImages;

    if (listing?.image) {
      return [
        {
          id: "legacy-image",
          thumb_url: listing.image,
          medium_url: listing.image,
          original_url: listing.image,
          is_primary: true,
          sort_order: 0,
        },
      ];
    }

    return [];
  }, [sortedImages, listing]);

  const selectedImage = galleryImages[selectedImageIndex] || galleryImages[0];

  const mediumImageUrl =
    selectedImage?.medium_url ||
    selectedImage?.original_url ||
    selectedImage?.thumb_url ||
    "";

  const originalImageUrl =
    selectedImage?.original_url ||
    selectedImage?.medium_url ||
    selectedImage?.thumb_url ||
    "";

  const sellerStoreUrl = sellerProfile?.store_slug
    ? `/store/${sellerProfile.store_slug}`
    : "";

  const nextImage = () => {
    if (galleryImages.length <= 1) return;

    setSelectedImageIndex((prev) =>
      prev + 1 >= galleryImages.length ? 0 : prev + 1
    );

    showControlsTemporarily();
  };

  const previousImage = () => {
    if (galleryImages.length <= 1) return;

    setSelectedImageIndex((prev) =>
      prev - 1 < 0 ? galleryImages.length - 1 : prev - 1
    );

    showControlsTemporarily();
  };

  const shareListing = async () => {
    if (!listing || typeof window === "undefined") return;

    const shareUrl = window.location.href;
    const shareTitle = listing.title || "Selqiro listing";
    const shareText = `${listing.title} - ${listing.price}`;

    setShareCopied(false);

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);

      setTimeout(() => {
        setShareCopied(false);
      }, 2500);
    } catch (error) {
      console.error("Share failed:", error);

      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);

        setTimeout(() => {
          setShareCopied(false);
        }, 2500);
      } catch (clipboardError) {
        console.error("Clipboard failed:", clipboardError);
        alert("Could not share this listing.");
      }
    }
  };


  const contactSeller = async () => {
    if (!user?.id || !listing?.user_id) {
      router.push("/auth");
      return;
    }

    if (user.id === listing.user_id) {
      return;
    }

    // reuse existing buyer/seller conversation
    const { data: existingConversations } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id")
      .or(
        `and(buyer_id.eq.${user.id},seller_id.eq.${listing.user_id}),and(buyer_id.eq.${listing.user_id},seller_id.eq.${user.id})`
      )
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1);

    const existingConversation = existingConversations?.[0];

    if (existingConversation?.id) {

      await supabase
        .from("conversation_participants")
        .update({ deleted_at: null })
        .eq("conversation_id", existingConversation.id);

      await supabase
        .from("conversations")
        .update({
          updated_at: new Date().toISOString(),
          listing_id: listing.id,
          listing_title_snapshot: listing.title,
          listing_image_snapshot:
            listing.image || selectedImage?.thumb_url || "",
          listing_price_snapshot: listing.price,
        })
        .eq("id", existingConversation.id);

      router.push(`/messages/${existingConversation.id}?listing=${listing.id}`);
      return;
    }

    // create new conversation
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        listing_id: listing.id,

        listing_title_snapshot: listing.title,
        listing_image_snapshot:
          listing.image || selectedImage?.thumb_url || "",
        listing_price_snapshot: listing.price,

        created_by: user.id,
        buyer_id: user.id,
        seller_id: listing.user_id,
      })
      .select("id")
      .single();

    if (conversationError || !conversation) {
      console.error(conversationError);
      alert("Could not start conversation.");
      return;
    }

    await supabase
      .from("conversation_participants")
      .insert([
        {
          conversation_id: conversation.id,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        },
        {
          conversation_id: conversation.id,
          user_id: listing.user_id,
        },
      ]);

    router.push(`/messages/${conversation.id}?listing=${listing.id}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-4 py-8 text-black sm:px-6">
        <div className="mx-auto max-w-5xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          Loading listing...
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-4 py-8 text-black sm:px-6">
        <div className="mx-auto max-w-5xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          Listing not found
        </div>
      </main>
    );
  }

  const hasTechnicalInfo =
    Boolean(listing.manufacturer) ||
    Boolean(listing.part_number) ||
    Boolean(listing.oem_number);

  const hasVehicleInfo =
    Boolean(listing.vehicle_brand) ||
    Boolean(listing.vehicle_model) ||
    Boolean(listing.vehicle_year) ||
    Boolean(listing.engine);

  const handleGalleryTouchStart = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    showControlsTemporarily();
    setTouchStartX(event.touches[0].clientX);
  };

  const handleGalleryTouchEnd = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    showControlsTemporarily();

    if (touchStartX === null || galleryImages.length <= 1) return;

    const touchEndX = event.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    const threshold = 45;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        setSelectedImageIndex((prev) =>
          prev + 1 >= galleryImages.length ? 0 : prev + 1
        );
      } else {
        setSelectedImageIndex((prev) =>
          prev - 1 < 0 ? galleryImages.length - 1 : prev - 1
        );
      }
    }

    setTouchStartX(null);
  };

  const visibleDetails = getVisibleDetails(listing.details);
  const hasDetailsInfo = visibleDetails.length > 0;

  const hasAiInfo = Boolean(listing.ai_status) || Boolean(listing.ai_level);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f8f6] px-4 py-6 text-black sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl space-y-5 sm:space-y-6">
        <Link href="/" className="inline-flex text-sm font-medium text-black/55">
          ← Back to marketplace
        </Link>

        <section className="overflow-hidden rounded-[28px] bg-white p-3 shadow-sm sm:rounded-[32px] sm:p-4">
          <div
            className="relative overflow-hidden rounded-[22px] bg-neutral-100"
            onMouseMove={showControlsTemporarily}
            onTouchStart={handleGalleryTouchStart}
            onTouchEnd={handleGalleryTouchEnd}
          >
            <button
              type="button"
              onClick={() => {
                showControlsTemporarily();
                if (originalImageUrl) setFullImageOpen(true);
              }}
              className="block w-full"
            >
              {mediumImageUrl ? (
                <img decoding="async"
                  src={mediumImageUrl}
                  alt={listing.title}
                  className="h-[260px] w-full object-contain sm:h-[460px]"
                />
              ) : (
                <div className="h-[260px] w-full sm:h-[460px]" />
              )}
            </button>

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={previousImage}
                  className={`absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm transition-opacity duration-300 ${
                    controlsVisible
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={nextImage}
                  className={`absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm transition-opacity duration-300 ${
                    controlsVisible
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                >
                  ›
                </button>

                <div
                  className={`absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white transition-opacity duration-300 ${
                    controlsVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {selectedImageIndex + 1} / {galleryImages.length}
                </div>
              </>
            )}
          </div>

          {galleryImages.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {galleryImages.map((image, index) => {
                const thumbUrl =
                  image.thumb_url || image.medium_url || image.original_url || "";

                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => {
                      setSelectedImageIndex(index);
                      showControlsTemporarily();
                    }}
                    className={`h-20 w-24 shrink-0 overflow-hidden rounded-2xl border bg-neutral-100 ${
                      selectedImageIndex === index
                        ? "border-black"
                        : "border-black/10"
                    }`}
                  >
                    {thumbUrl ? (
                      <img decoding="async"
                        src={thumbUrl}
                        alt={`${listing.title} ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[28px] bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            Listing details
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
                {listing.title}
              </h1>

              <p className="mt-3 break-words text-3xl font-bold">
                {listing.price}
              </p>
            </div>

            <span className="w-fit rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
              Active
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-sm text-black/55">
            {listing.category && (
              <span className="max-w-full break-words rounded-full border border-black/10 bg-black/[0.02] px-4 py-2">
                {listing.category}
              </span>
            )}

            {listing.condition && (
              <span className="max-w-full break-words rounded-full border border-black/10 bg-black/[0.02] px-4 py-2">
                {listing.condition}
              </span>
            )}

            {listing.location && (
              <span className="max-w-full break-words rounded-full border border-black/10 bg-black/[0.02] px-4 py-2">
                {listing.location}
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {sellerStoreUrl ? (
              <Link
                href={sellerStoreUrl}
                className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
              >
                View seller store
              </Link>
            ) : (
              <span className="rounded-2xl border border-black/10 bg-black/[0.02] px-5 py-3 text-sm text-black/45">
                Seller store unavailable
              </span>
            )}

            <button
              type="button"
              onClick={contactSeller}
              className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Contact seller
            </button>

            <button
              type="button"
              onClick={shareListing}
              className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
            >
              {shareCopied ? "Link copied" : "Share listing"}
            </button>

            {sellerProfile?.store_name && (
              <span className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm text-black/55">
                Seller: {sellerProfile.store_name}
              </span>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            Description
          </h2>

          <p className="max-w-full whitespace-pre-wrap break-words text-base leading-7 text-black/70">
            {listing.description}
          </p>
        </section>

        {hasDetailsInfo && (
          <section className="overflow-hidden rounded-[28px] bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">Details</h2>

            <div className="space-y-3">
              {visibleDetails.map((item) => (
                <FieldRow
                  key={item.key}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </div>
          </section>
        )}

        {hasTechnicalInfo && (
          <section className="overflow-hidden rounded-[28px] bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">Technical information</h2>

            <div className="space-y-3">
              <FieldRow label="Manufacturer" value={listing.manufacturer} />
              <FieldRow label="Part number" value={listing.part_number} />
              <FieldRow label="OEM" value={listing.oem_number} />
            </div>
          </section>
        )}

        {hasVehicleInfo && (
          <section className="overflow-hidden rounded-[28px] bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">Vehicle compatibility</h2>

            <div className="space-y-3">
              <FieldRow label="Brand" value={listing.vehicle_brand} />
              <FieldRow label="Model" value={listing.vehicle_model} />
              <FieldRow label="Year" value={listing.vehicle_year} />
              <FieldRow label="Engine" value={listing.engine} />
            </div>
          </section>
        )}

        {hasAiInfo && (
          <section className="overflow-hidden rounded-[28px] bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">AI information</h2>

            <div className="space-y-3">
              <FieldRow label="Status" value={listing.ai_status} />
              <FieldRow label="Level" value={listing.ai_level} />
            </div>
          </section>
        )}
      </div>

      {fullImageOpen && originalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setFullImageOpen(false)}
          onMouseMove={showControlsTemporarily}
          onTouchStart={handleGalleryTouchStart}
          onTouchEnd={handleGalleryTouchEnd}
        >
          <button
            type="button"
            className={`absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity duration-300 ${
              controlsVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              setFullImageOpen(false);
            }}
          >
            Close
          </button>

          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                className={`absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl text-black transition-opacity duration-300 ${
                  controlsVisible
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  previousImage();
                }}
              >
                ‹
              </button>

              <button
                type="button"
                className={`absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl text-black transition-opacity duration-300 ${
                  controlsVisible
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  nextImage();
                }}
              >
                ›
              </button>
            </>
          )}

          <img decoding="async"
            src={originalImageUrl}
            alt={listing.title}
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}