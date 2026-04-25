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

  // AI / tehniline info
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

    reader.onloadend = () => {
      setImage(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  const createListing = async () => {
    if (!user) return;

    if (!title || !description || !price) {
      alert("Fill required fields");
      return;
    }

    setSaving(true);

    const location =
      city && country ? `${country} • ${city}` : country || city || "";

    const details = {
      manufacturer,
      partNumber,
      oemNumber,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      engine,
    };

    const searchText = [
      title,
      description,
      category,
      subcategory,
      manufacturer,
      partNumber,
      oemNumber,
      vehicleBrand,
      vehicleModel,
    ]
      .filter(Boolean)
      .join(" ");

    const { error } = await supabase.from("listings").insert({
      user_id: user.id,

      title,
      description,
      price,
      image,

      category,
      subcategory,
      condition,

      country,
      city,
      location,

      manufacturer,
      part_number: partNumber,
      oem_number: oemNumber,

      vehicle_brand: vehicleBrand,
      vehicle_model: vehicleModel,
      vehicle_year: vehicleYear,
      engine,

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
    return <div className="p-6">Loading...</div>;
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        <Link href="/">← Back</Link>

        <h1 className="text-3xl font-semibold">Create listing</h1>

        {/* IMAGE */}
        <input type="file" onChange={handleImageUpload} />

        {/* BASIC */}
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <input
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        {/* CATEGORY */}
        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <input
          placeholder="Subcategory"
          value={subcategory}
          onChange={(e) => setSubcategory(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        {/* LOCATION */}
        <input
          placeholder="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        {/* TECH */}
        <h2 className="text-xl font-semibold mt-4">Technical info</h2>

        <input
          placeholder="Manufacturer"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <input
          placeholder="Part number"
          value={partNumber}
          onChange={(e) => setPartNumber(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <input
          placeholder="OEM number"
          value={oemNumber}
          onChange={(e) => setOemNumber(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        {/* VEHICLE */}
        <h2 className="text-xl font-semibold mt-4">Vehicle fitment</h2>

        <input
          placeholder="Brand"
          value={vehicleBrand}
          onChange={(e) => setVehicleBrand(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <input
          placeholder="Model"
          value={vehicleModel}
          onChange={(e) => setVehicleModel(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <input
          placeholder="Year"
          value={vehicleYear}
          onChange={(e) => setVehicleYear(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <input
          placeholder="Engine"
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <button
          onClick={createListing}
          disabled={saving}
          className="w-full p-4 bg-black text-white rounded-xl"
        >
          {saving ? "Saving..." : "Publish"}
        </button>

      </div>
    </main>
  );
}