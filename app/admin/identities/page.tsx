"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";

type AdminIdentity = {
  identity_id: string;
  display_name: string | null;
  slug: string | null;
  owner_email: string | null;
  listings_count: number;
  followers_count: number;
  reports_count: number;
  created_at: string | null;
};

export default function AdminIdentitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [identities, setIdentities] = useState<AdminIdentity[]>([]);

  useEffect(() => {
    const load = async () => {
      if (authLoading) return;

      if (!user?.id) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const { data: adminOk } = await supabase.rpc("is_admin");

      if (!adminOk) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      setAllowed(true);

      const { data, error } = await supabase.rpc("admin_identities_list");

      if (error) {
        console.error("Admin identities error:", error);
      } else {
        setIdentities((data || []) as AdminIdentity[]);
      }

      setLoading(false);
    };

    load();
  }, [user?.id, authLoading]);

  if (authLoading || loading) {
    return <main className="p-6">Loading identities...</main>;
  }

  if (!allowed) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-[28px] bg-white p-6 shadow-sm">
          <Link href="/admin" className="text-sm text-black/50">
            ← Back to admin
          </Link>

          <p className="mt-4 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            Management
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            Identities
          </h1>

          <p className="mt-2 text-sm text-black/55">
            Latest {identities.length} identities
          </p>
        </header>

        <section className="overflow-hidden rounded-[28px] bg-white shadow-sm">
          <div className="grid grid-cols-7 gap-3 border-b border-black/10 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-black/40">
            <div>Identity</div>
            <div>Owner</div>
            <div>Slug</div>
            <div>Listings</div>
            <div>Followers</div>
            <div>Reports</div>
            <div>Created</div>
          </div>

          {identities.length === 0 ? (
            <div className="p-6 text-black/55">No identities found.</div>
          ) : (
            identities.map((identity) => (
              <div
                key={identity.identity_id}
                className="grid grid-cols-7 gap-3 border-b border-black/5 px-5 py-4 text-sm last:border-b-0"
              >
                <div className="font-medium">
                  <Link
                    href={`/admin/identities/${identity.identity_id}`}
                    className="hover:underline"
                  >
                    {identity.display_name || "Unknown"}
                  </Link>
                </div>

                <div className="break-words text-black/55">
                  {identity.owner_email || "-"}
                </div>

                <div className="break-words text-black/55">
                  {identity.slug || "-"}
                </div>

                <div>{identity.listings_count || 0}</div>
                <div>{identity.followers_count || 0}</div>
                <div>{identity.reports_count || 0}</div>

                <div className="text-black/55">
                  {identity.created_at
                    ? new Date(identity.created_at).toLocaleDateString()
                    : "-"}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
