"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

export default function SellPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");

  const [category, setCategory] = useState("general");
  const [subcategory, setSubcategory] = useState("");
  const [condition, setCondition] = useState("used");

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const createListing = async () => {
    if (!user) return;

    if (!title.trim() || !description.trim() || !price.trim()) {
      alert("Fill required fields");
      return;
    }

    setSaving(true);

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanPrice = price.trim();
    const cleanCountry = country.trim();
    const cleanCity = city.trim();

    const location =
      cleanCity && cleanCountry
        ? `${cleanCountry} • ${cleanCity}`
        : cleanCountry || cleanCity || "";

    const details = {
      manufacturer: manufacturer.trim(),
      partNumber: partNumber.trim(),
      oemNumber: oemNumber.trim(),
      vehicleBrand: vehicleBrand.trim(),
      vehicleModel: vehicleModel.trim(),
      vehicleYear: vehicleYear.trim(),
      engine: engine.trim(),
    };

    const searchText = [
      cleanTitle,
      cleanDescription,
      category,
      subcategory,
      condition,
      cleanCountry,
      cleanCity,
      manufacturer,
      partNumber,
      oemNumber,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      engine,
    ]
      .filter(Boolean)
      .join(" ");

    const { error } = await supabase.from("listings").insert({
      user_id: user.id,

      title: cleanTitle,
      description: cleanDescription,
      price: cleanPrice,
      image: image || null,

      category,
      subcategory: subcategory.trim(),
      condition,

      country: cleanCountry,
      city: cleanCity,
      location,

      manufacturer: manufacturer.trim(),
      part_number: partNumber.trim(),
      oem_number: oemNumber.trim(),

      vehicle_brand: vehicleBrand.trim(),
      vehicle_model: vehicleModel.trim(),
      vehicle_year: vehicleYear.trim(),
      engine: engine.trim(),

      details,

      search_text: searchText,

      ai_status: "not_started",
      ai_enriched: false,
      ai_level: "none",

      is_featured: false,
      status: "active",
    });

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Error creating listing");
      return;
    }

    router.push("/my-page");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-8 text-black">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="text-lg font-medium">
          ← Back
        </Link>

        <h1 className="text-5xl font-semibold tracking-tight">
          Create listing
        </h1>

        <input type="file" accept="image/*" onChange={handleImageUpload} />

        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-32 w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <input
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        >
          <option value="general">General</option>
          <option value="vehicles">Vehicles</option>
          <option value="parts">Parts</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="real_estate">Real estate</option>
        </select>

        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        >
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="for_parts">For parts</option>
        </select>

        <input
          placeholder="Subcategory"
          value={subcategory}
          onChange={(e) => setSubcategory(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        >
          <option value="Estonia">Estonia</option>
          <option value="Latvia">Latvia</option>
          <option value="Lithuania">Lithuania</option>
          <option value="Finland">Finland</option>
          <option value="Sweden">Sweden</option>
          <option value="Germany">Germany</option>
        </select>

        <input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <h2 className="pt-4 text-3xl font-semibold">Technical info</h2>

        <input
          placeholder="Manufacturer"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <input
          placeholder="Part number"
          value={partNumber}
          onChange={(e) => setPartNumber(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <input
          placeholder="OEM number"
          value={oemNumber}
          onChange={(e) => setOemNumber(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <h2 className="pt-4 text-3xl font-semibold">Vehicle fitment</h2>

        <input
          placeholder="Brand"
          value={vehicleBrand}
          onChange={(e) => setVehicleBrand(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <input
          placeholder="Model"
          value={vehicleModel}
          onChange={(e) => setVehicleModel(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <input
          placeholder="Year"
          value={vehicleYear}
          onChange={(e) => setVehicleYear(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <input
          placeholder="Engine"
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
          className="w-full rounded-2xl border border-black/20 bg-white p-4 text-lg outline-none"
        />

        <button
          onClick={createListing}
          disabled={saving}
          className="w-full rounded-2xl bg-black p-5 text-lg font-medium text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Publish"}
        </button>
      </div>
    </main>
  );
}