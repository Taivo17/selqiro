"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

type ProfileRow = {
  store_slug?: string | null;
};

function navClass(active: boolean) {
  return active
    ? "rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white shadow-sm transition"
    : "rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black/70 transition hover:bg-black/[0.03]";
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [storeSlug, setStoreSlug] = useState("");
  const [loadingStoreSlug, setLoadingStoreSlug] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const userId = user?.id ?? null;
  const userEmail = user?.email ?? "";

  useEffect(() => {
    let mounted = true;

    const loadProfileSlug = async () => {
      if (!userId) {
        if (mounted) {
          setStoreSlug("");
          setLoadingStoreSlug(false);
        }
        return;
      }

      setLoadingStoreSlug(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("store_slug")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Error loading store slug:", error);
        setStoreSlug("");
        setLoadingStoreSlug(false);
        return;
      }

      const profile = data as ProfileRow | null;
      setStoreSlug(profile?.store_slug || "");
      setLoadingStoreSlug(false);
    };

    loadProfileSlug();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const handleLogout = async () => {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    setLoggingOut(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/auth");
  };

  const isMarketplace = pathname === "/";
  const isMyPage = pathname.startsWith("/my-page");
  const isSell = pathname.startsWith("/sell");
  const isProfile = pathname.startsWith("/profile");
  const isStore = pathname.startsWith("/store");

  const showStoreLink = !loadingStoreSlug && !!storeSlug;

  return (
    <header className="sticky top-0 z-30 border-b border-black/6 bg-[#f8f8f6]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="mr-2 text-2xl font-semibold tracking-tight text-black"
            >
              Selqiro
            </Link>

            <nav className="flex flex-wrap gap-2">
              <Link href="/" className={navClass(isMarketplace)}>
                Marketplace
              </Link>

              <Link href="/my-page" className={navClass(isMyPage)}>
                My page
              </Link>

              <Link href="/sell" className={navClass(isSell)}>
                Sell
              </Link>

              {showStoreLink ? (
                <Link href={`/store/${storeSlug}`} className={navClass(isStore)}>
                  Store
                </Link>
              ) : (
                <Link href="/profile" className={navClass(isProfile)}>
                  Store
                </Link>
              )}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showStoreLink && (
              <Link
                href={`/store/${storeSlug}`}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black/70 transition hover:bg-black/[0.03]"
              >
                View my store
              </Link>
            )}

            <Link
              href="/profile"
              className={
                pathname.startsWith("/profile")
                  ? "rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition"
                  : "rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black/70 transition hover:bg-black/[0.03]"
              }
            >
              Profile
            </Link>

            {loading ? (
              <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/45">
                Loading...
              </div>
            ) : userId ? (
              <>
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/55">
                  {userEmail || "Signed in"}
                </div>

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-2xl bg-green-500 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="rounded-2xl bg-green-500 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}