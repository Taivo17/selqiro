"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";

const ADMIN_EMAIL = "taiwo17@gmail.com";

type Correction = {
  id: number;
  ai_object?: string | null;
  ai_suggested_title?: string | null;

  ai_category?: string | null;
  ai_subcategory?: string | null;
  ai_detail_category?: string | null;

  final_category?: string | null;
  final_subcategory?: string | null;
  final_detail_category?: string | null;

  ai_confidence?: number | null;

  created_at?: string | null;
};

function buildAliasSuggestion(item: Correction) {
  const objectName =
    item.ai_object ||
    item.ai_suggested_title ||
    "";

  const detail =
    item.final_detail_category ||
    item.final_subcategory ||
    item.final_category ||
    "general";

  return `"${objectName.toLowerCase()}": "${detail}"`;
}

export default function AiCorrectionsPage() {
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (authLoading) return;

      if (user?.email !== ADMIN_EMAIL) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("ai_category_corrections")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error(error);
        setItems([]);
        setLoading(false);
        return;
      }

      setItems((data || []) as Correction[]);
      setLoading(false);
    };

    load();
  }, [user?.email, authLoading]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 rounded-[28px] bg-white p-6 shadow-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            Admin
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            AI category corrections
          </h1>

          <p className="mt-2 text-sm text-black/55">
            Review AI category mistakes and generate alias suggestions.
          </p>
        </header>

        {authLoading || loading ? (
          <div className="rounded-[28px] bg-white p-8 text-center shadow-sm">
            Loading corrections...
          </div>
        ) : user?.email !== ADMIN_EMAIL ? (
          <div className="rounded-[28px] bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-medium">Not authorized</p>
            <p className="mt-2 text-black/55">
              This admin page is not available for this account.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[28px] bg-white p-8 text-center shadow-sm">
            No AI corrections yet.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const aliasSuggestion = buildAliasSuggestion(item);

              return (
                <article
                  key={item.id}
                  className="rounded-[28px] bg-white p-5 shadow-sm"
                >
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-black/35">
                          AI object
                        </p>

                        <p className="mt-1 text-xl font-semibold">
                          {item.ai_object || "Unknown"}
                        </p>

                        {item.ai_suggested_title && (
                          <p className="mt-1 text-sm text-black/55">
                            {item.ai_suggested_title}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-red-700">
                            AI selected
                          </p>

                          <p className="mt-2 text-sm break-words">
                            {item.ai_category || "general"}
                            {item.ai_subcategory
                              ? ` → ${item.ai_subcategory}`
                              : ""}
                            {item.ai_detail_category
                              ? ` → ${item.ai_detail_category}`
                              : ""}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-green-700">
                            Final category
                          </p>

                          <p className="mt-2 text-sm break-words">
                            {item.final_category || "general"}
                            {item.final_subcategory
                              ? ` → ${item.final_subcategory}`
                              : ""}
                            {item.final_detail_category
                              ? ` → ${item.final_detail_category}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-black/55">
                        <span className="rounded-full border border-black/10 px-3 py-2">
                          Confidence:{" "}
                          {typeof item.ai_confidence === "number"
                            ? `${Math.round(item.ai_confidence * 100)}%`
                            : "unknown"}
                        </span>

                        <span className="rounded-full border border-black/10 px-3 py-2">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4">
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-black/35">
                          Alias suggestion
                        </p>

                        <code className="block break-all text-sm">
                          {aliasSuggestion}
                        </code>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyText(aliasSuggestion)}
                        className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white"
                      >
                        Copy alias
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
