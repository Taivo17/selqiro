"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";

type Plan = "free" | "premium" | "business";

type IdentityDetail = {
  identity_id: string;
  display_name: string | null;
  slug: string | null;
  owner_email: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  created_at: string | null;
  listings_count: number;
  followers_count: number;
  reports_count: number;
  plan: Plan;
};

export default function AdminIdentityDetailPage() {
  const params = useParams<{ identityId: string }>();
  const identityId = params.identityId;

  const { user, loading: authLoading } = useAuth();

  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [identity, setIdentity] = useState<IdentityDetail | null>(null);

  const normalizePlan = (value: unknown): Plan => {
    return value === "premium" || value === "business" ? value : "free";
  };

  const loadIdentity = useCallback(async () => {
    if (authLoading) return;

    if (!user?.id || !identityId) {
      setAllowed(false);
      setIdentity(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: adminOk } = await supabase.rpc("is_admin");

    if (!adminOk) {
      setAllowed(false);
      setIdentity(null);
      setLoading(false);
      return;
    }

    setAllowed(true);

    const { data, error } = await supabase.rpc("admin_identity_detail", {
      p_identity_id: identityId,
    });

    if (error) {
      console.error("Admin identity detail error:", error);
      setIdentity(null);
      setLoading(false);
      return;
    }

    const detail = data as Partial<IdentityDetail> | null;

    if (!detail) {
      setIdentity(null);
      setLoading(false);
      return;
    }

    const { data: planData, error: planError } = await supabase.rpc(
      "admin_identity_plan",
      {
        p_identity_id: identityId,
      },
    );

    if (planError) {
      console.error("Admin identity plan error:", planError);
    }

    setIdentity({
      identity_id: detail.identity_id ?? identityId,
      display_name: detail.display_name ?? null,
      slug: detail.slug ?? null,
      owner_email: detail.owner_email ?? null,
      bio: detail.bio ?? null,
      city: detail.city ?? null,
      country: detail.country ?? null,
      created_at: detail.created_at ?? null,
      listings_count: Number(detail.listings_count ?? 0),
      followers_count: Number(detail.followers_count ?? 0),
      reports_count: Number(detail.reports_count ?? 0),
      plan: normalizePlan(planData),
    });

    setLoading(false);
  }, [authLoading, identityId, user?.id]);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  const setPlan = async (plan: Plan) => {
    if (!identity) return;

    setSavingPlan(true);

    const { error } = await supabase.rpc("admin_set_identity_plan", {
      p_identity_id: identity.identity_id,
      p_plan: plan,
    });

    if (error) {
      console.error("Set identity plan error:", error);
      alert(`Could not update plan: ${error.message || "Unknown error"}`);
      setSavingPlan(false);
      return;
    }

    await loadIdentity();
    setSavingPlan(false);
  };

  if (authLoading || loading) {
    return <main className="mx-auto max-w-6xl p-6">Loading...</main>;
  }

  if (!allowed) {
    return <main className="mx-auto max-w-6xl p-6">Not allowed.</main>;
  }

  if (!identity) {
    return <main className="mx-auto max-w-6xl p-6">Identity not found.</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
        <Link href="/admin/identities" className="text-sm text-black/50">
          ← Back to identities
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.32em] text-black/40">
          Identity
        </p>

        <h1 className="mt-2 text-5xl font-semibold tracking-tight">
          {identity.display_name || "Unknown"}
        </h1>

        <p className="mt-3 text-black/55">{identity.owner_email || "—"}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          {identity.slug ? (
            <Link
              href={`/store/${identity.slug}`}
              className="rounded-full bg-black px-6 py-3 text-sm text-white"
            >
              View public store
            </Link>
          ) : null}

          <Link
            href="/admin/reports"
            className="rounded-full border border-black/10 px-6 py-3 text-sm"
          >
            View reports
          </Link>

          <Link
            href="/admin/identities"
            className="rounded-full border border-black/10 px-6 py-3 text-sm"
          >
            Back to identities
          </Link>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight">Admin actions</h2>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-black/40">Plan</p>
            <p className="mt-2 text-sm text-black/60">
              Current: {identity.plan || "free"}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPlan("premium")}
                disabled={savingPlan}
                className="rounded-full bg-black px-6 py-3 text-sm text-white disabled:opacity-50"
              >
                Set Premium
              </button>

              <button
                type="button"
                onClick={() => setPlan("free")}
                disabled={savingPlan}
                className="rounded-full border border-black/10 px-6 py-3 text-sm disabled:opacity-50"
              >
                Set Free
              </button>

              <button
                type="button"
                onClick={() => setPlan("business")}
                disabled={savingPlan}
                className="rounded-full border border-black/10 px-6 py-3 text-sm disabled:opacity-50"
              >
                Set Business
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-black/40">
              Visibility
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-black px-6 py-3 text-sm text-white"
              >
                Hide Identity
              </button>

              <button
                type="button"
                className="rounded-full border border-black/10 px-6 py-3 text-sm"
              >
                Restore Identity
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-sm uppercase text-black/40">Listings</p>
          <p className="mt-2 text-4xl font-semibold">
            {identity.listings_count}
          </p>
        </div>

        <div className="rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-sm uppercase text-black/40">Followers</p>
          <p className="mt-2 text-4xl font-semibold">
            {identity.followers_count}
          </p>
        </div>

        <div className="rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-sm uppercase text-black/40">Reports</p>
          <p className="mt-2 text-4xl font-semibold">
            {identity.reports_count}
          </p>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight">Details</h2>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-black/40">Slug</p>
            <p className="mt-1">{identity.slug || "—"}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-black/40">Created</p>
            <p className="mt-1">
              {identity.created_at
                ? new Date(identity.created_at).toLocaleString()
                : "—"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-black/40">City</p>
            <p className="mt-1">{identity.city || "—"}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-black/40">Country</p>
            <p className="mt-1">{identity.country || "—"}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs uppercase text-black/40">Bio</p>
            <p className="mt-1">{identity.bio || "—"}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
