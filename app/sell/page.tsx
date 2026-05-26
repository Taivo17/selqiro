"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { CATEGORY_TREE } from "../../lib/categories";
import { getCategoryFields } from "../../lib/categoryFields";
import { resolveAiCategoryPath } from "../../lib/aiCategoryMapping";

const MAX_IMAGES = 10;
const MAX_SOURCE_IMAGE_SIZE_MB = 25;
const MAX_SOURCE_IMAGE_SIZE_BYTES = MAX_SOURCE_IMAGE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function validateSourceImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Only JPG, PNG and WEBP images are allowed.";
  }

  if (file.size > MAX_SOURCE_IMAGE_SIZE_BYTES) {
    return `Image is too large. Maximum source image size is ${MAX_SOURCE_IMAGE_SIZE_MB}MB.`;
  }

  return "";
}



const LONG_TEXT_FIELD_KEYS = new Set([
  "equipment",
  "included_accessories",
  "available_parts",
  "compatibility",
  "certification_documents",
  "notes",
]);

function getFieldMaxLength(key: string) {
  if (key.includes("year")) return 20;
  if (key.includes("power")) return 40;
  if (key.includes("fuel")) return 40;
  if (key.includes("mileage")) return 40;
  if (LONG_TEXT_FIELD_KEYS.has(key)) return 1000;
  return 80;
}


type StoreCategory = {
  id: string;
  name: string;
  sort_order?: number | null;
};

function parsePriceAmount(value: string) {
  const normalized = value
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}


async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runWorker())
  );

  return results;
}

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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image"));
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}


async function geocodeCity(country: string, city: string) {
  const response = await fetch("/api/location/geocode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      country,
      city,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    return null;
  }

  return {
    lat: data.lat,
    lng: data.lng,
  };
}

