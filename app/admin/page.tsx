"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

type Stats = {
  users: number;
  identities: number;
  listings: number;
  openReports: number;
  blocks: number;
  follows: number;
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    users: 0,
    identities: 0,
    listings: 0,
    openReports: 0,
    blocks: 0,
    follows: 0,
  });

  useEffect(() => {
    const loadAdmin = async () => {
      if (authLoading) return;

      if (!user?.id) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data: adminOk } = await supabase.rpc("is_admin");
      const { data: adminRole } = await supabase.rpc("get_my_admin_role");

      if (!adminOk) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      setRole(adminRole || null);

      const { data: dashboardStats, error: statsError } = await supabase.rpc(
        "admin_dashboard_stats"
      );

      if (statsError) {
        console.error("Admin dashboard stats error:", statsError);
      } else if (dashboardStats) {
        setStats({
          users: Number(dashboardStats.users || 0),
          identities: Number(dashboardStats.identities || 0),
          listings: Number(dashboardStats.listings || 0),
          openReports: Number(dashboardStats.openReports || 0),
          blocks: Number(dashboardStats.blocks || 0),
          follows: Number(dashboardStats.follows || 0),
        });
      }

      setLoading(false);
    };

    loadAdmin();
  }, [user?.id, authLoading]);

  if (authLoading || loading) {
    return <main className="p-6">Loading admin...</main>;
  }

  if (!user?.id) {
    return (
      <main className="p-6">
        <p>Please sign in.</p>
        <Link href="/auth" className="mt-4 inline-flex rounded-xl bg-black px-4 py-2 text-white">
          Sign in
        </Link>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-black/60">You do not have admin access.</p>
      </main>
    );
  }

  const cards = [
    ["Users", stats.users],
    ["Identities", stats.identities],
    ["Listings", stats.listings],
    ["Open reports", stats.openReports],
    ["Blocks", stats.blocks],
    ["Follows", stats.follows],
  ];

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-[28px] bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            Admin panel
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            Selqiro Admin
          </h1>
          <p className="mt-2 text-sm text-black/55">
            Role: {role || "admin"}
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([label, value]) => (
            <div key={label} className="rounded-[24px] bg-white p-5 shadow-sm">
              <p className="text-sm text-black/45">{label}</p>
              <p className="mt-2 text-4xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-[28px] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Next admin sections</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-black/10 p-4 text-sm">Reports</div>
            <div className="rounded-2xl border border-black/10 p-4 text-sm">Identities</div>
            <div className="rounded-2xl border border-black/10 p-4 text-sm">Listings</div>
            <div className="rounded-2xl border border-black/10 p-4 text-sm">Audit log</div>
          </div>
        </section>
      </div>
    </main>
  );
}
