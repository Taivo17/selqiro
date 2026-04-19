"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type UploadedImage = {
  id: string;
  dataUrl: string;
};

export default function SellPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("active");
  const [category, setCategory] = useState("general");
  const [condition, setCondition] = useState("used");
  const [country, setCountry] = useState("Estonia");
  const [city, setCity] = useState("");

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const lastCountry = localStorage.getItem("lastCountry");
    const lastCity = localStorage.getItem("lastCity");

    if (lastCountry) setCountry(lastCountry);
    if (lastCity) setCity(lastCity);
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id ?? null);
      setCheckingAuth(false);
    };

    loadUser();
  }, []);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const readers = files.map(
      (file) =>
        new Promise<UploadedImage>((resolve, reject) => {
          const reader = new FileReader();

          reader.onloadend = () => {
            resolve({
              id: `${file.name}-${Date.now()}-${Math.random()}`,
              dataUrl: reader.result as string,
            });
          };

          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );

    try {
      const loadedImages = await Promise.all(readers);
      setImages((prev) => [...prev, ...loadedImages].slice(0, 8));
    } catch (error) {
      console.error("Image loading failed:", error);
      alert("Some images could not be loaded.");
    }

    event.target.value = "";
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((image) => image.id !== id));
  };

  const moveImageLeft = (id: string) => {
    setImages((prev) => {
      const index = prev.findIndex((image) => image.id === id);
      if (index <= 0) return prev;

      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveImageRight = (id: string) => {
    setImages((prev) => {
      const index = prev.findIndex((image) => image.id === id);
      if (index === -1 || index >= prev.length - 1) return prev;

      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const primaryImage = images[0]?.dataUrl || "";

  const aiSuggestions = useMemo(() => {
    const suggestions: string[] = [];

    if (images.length === 0) {
      suggestions.push(
        "Add 1–3 clear photos first so AI can help identify the item later."
      );
    } else if (images.length === 1) {
      suggestions.push(
        "A second photo from another angle would improve future AI suggestions."
      );
    } else {
      suggestions.push(
        "Great start. Multiple photos will help future AI detection and search."
      );
    }

    if (!title.trim()) {
      suggestions.push(
        "Later AI can suggest a title based on your photos and selected category."
      );
    }

    if (!description.trim()) {
      suggestions.push("Later AI can draft a short description for you to edit.");
    }

    if (!price.trim()) {
      suggestions.push(
        "Later AI can suggest a price range, but you always decide the final price."
      );
    }

    return suggestions.slice(0, 3);
  }, [images.length, title, description, price]);

  const handleSubmit = async () => {
    if (!userId) {
      alert("Please sign in first.");
      router.push("/auth");
      return;
    }

    if (!title.trim() || !description.trim() || !price.trim()) {
      alert("Please fill title, description and price.");
      return;
    }

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanPrice = price.trim();
    const cleanCountry = country.trim();
    const cleanCity = city.trim();

    const location =
      cleanCity && cleanCountry
        ? `${cleanCountry} • ${cleanCity}`
        : cleanCountry || cleanCity || "";

    setIsSaving(true);

    const { error } = await supabase.from("listings").insert([
      {
        user_id: userId,
        title: cleanTitle,
        description: cleanDescription,
        price: cleanPrice,
        image: primaryImage || null,
        status,
        category,
        condition,
        country: cleanCountry,
        city: cleanCity,
        location,
      },
    ]);

    setIsSaving(false);

    if (error) {
      console.error("Error saving listing:", error);
      alert("Saving failed. Check Supabase connection and try again.");
      return;
    }

    localStorage.setItem("lastCountry", cleanCountry);
    localStorage.setItem("lastCity", cleanCity);

    router.push("/my-page");
    router.refresh();
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-medium">Checking account...</p>
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-medium">You need to sign in first</p>
          <p className="mt-2 text-black/55">
            Create an account or sign in before publishing listings.
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

          <Link
            href="/profile"
            className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            Store profile
          </Link>
        </div>

        <header className="mb-8 rounded-[36px] border border-black/8 bg-white px-6 py-6 shadow-sm sm:px-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-black/40">
            Create listing
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Sell with AI-ready structure
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-black/60 sm:text-lg">
            Start with photos, then add the key details. This layout is designed
            so AI can assist later without changing how people naturally create
            listings.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="space-y-6">
            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                  Step 1
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Add photos first
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  Photos should be easy to add because future AI assistance
                  starts from what the seller shows, not from hidden background
                  tracking.
                </p>
              </div>

              <div className="rounded-[28px] border border-dashed border-black/12 bg-black/[0.02] p-5">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="block w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
                <p className="mt-3 text-sm text-black/50">
                  You can add up to 8 photos. The first photo becomes the main
                  image.
                </p>
              </div>

              {images.length > 0 && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="overflow-hidden rounded-[24px] border border-black/8 bg-white"
                    >
                      <img
                        src={image.dataUrl}
                        alt={`Upload ${index + 1}`}
                        className="h-48 w-full object-cover"
                      />
                      <div className="flex flex-wrap gap-2 p-3">
                        <span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs text-black/60">
                          {index === 0 ? "Main photo" : `Photo ${index + 1}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => moveImageLeft(image.id)}
                          className="rounded-xl border border-black/10 px-3 py-1 text-xs hover:bg-black/[0.03]"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImageRight(image.id)}
                          className="rounded-xl border border-black/10 px-3 py-1 text-xs hover:bg-black/[0.03]"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="rounded-xl border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                  Step 2
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  AI helper area
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  This section is reserved for future AI assistance. AI should
                  support the seller, not control the seller.
                </p>
              </div>

              <div className="rounded-[28px] border border-black/10 bg-black/[0.02] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                    Future AI
                  </span>
                  <span className="text-sm text-black/50">
                    Suggestions based only on what the user adds
                  </span>
                </div>

                <div className="space-y-3">
                  {aiSuggestions.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm leading-6 text-black/65"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-dashed border-black/12 bg-white px-4 py-4 text-sm text-black/50">
                  Later this area can suggest title, category, condition,
                  description, price range and missing photo angles.
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                  Step 3
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Core listing details
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Example: BMW E39 headlights"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    >
                      <option value="general">General</option>
                      <option value="cars">Cars</option>
                      <option value="parts">Parts</option>
                      <option value="electronics">Electronics</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Condition
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    >
                      <option value="new">New</option>
                      <option value="used">Used</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Price
                    </label>
                    <input
                      type="text"
                      placeholder="Example: 60€"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Country
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    >
                      <option value="Estonia">Estonia</option>
                      <option value="Latvia">Latvia</option>
                      <option value="Lithuania">Lithuania</option>
                      <option value="Finland">Finland</option>
                      <option value="Sweden">Sweden</option>
                      <option value="Germany">Germany</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="Example: Tallinn"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Description
                  </label>
                  <textarea
                    placeholder="Write a short and clear description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Publish listing"}
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Live preview
              </p>

              <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white">
                <div className="overflow-hidden rounded-t-[28px] bg-neutral-100">
                  {primaryImage ? (
                    <img
                      src={primaryImage}
                      alt="Preview"
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-64 w-full items-center justify-center bg-neutral-100 text-sm text-black/35">
                      Main photo preview
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {title || "Your listing title"}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        status === "active"
                          ? "bg-green-100 text-green-700"
                          : status === "paused"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <p className="line-clamp-3 text-sm leading-6 text-black/60">
                    {description ||
                      "Your listing description preview will appear here."}
                  </p>

                  <p className="mt-4 text-2xl font-semibold">{price || "0€"}</p>

                  <div className="mt-3 text-sm text-black/45">
                    {category} • {condition} • {country || "No country"}
                    {city ? ` • ${city}` : ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Privacy-first notes
              </p>

              <div className="space-y-3 text-sm leading-6 text-black/60">
                <p>
                  AI should help based on the listing data and photos the seller
                  chooses to provide.
                </p>
                <p>
                  The system should not depend on unnecessary tracking of the
                  user.
                </p>
                <p>
                  This page is intentionally structured now so future AI can be
                  added without redesigning the whole selling flow.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}