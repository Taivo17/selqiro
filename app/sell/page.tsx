"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SellPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [status, setStatus] = useState("active");

  const [category, setCategory] = useState("general");
  const [condition, setCondition] = useState("used");

  const [country, setCountry] = useState("Estonia");
  const [city, setCity] = useState("");

  useEffect(() => {
    const lastCountry = localStorage.getItem("lastCountry");
    const lastCity = localStorage.getItem("lastCity");

    if (lastCountry) setCountry(lastCountry);
    if (lastCity) setCity(lastCity);
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!title || !description || !price) {
      alert("Please fill title, description and price.");
      return;
    }

    const cleanCity = city.trim();
    const cleanCountry = country.trim();

    const location =
      cleanCity && cleanCountry
        ? `${cleanCountry} • ${cleanCity}`
        : cleanCountry || cleanCity || "";

    const newListing = {
      id: Date.now(),
      title,
      description,
      price,
      image,
      status,
      category,
      condition,
      country: cleanCountry,
      city: cleanCity,
      location,
    };

    const existing = JSON.parse(localStorage.getItem("listings") || "[]");
    const updated = [newListing, ...existing];

    localStorage.setItem("listings", JSON.stringify(updated));
    localStorage.setItem("lastCountry", cleanCountry);
    localStorage.setItem("lastCity", cleanCity);

    router.push("/my-page");
  };

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
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
        </div>

        <header className="mb-8 rounded-[36px] border border-black/8 bg-white px-6 py-6 shadow-sm sm:px-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-black/40">
            Create listing
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Start selling
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-black/60 sm:text-lg">
            Add a clean listing for your store. The form now remembers your last
            location automatically, so adding multiple items is faster.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
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
                  Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
              </div>

              <button
                onClick={handleSubmit}
                className="w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white transition hover:opacity-90"
              >
                Publish listing
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Preview
              </p>

              <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white">
                <div className="overflow-hidden rounded-t-[28px] bg-neutral-100">
                  {image ? (
                    <img
                      src={image}
                      alt="Preview"
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="h-64 w-full bg-neutral-100" />
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
                    {description || "Your listing description preview will appear here."}
                  </p>

                  <p className="mt-4 text-2xl font-semibold">{price || "0€"}</p>

                  <div className="mt-3 text-sm text-black/45">
                    {category} • {condition} •{" "}
                    {country || "No country"}
                    {city ? ` • ${city}` : ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                Notes
              </p>

              <div className="space-y-3 text-sm leading-6 text-black/60">
                <p>
                  Your last selected country and city are remembered automatically.
                </p>
                <p>
                  This helps when you add multiple listings from the same location.
                </p>
                <p>
                  Later we can connect this with smarter location-based marketplace visibility.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}