"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  store_name?: string | null;
  store_slug?: string | null;
};

function navClass(active: boolean) {
  return active
    ? "rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white shadow-sm transition"
    : "rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black/65 transition hover:bg-black/[0.03]";
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [storeSlug, setStoreSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSessionAndProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUserId(user?.id ?? null);
      setUserEmail(user?.email || "");

      if (user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("id, store_name, store_slug")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (data) {
          const profile = data as Profile;
          setStoreSlug(profile.store_slug || "");
        } else {
          setStoreSlug("");
        }
      } else {
        setStoreSlug("");
      }

      setLoading(false);
    };

    loadSessionAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;

      if (!mounted) return;

      setUserId(user?.id ?? null);
      setUserEmail(user?.email || "");

      if (user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("id, store_name, store_slug")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (data) {
          const profile = data as Profile;
          setStoreSlug(profile.store_slug || "");
        } else {
          setStoreSlug("");
        }
      } else {
        setStoreSlug("");
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    setLoggingOut(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/auth");
    router.refresh();
  };

  const shortEmail = userEmail ? userEmail.split("@")[0] : "";

  return (
    <header className="sticky top-0 z-40 border-b border-black/8 bg-[#f8f8f6]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            Selqiro
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {loading ? (
              <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/45">
                Loading...
              </span>
            ) : userId ? (
              <>
                <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/55">
                  {shortEmail || "Signed in"}
                </span>

                <Link
                  href="/sell"
                  className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                >
                  + Add listing
                </Link>

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03] disabled:opacity-60"
                >
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
                >
                  Sign in
                </Link>

                <Link
                  href="/sell"
                  className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                >
                  + Add listing
                </Link>
              </>
            )}
          </div>
        </div>

        <nav className="flex flex-wrap gap-3">
          <Link href="/" className={navClass(pathname === "/")}>
            Marketplace
          </Link>

          {userId && (
            <>
              <Link
                href="/my-page"
                className={navClass(pathname === "/my-page")}
              >
                My page
              </Link>

              <Link
                href="/profile"
                className={navClass(pathname === "/profile")}
              >
                Profile
              </Link>
            </>
          )}

          <Link href="/sell" className={navClass(pathname === "/sell")}>
            Sell
          </Link>

          {userId && storeSlug ? (
            <Link
              href={`/store/${storeSlug}`}
              className={navClass(pathname === `/store/${storeSlug}`)}
            >
              My store
            </Link>
          ) : (
            <Link
              href="/store/taivo"
              className={navClass(pathname === "/store/taivo")}
            >
              Store
            </Link>
          )}

          {!userId && (
            <Link href="/auth" className={navClass(pathname === "/auth")}>
              Auth
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}