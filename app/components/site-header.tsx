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
    ? "rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm transition"
    : "rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black/70 transition hover:bg-black/[0.03]";
}

function mobileNavClass(active: boolean) {
  return active
    ? "rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm transition text-center"
    : "rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black/70 transition hover:bg-black/[0.03] text-center";
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [storeSlug, setStoreSlug] = useState("");
  const [loadingStoreSlug, setLoadingStoreSlug] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
    <header className="sticky top-0 z-30 border-b border-black/6 bg-[#f8f8f6]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="shrink-0 text-2xl font-semibold tracking-tight text-black"
            >
              Selqiro
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-xl text-black/70 transition hover:bg-black/[0.03] sm:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? "×" : "☰"}
            </button>

            {!loading && userId ? (
              <div className="hidden sm:flex items-center gap-2">
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
                    isProfile
                      ? "rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition"
                      : "rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black/70 transition hover:bg-black/[0.03]"
                  }
                >
                  Profile
                </Link>

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
              </div>
            ) : !loading ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/auth"
                  className="rounded-2xl bg-green-500 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/45">
                  Loading...
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="sm:hidden">
              <div className="rounded-[28px] border border-black/8 bg-white p-3 shadow-sm">
                <nav className="grid grid-cols-2 gap-2">
                  <Link href="/" className={mobileNavClass(isMarketplace)}>
                    Marketplace
                  </Link>

                  <Link href="/my-page" className={mobileNavClass(isMyPage)}>
                    My page
                  </Link>

                  <Link href="/sell" className={mobileNavClass(isSell)}>
                    Sell
                  </Link>

                  {showStoreLink ? (
                    <Link
                      href={`/store/${storeSlug}`}
                      className={mobileNavClass(isStore)}
                    >
                      Store
                    </Link>
                  ) : (
                    <Link href="/profile" className={mobileNavClass(isProfile)}>
                      Store
                    </Link>
                  )}

                  <Link
                    href="/profile"
                    className={
                      isProfile
                        ? "rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm transition text-center"
                        : "rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black/70 transition hover:bg-black/[0.03] text-center"
                    }
                  >
                    Profile
                  </Link>

                  {showStoreLink && (
                    <Link
                      href={`/store/${storeSlug}`}
                      className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black/70 transition hover:bg-black/[0.03] text-center"
                    >
                      My store
                    </Link>
                  )}
                </nav>

                <div className="mt-3 border-t border-black/6 pt-3">
                  {loading ? (
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/45">
                      Loading...
                    </div>
                  ) : userId ? (
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-black/10 bg-[#f8f8f6] px-4 py-3 text-sm text-black/55 break-all">
                        {userEmail || "Signed in"}
                      </div>

                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full rounded-2xl bg-green-500 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        {loggingOut ? "Logging out..." : "Log out"}
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/auth"
                      className="block rounded-2xl bg-green-500 px-4 py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Sign in
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}