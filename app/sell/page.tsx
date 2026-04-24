"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

type Category =
  | "general"
  | "cars"
  | "parts"
  | "electronics"
  | "computers"
  | "tools"
  | "home";

type Condition = "new" | "used";

const categories: { value: Category; label: string }[] = [
  { value: "general", label: "General" },
  { value: "cars", label: "Cars" },
  { value: "parts", label: "Parts" },
  { value: "electronics", label: "Electronics" },
  { value: "computers", label: "Computers" },
  { value: "tools", label: "Tools" },
  { value: "home", label: "Home" },
];

const countries = [
  "Estonia",
  "Latvia",
  "Lithuania",
  "Finland",
  "Sweden",
  "Germany",
];

export default function SellPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");

  const [category, setCategory] = useState<Category>("general");
  const [condition, setCondition] = useState<Condition>("used");
  const [country, setCountry] = useState("Estonia");
  const [city, setCity] = useState("");

  const [manufacturer, setManufacturer] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [oemNumber, setOemNumber] = useState("");

  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [engine, setEngine] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

  const cleanLocation = useMemo(() => {
    const cleanCountry = country.trim();
    const cleanCity = city.trim();

    if (cleanCountry && cleanCity) return `${cleanCountry} • ${cleanCity}`;
    return cleanCountry || cleanCity || "";
  }, [country, city]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setImage(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setImage("");
    setCategory("general");
    setCondition("used");
    setCountry("Estonia");
    setCity("");
    setManufacturer("");
    setPartNumber("");
    setOemNumber("");
    setVehicleBrand("");
    setVehicleModel("");
    setVehicleYear("");
    setEngine("");
  };

  const createListing = async () => {
    if (!user) {
      router.push("/auth");
      return;
    }

    if (!title.trim() || !description.trim() || !price.trim()) {
      alert("Please fill title, description and price.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("listings").insert({
      user_id: user.id,

      title: title.trim(),
      description: description.trim(),
      price: price.trim(),

      image: image || null,
      status: "active",

      category,
      condition,
      country: country.trim(),
      city: city.trim(),
      location: cleanLocation,

      manufacturer: manufacturer.trim() || null,
      part_number: partNumber.trim() || null,
      oem_number: oemNumber.trim() || null,

      vehicle_brand: vehicleBrand.trim() || null,
      vehicle_model: vehicleModel.trim() || null,
      vehicle_year: vehicleYear.trim() || null,
      engine: engine.trim() || null,

      compatibility: null,

      ai_title: null,
      ai_description: null,
      ai_category: null,
      ai_detected_brand: null,
      ai_detected_type: null,
      ai_confidence: null,
      ai_raw: null,
      ai_enriched: false,
      ai_level: "none",

      is_featured: false,
      featured_until: null,
    });

    setSaving(false);

    if (error) {
      console.error("Error creating listing:", error);
      alert("Failed to create listing.");
      return;
    }

    resetForm();
    router.push("/my-page");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-medium">Loading session...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-black/8 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-medium">You are not signed in</p>
          <p className="mt-2 text-black/55">
            Sign in before creating a listing.
          </p>

          <Link
            href="/auth"
            className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
          >
            Go to auth
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-black/40">
            Create listing
          </p>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Sell an item
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-black/60">
            Add photos first. Later AI can use these images to help identify the
            item, suggest a title, detect part numbers and prepare better search
            data.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                  Photos
                </p>

                <label className="block cursor-pointer rounded-[28px] border border-dashed border-black/15 bg-black/[0.02] p-6 text-center transition hover:bg-black/[0.04]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <p className="text-lg font-medium">Add item photo</p>
                  <p className="mt-2 text-sm text-black/50">
                    This will help future AI understand what you are selling.
                  </p>
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Mitsubishi 12V starter"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Description
                </label>
                <textarea
                  rows={7}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe condition, defects, compatibility and anything important."
                  className="w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Price
                </label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Example: 50"
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
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  >
                    {categories.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as Condition)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  >
                    <option value="used">Used</option>
                    <option value="new">New</option>
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
                    {countries.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Example: Paide"
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-black/8 bg-[#f8f8f6] p-5">
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                  Technical info
                </p>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      placeholder="Mitsubishi"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Part number
                    </label>
                    <input
                      type="text"
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      placeholder="M1T73383"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      OEM number
                    </label>
                    <input
                      type="text"
                      value={oemNumber}
                      onChange={(e) => setOemNumber(e.target.value)}
                      placeholder="OEM code"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-black/8 bg-[#f8f8f6] p-5">
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                  Vehicle fitment
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Vehicle brand
                    </label>
                    <input
                      type="text"
                      value={vehicleBrand}
                      onChange={(e) => setVehicleBrand(e.target.value)}
                      placeholder="Mitsubishi"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Vehicle model
                    </label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Example: Pajero"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Year
                    </label>
                    <input
                      type="text"
                      value={vehicleYear}
                      onChange={(e) => setVehicleYear(e.target.value)}
                      placeholder="Example: 2005"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Engine
                    </label>
                    <input
                      type="text"
                      value={engine}
                      onChange={(e) => setEngine(e.target.value)}
                      placeholder="Example: 2.5 diesel"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-black/50">
                  These fields are optional now, but they prepare the portal for
                  future AI search, VIN data and compatibility databases.
                </p>
              </div>

              <button
                onClick={createListing}
                disabled={saving}
                className="w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Publishing..." : "Publish listing"}
              </button>
            </div>
          </section>

          <aside className="rounded-[32px] border border-black/8 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-28 lg:self-start">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-black/40">
              Preview
            </p>

            <div className="overflow-hidden rounded-[26px] border border-black/8 bg-white">
              <div className="bg-neutral-100">
                {image ? (
                  <img
                    src={image}
                    alt="Preview"
                    className="h-72 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-72 w-full items-center justify-center bg-neutral-100 text-sm text-black/35">
                    Image preview
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="break-words text-2xl font-semibold tracking-tight">
                    {title || "Listing title"}
                  </h2>

                  <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    active
                  </span>
                </div>

                <p className="line-clamp-3 break-words text-sm leading-6 text-black/60">
                  {description || "Short description preview."}
                </p>

                <p className="mt-4 break-words text-3xl font-semibold">
                  {price || "0"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-sm text-black/55">
                  <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-2">
                    {category}
                  </span>
                  <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-2">
                    {condition}
                  </span>
                  <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-2">
                    {cleanLocation || "Location"}
                  </span>
                </div>

                {(manufacturer || partNumber || oemNumber) && (
                  <div className="mt-5 rounded-2xl bg-black/[0.03] p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-black/35">
                      Technical
                    </p>
                    <div className="space-y-1 text-sm text-black/60">
                      {manufacturer && <p>Manufacturer: {manufacturer}</p>}
                      {partNumber && <p>Part number: {partNumber}</p>}
                      {oemNumber && <p>OEM: {oemNumber}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-black/8 bg-[#f8f8f6] p-5">
              <p className="text-sm font-medium">AI-ready structure</p>
              <p className="mt-2 text-sm leading-6 text-black/55">
                The database now has fields for AI detection, technical part
                numbers, vehicle fitment and future paid enrichment.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}