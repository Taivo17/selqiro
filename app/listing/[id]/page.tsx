"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Listing = {
  id: number;
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

export default function ListingPage() {
  const params = useParams();
  const id = params?.id;

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(error);
        setListing(null);
        setLoading(false);
        return;
      }

      setListing(data as Listing);
      setLoading(false);
    };

    load();
  }, [id]);

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

  const hasAiInfo = Boolean(listing.ai_status) || Boolean(listing.ai_level);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f8f6] px-4 py-6 text-black sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl space-y-5 sm:space-y-6">
        <Link href="/" className="inline-flex text-sm font-medium text-black/55">
          ← Back to marketplace
        </Link>

        <div className="overflow-hidden rounded-[28px] bg-neutral-100 shadow-sm sm:rounded-[32px]">
          {listing.image ? (
            <img
              src={listing.image}
              alt={listing.title}
              className="h-[240px] w-full object-cover sm:h-[360px]"
            />
          ) : (
            <div className="h-[240px] w-full sm:h-[360px]" />
          )}
        </div>

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
        </section>

        <section className="overflow-hidden rounded-[28px] bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            Description
          </h2>

          <p className="max-w-full whitespace-pre-wrap break-words text-base leading-7 text-black/70">
            {listing.description}
          </p>
        </section>

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
    </main>
  );
}