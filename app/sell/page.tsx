"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

const MAX_IMAGES = 10;

async function resizeImage(file: File, maxWidth = 1600, quality = 0.82) {
  const imageBitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxWidth / imageBitmap.width);
  const width = Math.round(imageBitmap.width * scale);
  const height = Math.round(imageBitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not resize image");

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  if (!blob) throw new Error("Could not create resized image");

  return new File([blob], "listing-image.jpg", {
    type: "image/jpeg",
  });
}

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

  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const previewUrls = useMemo(() => {
    return files.map((file) => URL.createObjectURL(file));
  }, [files]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const imageFiles = Array.from(selectedFiles).filter((file) =>
      file.type.startsWith("image/")
    );

    setFiles((prev) => {
      const combined = [...prev, ...imageFiles];
      return combined.slice(0, MAX_IMAGES);
    });
  };

  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    setFiles((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) return prev;

      const current = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = current;

      return next;
    });
  };

  const uploadListingImages = async (listingId: number) => {
    if (!user || files.length === 0) return "";

    const rows = [];
    let firstOriginalUrl = "";

    for (let index = 0; index < files.length; index += 1) {
      const resizedFile = await resizeImage(files[index]);
      const fileName = `${user.id}/${listingId}-${Date.now()}-${index}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(fileName, resizedFile, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("listing-images")
        .getPublicUrl(fileName);

      const originalUrl = data.publicUrl;
      const mediumUrl = `${originalUrl}?width=900&resize=contain`;
      const thumbUrl = `${originalUrl}?width=400&height=300&resize=cover`;

      if (index === 0) firstOriginalUrl = originalUrl;

      rows.push({
        listing_id: listingId,
        user_id: user.id,
        original_url: originalUrl,
        medium_url: mediumUrl,
        thumb_url: thumbUrl,
        sort_order: index,
        is_primary: index === 0,
      });
    }

    const { error: imageError } = await supabase
      .from("listing_images")
      .insert(rows);

    if (imageError) throw imageError;

    return firstOriginalUrl;
  };

  const createListing = async () => {
    if (!user) return;

    if (!title.trim() || !description.trim() || !price.trim()) {
      alert("Fill required fields: title, description and price.");
      return;
    }

    setSaving(true);

    try {
      const cleanCountry = country.trim();
      const cleanCity = city.trim();

      const location =
        cleanCountry && cleanCity
          ? `${cleanCountry} • ${cleanCity}`
          : cleanCountry || cleanCity || "";

      const activeUntil = new Date();
      activeUntil.setDate(activeUntil.getDate() + 90);

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price: price.trim(),
          image: null,
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
          active_until: activeUntil.toISOString(),
        })
        .select("id")
        .single();

      await fetch("/api/ai/enrich-listing", {
        method: "POST",
        body: JSON.stringify({
          listingId: listingData?.id,
          title,
          description,
        }),
      });

      if (listingError || !listingData) {
        console.error(listingError);
        alert("Listing failed");
        setSaving(false);
        return;
      }

      const primaryImageUrl = await uploadListingImages(listingData.id);

      if (primaryImageUrl) {
        await supabase
          .from("listings")
          .update({ image: primaryImageUrl })
          .eq("id", listingData.id)
          .eq("user_id", user.id);
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
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="w-full rounded-2xl border border-black/10 bg-white p-3 text-sm"
          />

          {previewUrls.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {previewUrls.map((url, index) => (
                <div
                  key={url}
                  className="overflow-hidden rounded-2xl border border-black/10 bg-neutral-100"
                >
                  <img
                    src={url}
                    alt={`Selected preview ${index + 1}`}
                    className="h-48 w-full object-contain"
                  />

                  <div className="flex flex-wrap items-center gap-2 bg-white p-3">
                    {index === 0 && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        Primary
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => moveImage(index, "up")}
                      disabled={index === 0}
                      className="rounded-xl border border-black/10 px-3 py-1 text-xs disabled:opacity-40"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() => moveImage(index, "down")}
                      disabled={index === files.length - 1}
                      className="rounded-xl border border-black/10 px-3 py-1 text-xs disabled:opacity-40"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="rounded-xl border border-red-200 px-3 py-1 text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <input
            placeholder="Title *"
                  maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <textarea
            placeholder="Description *"
                  maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-28 w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <input
            placeholder="Price *"
                  maxLength={40}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
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
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          >
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="for_parts">For parts</option>
          </select>

          <input
            placeholder="Subcategory"
                  maxLength={60}
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <input
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <input
            placeholder="City"
                  maxLength={80}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <h2 className="pt-4 text-2xl font-semibold">Technical info</h2>

          <input
            placeholder="Manufacturer"
                  maxLength={80}
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <input
            placeholder="Part number"
                  maxLength={80}
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <input
            placeholder="OEM number"
                  maxLength={80}
            value={oemNumber}
            onChange={(e) => setOemNumber(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <h2 className="pt-4 text-2xl font-semibold">Vehicle fitment</h2>

          <input
            placeholder="Brand"
                  maxLength={80}
            value={vehicleBrand}
            onChange={(e) => setVehicleBrand(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <input
            placeholder="Model"
                  maxLength={80}
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <input
            placeholder="Year"
                  maxLength={20}
            value={vehicleYear}
            onChange={(e) => setVehicleYear(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

          <input
            placeholder="Engine"
                  maxLength={80}
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          />

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