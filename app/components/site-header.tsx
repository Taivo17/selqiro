"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { getTranslation } from "../../lib/i18n/useTranslation";

type ProfileRow = {
  store_slug?: string | null;
  language?: string | null;
  active_identity_id?: string | null;
  store_name?: string | null;
};

type IdentityRow = {
  id: string;
  type: "private" | "business";
  display_name: string;
  avatar_url?: string | null;
};

function navClass(active: boolean) {
  return active
    ? "rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm transition"
    : "rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black/70 transition hover:bg-black/[0.03]";
}

function mobileNavClass(active: boolean) {
  return active
    ? "rounded-2xl bg-black px-4 py-3 text-center text-sm font-medium text-white shadow-sm transition"
    : "rounded-2xl border border-black/10 bg-white px-4 py-3 text-center text-sm font-medium text-black/70 transition hover:bg-black/[0.03]";
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [storeSlug, setStoreSlug] = useState("");
  const [language, setLanguage] = useState("en");
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const [loadingStoreSlug, setLoadingStoreSlug] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasNewFeedItems, setHasNewFeedItems] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [activeIdentity, setActiveIdentity] = useState<IdentityRow | null>(null);

  const userId = user?.id ?? null;
  const userEmail = user?.email ?? "";

  const goMarketplaceFresh = () => {
    setMobileMenuOpen(false);

    if (pathname === "/") {
      window.location.href = "/";
      return;
    }

    router.push("/");
  };

  useEffect(() => {
    let mounted = true;

    const loadProfileSlug = async () => {
      if (!userId) {
        if (mounted) {
          setStoreSlug("");
          setLanguage("en");
          setActiveIdentity(null);
          setLanguageLoaded(true);
          setLoadingStoreSlug(false);
        }
        return;
      }

      setLoadingStoreSlug(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("store_slug, language, active_identity_id, store_name")
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
      setLanguage(profile?.language || "en");

      let resolvedIdentity: IdentityRow | null = null;

      if (profile?.active_identity_id) {
        const { data: identityData } = await supabase
          .from("identities")
          .select("id, type, display_name, avatar_url")
          .eq("id", profile.active_identity_id)
          .maybeSingle();

        if (identityData) {
          resolvedIdentity = identityData as IdentityRow;
        }
      }

      if (!resolvedIdentity) {
        const { data: privateIdentityData } = await supabase
          .from("identities")
          .select("id, type, display_name, avatar_url")
          .eq("type", "private")
          .eq("user_id", userId)
          .maybeSingle();

        if (privateIdentityData) {
          resolvedIdentity = privateIdentityData as IdentityRow;
        }
      }

      setActiveIdentity(
        resolvedIdentity || {
          id: "fallback-private",
          type: "private",
          display_name: profile?.store_name || userEmail?.split("@")[0] || "Kasutaja",
          avatar_url: null,
        }
      );

      setLanguageLoaded(true);
      setLoadingStoreSlug(false);
    };

    loadProfileSlug();

    return () => {
      mounted = false;
    };
  }, [userId]);


  useEffect(() => {
    if (!userId) {
      setHasNewFeedItems(false);
      return;
    }

    const checkFeedUpdates = async () => {
      const lastViewed =
        localStorage.getItem("feed_last_viewed_at") || "";

      const { data: follows } = await supabase
        .from("store_follows")
        .select("store_owner_id")
        .eq("follower_id", userId);

      const followedIds = (follows || [])
        .map((row) => row.store_owner_id)
        .filter(Boolean);

      if (followedIds.length === 0) {
        setHasNewFeedItems(false);
        return;
      }

      let query = supabase
        .from("listings")
        .select("id, created_at")
        .in("user_id", followedIds)
        .eq("status", "active")
        .gt("active_until", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (lastViewed) {
        query = query.gt("created_at", lastViewed);
      }

      const { data } = await query;

      setHasNewFeedItems((data || []).length > 0);
    };

    checkFeedUpdates();

    const interval = setInterval(() => {
      checkFeedUpdates();
    }, 60000);

    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userId) {
      setHasUnreadMessages(false);
      return;
    }

    const checkUnreadMessages = async () => {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", userId);

      if (!participants || participants.length === 0) {
        setHasUnreadMessages(false);
        return;
      }

      for (const participant of participants) {
        let query = supabase
          .from("messages")
          .select("id")
          .eq("conversation_id", participant.conversation_id)
          .neq("sender_id", userId)
          .limit(1);

        if (participant.last_read_at) {
          query = query.gt("created_at", participant.last_read_at);
        }

        const { data } = await query;

        if ((data || []).length > 0) {
          if (!pathname.startsWith("/messages/")) {
            setHasUnreadMessages(true);
          } else {
            setHasUnreadMessages(false);
          }

          return;
        }
      }

      setHasUnreadMessages(false);
    };

    checkUnreadMessages();

    const interval = setInterval(() => {
      checkUnreadMessages();
    }, 60000);

    return () => clearInterval(interval);
  }, [userId, pathname]);

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
  const isFeed = pathname.startsWith("/feed");
  const isMyPage = pathname.startsWith("/my-page");
  const isSell = pathname.startsWith("/sell");
  const isProfile = pathname.startsWith("/profile");
  const isStore = pathname.startsWith("/store");

  const showStoreLink = !loadingStoreSlug && !!storeSlug;

  useEffect(() => {
    if (pathname.startsWith("/feed")) {
      localStorage.setItem(
        "feed_last_viewed_at",
        new Date().toISOString()
      );

      setHasNewFeedItems(false);
    }
  }, [pathname]);

  const t = (key: any) => getTranslation(languageLoaded ? language : "en", key);


  return (
    <header className="sticky top-0 z-30 border-b border-black/6 bg-[#f8f8f6]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goMarketplaceFresh}
              className="shrink-0 text-2xl font-semibold tracking-tight text-black"
            >
              Selqiro
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-xl text-black/70 transition hover:bg-black/[0.03] sm:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? "×" : "☰"}
            </button>

            {!loading && userId ? (
              <div className="hidden items-center gap-2 sm:flex">

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

                {activeIdentity && (
                  <div className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm text-black/70">
                    <span className="block text-[10px] uppercase tracking-[0.18em] text-black/35">
                      Tegutsen kui
                    </span>
                    <span className="flex items-center gap-2 font-medium text-black">
                      {activeIdentity.type === "business" ? "🏢" : "👤"}
                      {activeIdentity.display_name}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-2xl bg-green-500 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            ) : !loading ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/auth"
                  className="rounded-2xl bg-green-500 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/45">
                  Loading...
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goMarketplaceFresh}
                className={navClass(isMarketplace)}
              >
                {t("navigation.marketplace")}
              </button>

              <Link href="/feed" className={navClass(isFeed)}>
                <span className="relative inline-flex items-center gap-2">
                  {t("navigation.feed")}

                  {hasNewFeedItems && (
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  )}
                </span>
              </Link>

              <Link href="/my-page" className={navClass(isMyPage)}>
                {t("navigation.myPage")}
              </Link>

              <Link
                href="/messages"
                className={navClass(pathname.startsWith("/messages"))}
              >
                <span className="relative inline-flex items-center gap-2">
                  {t("navigation.messages")}

                  {hasUnreadMessages && (
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  )}
                </span>
              </Link>

              <Link href="/sell" className={navClass(isSell)}>
                {t("navigation.sell")}
              </Link>

              {showStoreLink ? (
                <Link href={`/store/${storeSlug}`} className={navClass(isStore)}>
                  {t("navigation.store")}
                </Link>
              ) : (
                <Link href="/profile" className={navClass(isProfile)}>
                  {t("navigation.store")}
                </Link>
              )}
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="sm:hidden">
              <div className="rounded-[28px] border border-black/8 bg-white p-3 shadow-sm">
                <nav className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={goMarketplaceFresh}
                    className={mobileNavClass(isMarketplace)}
                  >
                    {t("navigation.marketplace")}
                  </button>

                  <Link href="/feed" className={mobileNavClass(isFeed)}>
                    <span className="inline-flex items-center justify-center gap-2">
                      {t("navigation.feed")}

                      {hasNewFeedItems && (
                        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                      )}
                    </span>
                  </Link>

                  <Link href="/my-page" className={mobileNavClass(isMyPage)}>
                    {t("navigation.myPage")}
                  </Link>

                  <Link
                    href="/messages"
                    className={mobileNavClass(pathname.startsWith("/messages"))}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {t("navigation.messages")}

                      {hasUnreadMessages && (
                        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                      )}
                    </span>
                  </Link>

                  <Link href="/sell" className={mobileNavClass(isSell)}>
                    {t("navigation.sell")}
                  </Link>

                  {showStoreLink ? (
                    <Link
                      href={`/store/${storeSlug}`}
                      className={mobileNavClass(isStore)}
                    >
                      {t("navigation.store")}
                    </Link>
                  ) : (
                    <Link href="/profile" className={mobileNavClass(isProfile)}>
                      {t("navigation.store")}
                    </Link>
                  )}

                  <Link
                    href="/profile"
                    className={
                      isProfile
                        ? "rounded-2xl bg-black px-4 py-3 text-center text-sm font-medium text-white shadow-sm transition"
                        : "rounded-2xl border border-black/10 bg-white px-4 py-3 text-center text-sm font-medium text-black/70 transition hover:bg-black/[0.03]"
                    }
                  >
                    Profile
                  </Link>
                </nav>

                <div className="mt-3 border-t border-black/6 pt-3">
                  {loading ? (
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/45">
                      Loading...
                    </div>
                  ) : userId ? (
                    <div className="space-y-2">
                      <div className="break-all rounded-2xl border border-black/10 bg-[#f8f8f6] px-4 py-3 text-sm text-black/55">
                        {userEmail || "Signed in"}
                      </div>

                      {activeIdentity && (
                        <div className="rounded-2xl border border-black/10 bg-[#f8f8f6] px-4 py-3 text-sm text-black/70">
                          <span className="block text-[10px] uppercase tracking-[0.18em] text-black/35">
                            Tegutsen kui
                          </span>
                          <span className="flex items-center gap-2 font-medium text-black">
                            {activeIdentity.type === "business" ? "🏢" : "👤"}
                            {activeIdentity.display_name}
                          </span>
                        </div>
                      )}

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