export default function SellPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [profileLoaded, setProfileLoaded] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [category, setCategory] = useState("general");
  const [subcategory, setSubcategory] = useState("");
  const [detailCategory, setDetailCategory] = useState("");
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

  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [storeCategoryId, setStoreCategoryId] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const [aiSelectedCategory, setAiSelectedCategory] = useState("");
  const [aiSelectedSubcategory, setAiSelectedSubcategory] = useState("");
  const [aiSelectedDetailCategory, setAiSelectedDetailCategory] = useState("");


  const selectedCategory = CATEGORY_TREE.find(
    (item) => item.value === category
  );

  const subcategoryOptions = selectedCategory?.children || [];
  const selectedSubcategory = subcategoryOptions.find(
    (item) => item.value === subcategory
  );
  const detailCategoryOptions = (selectedSubcategory as any)?.children || [];


  const aiSuggestions = useMemo(() => {
    const suggestions: string[] = [];

    if (files.length < 3) {
      suggestions.push("Add more photos for better visibility.");
    }

    if (
      category === "vehicles" &&
      !vehicleYear.trim()
    ) {
      suggestions.push("Add vehicle year.");
    }

    if (
      subcategory === "vehicle_parts" &&
      !partNumber.trim()
    ) {
      suggestions.push("Add part number or compatibility.");
    }

    if (
      detailCategory === "batteries" &&
      !dynamicFields.capacity
    ) {
      suggestions.push("Add battery capacity and voltage.");
    }

    if (
      detailCategory === "tires" &&
      !dynamicFields.diameter
    ) {
      suggestions.push("Add tire dimensions.");
    }

    if (
      category === "real_estate" &&
      !dynamicFields.area
    ) {
      suggestions.push("Add property area.");
    }

    if (
      category === "clothing_fashion" &&
      !dynamicFields.size
    ) {
      suggestions.push("Add size information.");
    }

    if (
      typeof aiResult?.confidence === "number" &&
      aiResult.confidence < 0.75
    ) {
      suggestions.push(
        "AI confidence is low. Consider adding clearer photos."
      );
    }

    return suggestions;
  }, [
    files.length,
    category,
    subcategory,
    detailCategory,
    vehicleYear,
    partNumber,
    dynamicFields,
    aiResult,
  ]);

  const activeFields = getCategoryFields(detailCategory || subcategory);

  const showVehicleFields = false;
  const showTechnicalFields = false;


  const previewUrls = useMemo(() => {
    return files.map((file) => URL.createObjectURL(file));
  }, [files]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);


  useEffect(() => {
    const loadProfileDefaults = async () => {
      if (!user?.id || profileLoaded) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("home_country, home_city")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile defaults:", error);
        return;
      }

      if (data?.home_country) {
        setCountry(data.home_country);
      }

      if (data?.home_city) {
        setCity(data.home_city);
      }

      setProfileLoaded(true);
    };

    loadProfileDefaults();
  }, [user?.id, profileLoaded]);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    const loadStoreCategories = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("store_categories")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading store sections:", error);
        setStoreCategories([]);
        return;
      }

      setStoreCategories((data || []) as StoreCategory[]);
    };

    loadStoreCategories();
  }, [user?.id]);

  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const selected = Array.from(selectedFiles);
    const validFiles: File[] = [];

    for (const file of selected) {
      const validationError = validateSourceImageFile(file);

      if (validationError) {
        alert(`${file.name}: ${validationError}`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setFiles((prev) => {
      const combined = [...prev, ...validFiles];

      if (combined.length > MAX_IMAGES) {
        alert(`Maximum ${MAX_IMAGES} images allowed.`);
      }

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

    const rows = await runWithConcurrency(files, 3, async (file, index) => {
      const resizedFile = await resizeImage(file);
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

      return {
        listing_id: listingId,
        user_id: user.id,
        original_url: originalUrl,
        medium_url: `${originalUrl}?width=900&resize=contain`,
        thumb_url: `${originalUrl}?width=400&height=300&resize=cover`,
        sort_order: index,
        is_primary: index === 0,
      };
    });

    const { error: imageError } = await supabase
      .from("listing_images")
      .insert(rows);

    if (imageError) throw imageError;

    return rows[0]?.original_url || "";
  };


  const analyzePhotosWithAI = async () => {
    if (files.length === 0) {
      alert("Add photos first.");
      return;
    }

    setAiLoading(true);

    try {
      const resizedFiles = await Promise.all(
        files.slice(0, 2).map((file) => resizeImage(file, 720, 0.65))
      );

      const imageUrls = await Promise.all(
        resizedFiles.map((file) => fileToDataUrl(file))
      );

      const response = await fetch("/api/ai/analyze-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrls,
        }),
      });

      const data = await response.json();

      if (!data.success || !data.result) {
        alert("AI could not analyze this time. Please try again.");
        return;
      }

      const result = data.result;

      setAiResult(result);

      if (result.suggested_title) {
        setTitle(result.suggested_title);
      }

      const aiCategoryPath = resolveAiCategoryPath(result);

      const suggestedCategory = aiCategoryPath.category;

      const validCategory = CATEGORY_TREE.find(
        (item) => item.value === suggestedCategory
      );

      const suggestedSubcategory = aiCategoryPath.subcategory;

      const validSubcategory = validCategory?.children?.find(
        (item) => item.value === suggestedSubcategory
      );

      const confidence =
        typeof result.confidence === "number"
          ? result.confidence
          : 0;

      const suggestedDetailCategory = aiCategoryPath.detailCategory;

      const validDetailCategory = (validSubcategory as any)?.children?.find(
        (item: { value: string; label: string }) =>
          item.value === suggestedDetailCategory
      );

      setAiSelectedCategory(suggestedCategory);
      setAiSelectedSubcategory(suggestedSubcategory);
      setAiSelectedDetailCategory(suggestedDetailCategory);

      if (validCategory) {
        setCategory(validCategory.value);
      } else {
        setCategory("general");
      }

      if (validSubcategory) {
        setSubcategory(validSubcategory.value);
      } else {
        setSubcategory("");
      }

      if (confidence >= 0.72 && validDetailCategory) {
        setDetailCategory(validDetailCategory.value);
      } else {
        setDetailCategory("");
      }

      if (result.brand) {
        setVehicleBrand(result.brand);
      }

      if (result.model) {
        setVehicleModel(result.model);
      }

      if (
        confidence >= 0.72 &&
        result.fields &&
        typeof result.fields === "object"
      ) {
        setDynamicFields(result.fields);
      } else {
        setDynamicFields({});
      }
    } catch (error) {
      console.error(error);
      alert("AI analyze failed.");
    } finally {
      setAiLoading(false);
    }
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

      const coords = await geocodeCity(
        cleanCountry,
        cleanCity
      );

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price: price.trim(),
          price_amount: parsePriceAmount(price),
          image: null,
          category,
          subcategory: subcategory.trim(),
          condition,
          country: cleanCountry,
          city: cleanCity,
          location,
          listing_lat: coords?.lat || null,
          listing_lng: coords?.lng || null,
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
            detailCategory,
            ...dynamicFields,
          },
          search_text: [
            title,
            description,
            category,
            subcategory,
            detailCategory,
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
            ...Object.values(dynamicFields),
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

      if (listingError || !listingData) {
        console.error(listingError);
        alert("Listing failed");
        setSaving(false);
        return;
      }

      if (storeCategoryId) {
        const { error: storeCategoryError } = await supabase
          .from("listing_store_categories")
          .insert({
            listing_id: listingData.id,
            store_category_id: storeCategoryId,
          });

        if (storeCategoryError) throw storeCategoryError;
      }

      fetch("/api/ai/enrich-listing", {
        method: "POST",
        body: JSON.stringify({
          listingId: listingData.id,
          title,
          description,
        }),
      }).catch((error) => {
        console.error("AI enrich background request failed:", error);
      });

      const primaryImageUrl = await uploadListingImages(listingData.id);

      if (primaryImageUrl) {
        await supabase
          .from("listings")
          .update({ image: primaryImageUrl })
          .eq("id", listingData.id)
          .eq("user_id", user.id);
      }

      const categoryChanged =
        aiSelectedCategory !== category ||
        aiSelectedSubcategory !== subcategory ||
        aiSelectedDetailCategory !== detailCategory;

      if (
        aiResult &&
        categoryChanged
      ) {
        await supabase
          .from("ai_category_corrections")
          .insert({
            user_id: user.id,
            listing_id: listingData.id,

            ai_object: aiResult.object || "",
            ai_suggested_title: aiResult.suggested_title || "",

            ai_category: aiSelectedCategory || "",
            ai_subcategory: aiSelectedSubcategory || "",
            ai_detail_category: aiSelectedDetailCategory || "",

            final_category: category || "",
            final_subcategory: subcategory || "",
            final_detail_category: detailCategory || "",

            ai_confidence:
              typeof aiResult.confidence === "number"
                ? aiResult.confidence
                : null,
          });
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
            <>
              <button
                type="button"
                onClick={analyzePhotosWithAI}
                disabled={aiLoading}
                className="w-full rounded-2xl border border-black/10 bg-black px-4 py-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {aiLoading
                  ? "AI analyzing photos..."
                  : "Analyze photos with AI"}
              </button>

              {aiResult && (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    typeof aiResult.confidence === "number" &&
                    aiResult.confidence >= 0.85
                      ? "border-green-200 bg-green-50/60"
                      : typeof aiResult.confidence === "number" &&
                        aiResult.confidence >= 0.7
                      ? "border-yellow-200 bg-yellow-50/60"
                      : "border-red-200 bg-red-50/60"
                  }`}
                >
                  <p className="font-semibold text-black">
                    AI detected:{" "}
                    {aiResult.object || "Unknown object"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-black/65">
                    {category && (
                      <span className="rounded-full border border-black/10 bg-white px-3 py-1">
                        {category}
                        {subcategory ? ` → ${subcategory}` : ""}
                        {detailCategory ? ` → ${detailCategory}` : ""}
                      </span>
                    )}
                    {aiResult.category && (
                      <span className="rounded-full border border-black/10 bg-white px-3 py-1">
                        Category: {aiResult.category}
                      </span>
                    )}

                    {aiResult.brand && (
                      <span className="rounded-full border border-black/10 bg-white px-3 py-1">
                        Brand: {aiResult.brand}
                      </span>
                    )}

                    {aiResult.model && (
                      <span className="rounded-full border border-black/10 bg-white px-3 py-1">
                        Model: {aiResult.model}
                      </span>
                    )}

                    {typeof aiResult.confidence === "number" && (
                      <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700">
                        Confidence:{" "}
                        {Math.round(aiResult.confidence * 100)}%
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-black/55">
                    AI can make mistakes. Please review the selected category and details before publishing.
                  </p>

                  {typeof aiResult.confidence === "number" &&
                    aiResult.confidence < 0.7 && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs text-red-700">
                        AI confidence is low. Please manually verify category and details.
                      </div>
                    )}
                </div>
              )}

              {aiSuggestions.length > 0 && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-sm">
                  <p className="font-semibold text-blue-900">
                    Suggested improvements
                  </p>

                  <ul className="mt-3 space-y-2 text-blue-900/80">
                    {aiSuggestions.map((suggestion) => (
                      <li
                        key={suggestion}
                        className="flex items-start gap-2"
                      >
                        <span>•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
            </>
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
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory("");
              setDetailCategory("");
            }}
            className="w-full rounded-2xl border border-black/10 p-4 outline-none"
          >
            {CATEGORY_TREE.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
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

          {subcategoryOptions.length > 0 ? (
            <select
              value={subcategory}
              onChange={(e) => {
                setSubcategory(e.target.value);
                setDetailCategory("");
              }}
              className="w-full rounded-2xl border border-black/10 p-4 outline-none"
            >
              <option value="">Select subcategory</option>

              {subcategoryOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              placeholder="Subcategory"
              maxLength={60}
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full rounded-2xl border border-black/10 p-4 outline-none"
            />
          )}

          {detailCategoryOptions.length > 0 && (
            <select
              value={detailCategory}
              onChange={(e) => setDetailCategory(e.target.value)}
              className="w-full rounded-2xl border border-black/10 p-4 outline-none"
            >
              <option value="">Select detailed category</option>

              {detailCategoryOptions.map((item: { value: string; label: string }) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          )}

          {storeCategories.length > 0 && (
            <select
              value={storeCategoryId}
              onChange={(e) => setStoreCategoryId(e.target.value)}
              className="w-full rounded-2xl border border-black/10 p-4 outline-none"
            >
              <option value="">No store section</option>

              {storeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}

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

          {showTechnicalFields && (
            <>
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

            </>
          )}

          {showVehicleFields && (
            <>
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

            </>
          )}


          {activeFields.length > 0 && (
            <div className="space-y-4 pt-6">
              <h2 className="text-2xl font-semibold">
                Category specific details
              </h2>

              {activeFields.map((field) => {
                const maxLength = getFieldMaxLength(field.key);
                const isLongText = LONG_TEXT_FIELD_KEYS.has(field.key);
                const value = dynamicFields[field.key] || "";

                return isLongText ? (
                  <textarea
                    key={field.key}
                    placeholder={field.label}
                    maxLength={maxLength}
                    value={value}
                    onChange={(e) =>
                      setDynamicFields((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="min-h-28 w-full resize-y break-words rounded-2xl border border-black/10 p-4 outline-none"
                  />
                ) : (
                  <input
                    key={field.key}
                    placeholder={field.label}
                    maxLength={maxLength}
                    value={value}
                    onChange={(e) =>
                      setDynamicFields((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-black/10 p-4 outline-none"
                  />
                );
              })}
            </div>
          )}

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