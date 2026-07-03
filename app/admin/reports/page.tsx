"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";

type AdminReport = {
  id: number;
  reporter_email: string | null;
  reporter_name: string | null;
  reported_email: string | null;
  reported_name: string | null;
  report_type: string | null;
  reason: string | null;
  details: string | null;
  status: string | null;
  created_at: string | null;
};

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportStats, setReportStats] = useState({
    open: 0,
    reviewing: 0,
    actioned: 0,
    dismissed: 0,
    total: 0,
  });

  const updateReportStatus = async (reportId: number, status: string) => {
    const { error } = await supabase.rpc("admin_update_report_status", {
      p_report_id: reportId,
      p_status: status,
    });

    if (error) {
      console.error("Update report status error:", error);
      alert("Could not update report status.");
      return;
    }

    setReports((current) =>
      current.map((report) =>
        report.id === reportId ? { ...report, status } : report
      )
    );
  };

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

      const [{ data, error }, { data: statsData, error: statsError }] =
        await Promise.all([
          supabase.rpc("admin_reports_list"),
          supabase.rpc("admin_report_stats"),
        ]);

      if (error) {
        console.error("Admin reports error:", error);
      } else {
        setReports((data || []) as AdminReport[]);
      }

      if (statsError) {
        console.error("Admin report stats error:", statsError);
      } else if (statsData) {
        setReportStats({
          open: Number(statsData.open || 0),
          reviewing: Number(statsData.reviewing || 0),
          actioned: Number(statsData.actioned || 0),
          dismissed: Number(statsData.dismissed || 0),
          total: Number(statsData.total || 0),
        });
      }

      setLoading(false);
    };

    load();
  }, [user?.id, authLoading]);

  if (authLoading || loading) {
    return <main className="p-6">Loading reports...</main>;
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
            Moderation
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            Reports
          </h1>
          <p className="mt-2 text-sm text-black/55">
            Latest {reports.length} reports
          </p>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Open", reportStats.open],
            ["Reviewing", reportStats.reviewing],
            ["Actioned", reportStats.actioned],
            ["Dismissed", reportStats.dismissed],
            ["Total", reportStats.total],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[22px] bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-black/40">{label}</p>
              <p className="mt-1 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-[28px] bg-white shadow-sm">
          <div className="grid grid-cols-6 gap-3 border-b border-black/10 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-black/40">
            <div>Reporter</div>
            <div>Reported</div>
            <div>Reason</div>
            <div>Status</div>
            <div>Date</div>
            <div>Details</div>
          </div>

          {reports.length === 0 ? (
            <div className="p-6 text-black/55">No reports found.</div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="grid grid-cols-6 gap-3 border-b border-black/5 px-5 py-4 text-sm last:border-b-0"
              >
                <div>
                  <div className="font-medium">{report.reporter_name || "Unknown"}</div>
                  <div className="text-xs text-black/45">{report.reporter_email}</div>
                </div>

                <div>
                  <div className="font-medium">{report.reported_name || "Unknown"}</div>
                  <div className="text-xs text-black/45">{report.reported_email}</div>
                </div>

                <div>{report.reason || report.report_type || "-"}</div>

                <div>
                  <span className="rounded-full bg-black px-3 py-1 text-xs text-white">
                    {report.status || "open"}
                  </span>
                </div>

                <div className="text-black/55">
                  {report.created_at
                    ? new Date(report.created_at).toLocaleString()
                    : "-"}
                </div>

                <div className="break-words text-black/60">
                  <div>{report.details || "-"}</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateReportStatus(report.id, "reviewing")}
                      className="rounded-full border border-black/10 px-3 py-1 text-xs hover:bg-black/5"
                    >
                      Reviewing
                    </button>

                    <button
                      type="button"
                      onClick={() => updateReportStatus(report.id, "actioned")}
                      className="rounded-full bg-black px-3 py-1 text-xs text-white"
                    >
                      Mark reviewed
                    </button>

                    <button
                      type="button"
                      onClick={() => updateReportStatus(report.id, "dismissed")}
                      className="rounded-full border border-black/10 px-3 py-1 text-xs hover:bg-black/5"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
