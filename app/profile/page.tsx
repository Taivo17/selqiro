"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Identity = {
  id: string;
  type: "private" | "business";
  display_name: string;
};

type IdentityProfile = {
  id: string;
  identity_id: string;
  display_name: string;
  slug: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  banner_dominant_color?: string | null;
};

type Profile = {
  id: string;
  email?: string | null;
  store_name?: string | null;
  store_slug?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  banner_dominant_color?: string | null;

  is_premium?: boolean | null;
  premium_until?: string | null;
};


function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

async function resizeImageToWebp(file: File, maxSize: number, quality = 0.86): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Image conversion failed"));
        else resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}

async function uploadIdentityImage(
  userId: string,
  identityId: string,
  file: File,
  kind: "avatar" | "banner"
) {
  const maxSize = kind === "avatar" ? 512 : 2000;
  const blob = await resizeImageToWebp(file, maxSize);
  const path = `${userId}/${identityId}/${kind}-${Date.now()}.webp`;

  const { error } = await supabase.storage
    .from("identity-media")
    .upload(path, blob, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("identity-media")
    .getPublicUrl(path);

  return data.publicUrl;
}

async function extractDominantColor(file: File) {
  const bitmap = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  canvas.width = 40;
  canvas.height = 40;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "#d4d4d4";

  ctx.drawImage(bitmap, 0, 0, 40, 40);

  const imageData = ctx.getImageData(0, 0, 40, 40).data;

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < imageData.length; i += 4) {
    r += imageData[i];
    g += imageData[i + 1];
    b += imageData[i + 2];
    count++;
  }

  return rgbToHex(
    Math.round(r / count),
    Math.round(g / count),
    Math.round(b / count)
  );
}

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

  const [activeIdentityId, setActiveIdentityId] = useState<string | null>(null);
  const [identityProfileId, setIdentityProfileId] = useState<string | null>(null);

  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugLocked, setSlugLocked] = useState(false);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerDominantColor, setBannerDominantColor] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState("");

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [businessMessage, setBusinessMessage] = useState("");
  const [identities, setIdentities] = useState<Identity[]>([]);

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
        .select("id, email, is_premium, premium_until, active_identity_id")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
        setLoadingProfile(false);
        return;
      }

      const { data: identityRows } = await supabase
        .rpc("get_my_identities");

      const loadedIdentities = (identityRows || []) as Identity[];
      setIdentities(loadedIdentities);

      const profile = data as Profile & { active_identity_id?: string | null };

      const resolvedActiveIdentityId =
        profile?.active_identity_id ||
        loadedIdentities[0]?.id ||
        null;

      setActiveIdentityId(resolvedActiveIdentityId);

      if (resolvedActiveIdentityId) {
        const { data: identityProfileRows, error: identityProfileError } =
          await supabase.rpc("get_my_active_identity_profile");

        const identityProfileData = Array.isArray(identityProfileRows)
          ? identityProfileRows[0]
          : identityProfileRows;

        if (identityProfileError) {
          console.error("Error loading identity profile:", identityProfileError);
        }

        if (identityProfileData) {
          const identityProfile = identityProfileData as IdentityProfile;

          setIdentityProfileId(identityProfile.id);
          setStoreName(identityProfile.display_name || "");
          setStoreSlug(identityProfile.slug || "");
          setSlugLocked(Boolean(identityProfile.slug));
          setBio(identityProfile.bio || "");
          setAvatarUrl(identityProfile.avatar_url || "");
          setBannerUrl(identityProfile.banner_url || "");
          setBannerDominantColor(identityProfile.banner_dominant_color || "");
        }
      }

      if (data) {
        setIsPremium(Boolean(profile.is_premium));

        if (profile.premium_until) {
          setPremiumUntil(profile.premium_until);
        }
      }

      setLoadingProfile(false);
    };

    loadUserAndProfile();
  }, []);

  const generatedSlug = useMemo(() => slugify(storeName), [storeName]);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const handleBannerUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBannerFile(file);

    const dominantColor = await extractDominantColor(file);
    setBannerDominantColor(dominantColor);
    setBannerUrl(URL.createObjectURL(file));
  };

  const handleCreateBusiness = async () => {
    if (!userId) {
      alert("Palun logi kõigepealt sisse.");
      return;
    }

    const cleanName = businessName.trim();
    const cleanDescription = businessDescription.trim();

    if (!cleanName) {
      alert("Sisesta ettevõtte nimi.");
      return;
    }

    setCreatingBusiness(true);
    setBusinessMessage("");

    const baseSlug = slugify(cleanName) || "business";
    const cleanSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: businessData, error: businessError } = await supabase
      .from("business_accounts")
      .insert({
        owner_user_id: userId,
        name: cleanName,
        slug: cleanSlug,
        description: cleanDescription || null,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();

    if (businessError || !businessData) {
      console.error("Error creating business:", businessError);
      alert(`Ettevõtte loomine ebaõnnestus: ${businessError?.message || "unknown error"}`);
      setCreatingBusiness(false);
      return;
    }

    const businessId = businessData.id;

    const { error: memberError } = await supabase
      .from("business_members")
      .insert({
        business_account_id: businessId,
        user_id: userId,
        role: "owner",
        status: "active",
        invited_by: userId,
      });

    if (memberError) {
      console.error("Error creating business member:", memberError);
      alert(`Ettevõtte liikme loomine ebaõnnestus: ${memberError?.message || "unknown error"}`);
      setCreatingBusiness(false);
      return;
    }

    const { data: identityData, error: identityError } = await supabase
      .from("identities")
      .insert({
        type: "business",
        business_account_id: businessId,
        display_name: cleanName,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();

    if (identityError || !identityData) {
      console.error("Error creating business identity:", identityError);
      alert(`Ettevõtte identiteedi loomine ebaõnnestus: ${identityError?.message || "unknown error"}`);
      setCreatingBusiness(false);
      return;
    }

    const businessIdentityId = identityData.id;

    const { error: identityProfileError } = await supabase
      .from("identity_profiles")
      .insert({
        identity_id: businessIdentityId,
        display_name: cleanName,
        slug: cleanSlug,
        bio: cleanDescription || null,
        created_by_user_id: userId,
        updated_by_user_id: userId,
      });

    if (identityProfileError) {
      console.error("Error creating identity profile:", identityProfileError);
      alert(`Ettevõtte avaliku profiili loomine ebaõnnestus: ${identityProfileError?.message || "unknown error"}`);
      setCreatingBusiness(false);
      return;
    }

    setBusinessName("");
    setBusinessDescription("");
    setIdentities((current) => [
      ...current,
      {
        id: businessIdentityId,
        type: "business",
        display_name: cleanName,
      },
    ]);

    setBusinessMessage("Ettevõtte profiil loodud. Järgmisena lisame identiteedi vahetamise.");
    setCreatingBusiness(false);
  };

  const handleSave = async () => {
    if (!userId) {
      alert("Please sign in first.");
      return;
    }

    const cleanStoreName = storeName.trim();
    const cleanSlug = slugify(storeSlug || generatedSlug);

    if (!activeIdentityId) {
      alert("Aktiivset identiteeti ei leitud.");
      return;
    }

    const existingSlug = await supabase
      .from("identity_profiles")
      .select("id")
      .eq("slug", cleanSlug)
      .neq("identity_id", activeIdentityId)
      .maybeSingle();

    if (existingSlug.data) {
      alert("Store slug already exists.");
      setSaving(false);
      return;
    }
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

    let savedAvatarUrl = avatarUrl || null;
    let savedBannerUrl = bannerUrl || null;

    try {
      if (avatarFile) {
        savedAvatarUrl = await uploadIdentityImage(
          userId,
          activeIdentityId,
          avatarFile,
          "avatar"
        );
      }

      if (bannerFile) {
        savedBannerUrl = await uploadIdentityImage(
          userId,
          activeIdentityId,
          bannerFile,
          "banner"
        );
      }
    } catch (uploadError) {
      console.error("Error uploading profile media:", uploadError);
      alert("Profile image upload failed.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.rpc("save_my_active_identity_profile", {
      p_display_name: cleanStoreName,
      p_slug: cleanSlug,
      p_bio: cleanBio || "",
      p_avatar_url: savedAvatarUrl || "",
      p_banner_url: savedBannerUrl || "",
      p_banner_dominant_color: bannerDominantColor || "",
    });

    if (error) {
      console.error("Error saving profile:", error);

      if (error.message?.toLowerCase().includes("duplicate")) {
        alert("This store slug is already in use. Choose another one.");
        return;
      }

      alert("Failed to save profile.");
      return;
    }

    setAvatarFile(null);
    setBannerFile(null);
    setAvatarUrl(savedAvatarUrl || "");
    setBannerUrl(savedBannerUrl || "");
    setStoreSlug(cleanSlug);
    setSlugLocked(true);
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
Build your active identity profile
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-black/60 sm:text-lg">
            Muuda selle identiteedi avalikku profiili. Kui valid ülevalt teise identiteedi,
            siis muudad selle identiteedi store'i ja avalikku profiili.
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
                    disabled={slugLocked}
                  onChange={(e) => setStoreSlug(slugify(e.target.value))}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                />
                <p className="mt-2 text-sm text-black/50">
                  
                <span className="mt-2 block text-xs text-black/45">
                  Store slug creates your public store URL and cannot be changed later.
                </span>

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
            <div
              className="overflow-hidden rounded-[32px] border border-black/8 shadow-sm"
              style={
                isPremium && bannerDominantColor
                  ? {
                      background: `linear-gradient(
                        135deg,
                        ${bannerDominantColor}66 0%,
                        ${bannerDominantColor}33 20%,
                        white 50%,
                        ${bannerDominantColor}2A 80%,
                        ${bannerDominantColor}55 100%
                      )`,
                      boxShadow: `0 10px 40px ${bannerDominantColor}22`
                    }
                  : {
                      background: "white",
                    }
              }
            >
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


            <div
              className={`rounded-[32px] border p-6 shadow-sm sm:p-8 ${
                isPremium
                  ? "border-yellow-200 bg-gradient-to-br from-yellow-50 via-white to-amber-50"
                  : "border-black/8 bg-white"
              }`}
            >
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Membership
              </p>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {isPremium ? "Premium account" : "Free account"}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-black/60">
                    {isPremium
                      ? "Premium AI, profile personalization and future business tools enabled."
                      : "Upgrade later for Premium AI and advanced profile personalization."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-black/10 bg-white px-3 py-2">
                      AI limit: {isPremium ? "150/day" : "10/day"}
                    </span>

                    {isPremium && premiumUntil && (
                      <span className="rounded-full border border-yellow-200 bg-yellow-100 px-3 py-2 text-yellow-800">
                        Active until{" "}
                        {new Date(premiumUntil).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {isPremium && (
                  <div className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">
                    PREMIUM
                  </div>
                )}
              </div>

              {isPremium && (
                <div className="mt-5 rounded-2xl border border-yellow-200 bg-white/80 p-4 text-sm text-black/70">
                  Future Premium personalization:
                  <ul className="mt-3 space-y-2">
                    <li>• Dynamic profile colors from banner and avatar</li>
                    <li>• Enhanced store identity</li>
                    <li>• Advanced AI listing tools</li>
                    <li>• Future business features</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Identiteedid
              </p>

              <h3 className="text-2xl font-semibold tracking-tight">
                Sinu identiteedid
              </h3>

              <div className="mt-4 space-y-2">
                {identities.length === 0 ? (
                  <p className="rounded-2xl bg-black/[0.03] px-4 py-3 text-sm text-black/55">
                    Identiteete ei leitud.
                  </p>
                ) : (
                  identities.map((identity) => (
                    <div
                      key={identity.id}
                      className="flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-black">
                          {identity.type === "business" ? "🏢" : "👤"}{" "}
                          {identity.display_name}
                        </p>
                        <p className="mt-1 text-xs text-black/45">
                          {identity.type === "business" ? "Ettevõte" : "Eraisik"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <h3 className="mt-8 text-2xl font-semibold tracking-tight">
                Loo ettevõtte profiil
              </h3>

              <p className="mt-2 text-sm leading-6 text-black/60">
                Sama Selqiro konto all saad tegutseda eraisikuna või ettevõttena.
              </p>

              <div className="mt-5 space-y-3">
                <input
                  type="text"
                  placeholder="Ettevõtte nimi"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/30"
                />

                <textarea
                  rows={3}
                  placeholder="Lühikirjeldus"
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/30"
                />

                <button
                  onClick={handleCreateBusiness}
                  disabled={creatingBusiness}
                  className="w-full rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingBusiness ? "Loon..." : "Loo ettevõtte profiil"}
                </button>

                {businessMessage && (
                  <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
                    {businessMessage}
                  </p>
                )}
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