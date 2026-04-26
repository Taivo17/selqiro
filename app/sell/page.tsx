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
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const createListing = async () => {
    if (!user) return;

    if (!title.trim() || !description.trim() || !price.trim()) {
      alert("Fill required fields");
      return;
    }

    if (!file) {
      alert("Add image");
      return;
    }

    setSaving(true);

    try {
      // 1. Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(fileName, file);

      if (uploadError) {
        console.error(uploadError);
        alert("Image upload failed");
        setSaving(false);
        return;
      }

      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(fileName);

      const originalUrl = publicUrlData.publicUrl;

      // 3. Create thumbnail + medium (Supabase transform)
      const thumbUrl = `${originalUrl}?width=400&height=300&resize=contain`;
      const mediumUrl = `${originalUrl}?width=900&resize=contain`;

      // 4. Insert listing
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price: price.trim(),

          category,
          condition,

          country,
          city,
          location: `${country} • ${city}`,

          manufacturer,
          part_number: partNumber,
          oem_number: oemNumber,

          vehicle_brand: vehicleBrand,
          vehicle_model: vehicleModel,
          vehicle_year: vehicleYear,
          engine,

          status: "active",
        })
        .select()
        .single();

      if (listingError || !listingData) {
        console.error(listingError);
        alert("Listing failed");
        setSaving(false);
        return;
      }

      // 5. Save image row
      const { error: imageError } = await supabase
        .from("listing_images")
        .insert({
          listing_id: listingData.id,
          user_id: user.id,
          original_url: originalUrl,
          medium_url: mediumUrl,
          thumb_url: thumbUrl,
          is_primary: true,
        });

      if (imageError) {
        console.error(imageError);
      }

      setSaving(false);
      router.push("/my-page");
    } catch (err) {
      console.error(err);
      alert("Unexpected error");
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-8 text-black">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link href="/">← Back</Link>

        <h1 className="text-3xl font-semibold">Create listing</h1>

        <input type="file" accept="image/*" onChange={handleFile} />

        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border p-3"
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border p-3"
        />

        <input
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded-xl border p-3"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border p-3"
        >
          <option value="general">General</option>
          <option value="vehicles">Vehicles</option>
          <option value="parts">Parts</option>
        </select>

        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="w-full rounded-xl border p-3"
        >
          <option value="new">New</option>
          <option value="used">Used</option>
        </select>

        <input
          placeholder="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full rounded-xl border p-3"
        />

        <input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full rounded-xl border p-3"
        />

        <button
          onClick={createListing}
          disabled={saving}
          className="w-full rounded-xl bg-black p-4 text-white"
        >
          {saving ? "Saving..." : "Publish"}
        </button>
      </div>
    </main>
  );
}