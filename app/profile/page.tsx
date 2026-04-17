"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  email?: string | null;
  store_name?: string | null;
  store_slug?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUserAndProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCheckingAuth(false);
        setLoadingProfile(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");
      setCheckingAuth(false);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
        setLoadingProfile(false);
        return;
      }

      if (data) {
        const profile = data as Profile;
        setStoreName(profile.store_name || "");
        setStoreSlug(profile.store_slug || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || "");
        setBannerUrl(profile.banner_url || "");
      }

      setLoadingProfile(false);
    };

    loadUserAndProfile();
  }, []);

  const generatedSlug = useMemo(() => slugify(storeName), [storeName]);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!userId) {
      alert("Please sign in first.");
      return;
    }

    const cleanStoreName = storeName.trim();
    const cleanSlug = slugify(storeSlug || generatedSlug);
    const cleanBio = bio.trim();

    if (!cleanStoreName) {
      alert("Store name is required.");
      return;
    }

    if (!cleanSlug) {
      alert("Store slug is required.");
      return;
    }

    setSaving(true);

    const payload = {
      id: userId,
      email: userEmail || null,
      store_name: cleanStoreName,
      store_slug: cleanSlug,
      bio: cleanBio || null,
      avatar_url: avatarUrl || null,
      banner_url: bannerUrl || null,
    };

    const { error } = await supabase.from("profiles").upsert(payload);

    setSaving(false);

    if (error) {
      console.error("Error saving profile:", error);

      if (error.message?.toLowerCase().includes("duplicate")) {
        alert("This store slug is already in use. Choose another one.");
        return;
      }

      alert("Failed to save profile.");
      return;
    }

    setStoreSlug(cleanSlug);
    alert("Profile saved.");
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-medium">Checking account...</p>
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-medium">You are not signed in</p>
          <p className="mt-2 text-black/55">
            Sign in to create and manage your store profile.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/auth"
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Go to auth
            </Link>

            <Link
              href="/"
              className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
            >
              Back to marketplace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loadingProfile) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-medium">Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            Back to marketplace
          </Link>

          <Link
            href="/my-page"
            className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            Back to my page
          </Link>

          {storeSlug && (
            <Link
              href={`/store/${storeSlug}`}
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              View my store
            </Link>
          )}
        </div>

        <header className="mb-8 rounded-[36px] border border-black/8 bg-white px-6 py-6 shadow-sm sm:px-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-black/40">
            Store profile
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Build your public store
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-black/60 sm:text-lg">
            Set your public store name, custom address, short bio, avatar and banner.
            This will become the foundation of your public seller page.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Store name
                </label>
                <input
                  type="text"
                  placeholder="Example: Taivo Garage"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Store slug
                </label>
                <input
                  type="text"
                  placeholder={generatedSlug || "example-store"}
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(slugify(e.target.value))}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                />
                <p className="mt-2 text-sm text-black/50">
                  Public store URL: /store/{storeSlug || generatedSlug || "your-store"}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Bio
                </label>
                <textarea
                  rows={5}
                  placeholder="Tell people what your store is about..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Avatar image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="block w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Banner / cover image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="block w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="overflow-hidden rounded-[32px] border border-black/8 bg-white shadow-sm">
              <div className="h-44 bg-neutral-200">
                {bannerUrl ? (
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-neutral-200" />
                )}
              </div>

              <div className="px-6 pb-6">
                <div className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#111827] text-xl font-semibold text-white shadow-sm">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (storeName.trim().charAt(0) || "S").toUpperCase()
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                    Preview
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                    {storeName || "Your store name"}
                  </h2>
                  <p className="mt-2 text-sm text-black/50">
                    /store/{storeSlug || generatedSlug || "your-store"}
                  </p>
                  <p className="mt-4 text-base leading-7 text-black/65">
                    {bio || "Your store bio preview will appear here."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Notes
              </p>

              <div className="space-y-3 text-sm leading-6 text-black/60">
                <p>
                  The store slug should be short and clean because it becomes your public link.
                </p>
                <p>
                  Banner image gives your store a stronger identity and makes the page feel more alive.
                </p>
                <p>
                  Next we can connect this profile to a real dynamic store page: /store/[slug].
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}