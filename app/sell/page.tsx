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

  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  const createListing = async () => {
    if (!user) return;

    if (!title.trim() || !description.trim() || !price.trim()) {
      alert("Fill required fields");
      return;
    }

    setSaving(true);

    try {
      let originalUrl = "";
      let mediumUrl = "";
      let thumbUrl = "";

      if (file) {
        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(fileName, file, { upsert: false });

        if (uploadError) {
          console.error(uploadError);
          alert("Image upload failed");
          setSaving(false);
          return;
        }

        const { data } = supabase.storage
          .from("listing-images")
          .getPublicUrl(fileName);

        originalUrl = data.publicUrl;
        mediumUrl = `${originalUrl}?width=900&resize=contain`;
        thumbUrl = `${originalUrl}?width=400&height=300&resize=cover`;
      }

      const cleanCountry = country.trim();
      const cleanCity = city.trim();
      const location =
        cleanCountry && cleanCity
          ? `${cleanCountry} • ${cleanCity}`
          : cleanCountry || cleanCity || "";

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price: price.trim(),
          image: originalUrl || null,

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

          details: {
            manufacturer: manufacturer.trim(),
            partNumber: partNumber.trim(),
            oemNumber: oemNumber.trim(),
            vehicleBrand: vehicleBrand.trim(),
            vehicleModel: vehicleModel.trim(),
            vehicleYear: vehicleYear.trim(),
            engine: engine.trim(),
          },

          search_text: [
            title,
            description,
            category,
            subcategory,
            condition,
            country,
            city,
            manufacturer,
            partNumber,
            oemNumber,
            vehicleBrand,
            vehicleModel,
            vehicleYear,
            engine,
          ]
            .filter(Boolean)
            .join(" "),

          ai_status: "not_started",
          ai_enriched: false,
          ai_level: "none",
          is_featured: false,
          status: "active",
        })
        .select("id")
        .single();

      if (listingError || !listingData) {
        console.error(listingError);
        alert("Listing failed");
        setSaving(false);
        return;
      }

      if (originalUrl) {
        const { error: imageError } = await supabase
          .from("listing_images")
          .insert({
            listing_id: listingData.id,
            user_id: user.id,
            original_url: originalUrl,
            medium_url: mediumUrl,
            thumb_url: thumbUrl,
            sort_order: 0,
            is_primary: true,
          });

        if (imageError) {
          console.error(imageError);
          alert("Listing saved, but image metadata failed");
        }
      }

      router.push("/my-page");
    } catch (error) {
      console.error(error);
      alert("Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="p-6">Loading...</main>;

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-6">
      <div className="mx-auto max-w-3xl rounded-[32px] bg-white p-5 shadow-sm sm:p-8">
        <Link href="/" className="text-sm font-medium text-black/60">
          ← Back
        </Link>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Create listing
        </h1>

        <div className="mt-6 space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full rounded-2xl border border-black/10 bg-white p-3 text-sm"
          />

          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28 w-full rounded-2xl border border-black/10 p-4 outline-none" />
          <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />

          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none">
            <option value="general">General</option>
            <option value="vehicles">Vehicles</option>
            <option value="parts">Parts</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="real_estate">Real estate</option>
          </select>

          <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none">
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="for_parts">For parts</option>
          </select>

          <input placeholder="Subcategory" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />
          <input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />
          <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />

          <h2 className="pt-4 text-2xl font-semibold">Technical info</h2>

          <input placeholder="Manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />
          <input placeholder="Part number" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />
          <input placeholder="OEM number" value={oemNumber} onChange={(e) => setOemNumber(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />

          <h2 className="pt-4 text-2xl font-semibold">Vehicle fitment</h2>

          <input placeholder="Brand" value={vehicleBrand} onChange={(e) => setVehicleBrand(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />
          <input placeholder="Model" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />
          <input placeholder="Year" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />
          <input placeholder="Engine" value={engine} onChange={(e) => setEngine(e.target.value)} className="w-full rounded-2xl border border-black/10 p-4 outline-none" />

          <button
            onClick={createListing}
            disabled={saving}
            className="w-full rounded-2xl bg-black p-4 font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>
    </main>
  );
}