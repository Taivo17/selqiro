"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

const PAGE_SIZE = 30;

type ListingImage = {
  id: string;
  thumb_url?: string | null;
  medium_url?: string | null;
  original_url?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
};

type Listing = {
  id: number;
  user_id?: string | null;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  status?: "active" | "paused" | "sold";
  category?: string;
  condition?: string;
  country?: string;
  city?: string;
  location?: string;
  manufacturer?: string;
  part_number?: string;
  oem_number?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  engine?: string;
  listing_images?: ListingImage[];
};

const inputClass =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm";

const labelClass = "mb-2 block text-sm font-medium text-black/60";

function getListingImage(item: Listing) {
  const sortedImages = [...(item.listing_images || [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  const img = sortedImages[0];

  return (
    img?.thumb_url ||
    img?.medium_url ||
    img?.original_url ||
    item.image ||
    ""
  );
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

export default function MyPage() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;

  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "sold">(
    "all"
  );

  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "paused" | "sold">(
    "active"
  );
  const [editImage, setEditImage] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);

  const [editCategory, setEditCategory] = useState("general");
  const [editCondition, setEditCondition] = useState("used");
  const [editCountry, setEditCountry] = useState("Estonia");
  const [editCity, setEditCity] = useState("");

  const [editManufacturer, setEditManufacturer] = useState("");
  const [editPartNumber, setEditPartNumber] = useState("");
  const [editOemNumber, setEditOemNumber] = useState("");

  const [editVehicleBrand, setEditVehicleBrand] = useState("");
  const [editVehicleModel, setEditVehicleModel] = useState("");
  const [editVehicleYear, setEditVehicleYear] = useState("");
  const [editEngine, setEditEngine] = useState("");

  const buildListingsQuery = (currentUserId: string, from: number) => {
    const to = from + PAGE_SIZE - 1;
    const searchNeedle = search.trim();

    let query = supabase
      .from("listings")
      .select(
        "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)"
      )
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    if (searchNeedle) {
      query = query.or(
        `title.ilike.%${searchNeedle}%,description.ilike.%${searchNeedle}%,search_text.ilike.%${searchNeedle}%`
      );
    }

    return query;
  };

  const fetchListings = async (currentUserId: string, from = 0) => {
    if (from === 0) setLoadingListings(true);

    const { data, error } = await buildListingsQuery(currentUserId, from);

    if (error) {
      console.error("Error fetching user listings:", error);
      if (from === 0) setListings([]);
      setLoadingListings(false);
      setLoadingMore(false);
      return;
    }

    const loaded = (data || []) as Listing[];

    if (from === 0) {
      setListings(loaded);
    } else {
      setListings((prev) => [...prev, ...loaded]);
    }

    setHasMore(loaded.length === PAGE_SIZE);
    setLoadingListings(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (loading) return;

    if (!userId) {
      setListings([]);
      setLoadingListings(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchListings(userId, 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [userId, loading, search, filter]);

  const loadMore = async () => {
    if (!userId || loadingMore || !hasMore) return;

    setLoadingMore(true);
    await fetchListings(userId, listings.length);
  };

  const startEdit = (item: Listing) => {
    setEditingId(item.id);

    setEditTitle(item.title || "");
    setEditDescription(item.description || "");
    setEditPrice(item.price || "");
    setEditStatus(item.status || "active");
    setEditImage(getListingImage(item));
    setEditFile(null);

    setEditCategory(item.category || "general");
    setEditCondition(item.condition || "used");
    setEditCountry(item.country || "Estonia");
    setEditCity(item.city || "");

    setEditManufacturer(item.manufacturer || "");
    setEditPartNumber(item.part_number || "");
    setEditOemNumber(item.oem_number || "");

    setEditVehicleBrand(item.vehicle_brand || "");
    setEditVehicleModel(item.vehicle_model || "");
    setEditVehicleYear(item.vehicle_year || "");
    setEditEngine(item.engine || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditPrice("");
    setEditStatus("active");
    setEditImage("");
    setEditFile(null);
    setEditCategory("general");
    setEditCondition("used");
    setEditCountry("Estonia");
    setEditCity("");
    setEditManufacturer("");
    setEditPartNumber("");
    setEditOemNumber("");
    setEditVehicleBrand("");
    setEditVehicleModel("");
    setEditVehicleYear("");
    setEditEngine("");
  };

  const handleEditImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setEditFile(file);
    setEditImage(URL.createObjectURL(file));
  };

  const uploadEditImage = async () => {
    if (!editFile || !userId || !editingId) {
      return {
        originalUrl: editImage || "",
        mediumUrl: "",
        thumbUrl: "",
      };
    }

    const resizedFile = await resizeImage(editFile);
    const fileName = `${userId}/${Date.now()}.jpg`;

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

    await supabase
      .from("listing_images")
      .update({ is_primary: false })
      .eq("listing_id", editingId)
      .eq("user_id", userId);

    const { error: imageError } = await supabase.from("listing_images").insert({
      listing_id: editingId,
      user_id: userId,
      original_url: originalUrl,
      medium_url: mediumUrl,
      thumb_url: thumbUrl,
      sort_order: 0,
      is_primary: true,
    });

    if (imageError) throw imageError;

    return { originalUrl, mediumUrl, thumbUrl };
  };

  const saveEdit = async () => {
    if (!editingId || !userId) return;

    if (!editTitle.trim() || !editDescription.trim() || !editPrice.trim()) {
      alert("Please fill title, description and price.");
      return;
    }

    setSavingEdit(true);

    try {
      const uploadedImage = await uploadEditImage();

      const cleanCountry = editCountry.trim();
      const cleanCity = editCity.trim();

      const location =
        cleanCity && cleanCountry
          ? `${cleanCountry} • ${cleanCity}`
          : cleanCountry || cleanCity || "";

      const searchText = [
        editTitle,
        editDescription,
        editCategory,
        editCondition,
        cleanCountry,
        cleanCity,
        editManufacturer,
        editPartNumber,
        editOemNumber,
        editVehicleBrand,
        editVehicleModel,
        editVehicleYear,
        editEngine,
      ]
        .map((item) => item.trim())
        .filter(Boolean)
        .join(" ");

      const { error } = await supabase
        .from("listings")
        .update({
          title: editTitle.trim(),
          description: editDescription.trim(),
          price: editPrice.trim(),
          status: editStatus,
          image: uploadedImage.originalUrl || editImage || null,

          category: editCategory,
          condition: editCondition,
          country: cleanCountry,
          city: cleanCity,
          location,

          manufacturer: editManufacturer.trim(),
          part_number: editPartNumber.trim(),
          oem_number: editOemNumber.trim(),

          vehicle_brand: editVehicleBrand.trim(),
          vehicle_model: editVehicleModel.trim(),
          vehicle_year: editVehicleYear.trim(),
          engine: editEngine.trim(),

          details: {
            manufacturer: editManufacturer.trim(),
            partNumber: editPartNumber.trim(),
            oemNumber: editOemNumber.trim(),
            vehicleBrand: editVehicleBrand.trim(),
            vehicleModel: editVehicleModel.trim(),
            vehicleYear: editVehicleYear.trim(),
            engine: editEngine.trim(),
          },

          search_text: searchText,
        })
        .eq("id", editingId)
        .eq("user_id", userId);

      if (error) throw error;

      cancelEdit();
      await fetchListings(userId, 0);
    } catch (error) {
      console.error("Error saving edit:", error);
      alert("Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const updateStatus = async (
    id: number,
    status: "active" | "paused" | "sold"
  ) => {
    if (!userId) return;

    const { error } = await supabase
      .from("listings")
      .update({ status })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating status:", error);
      alert("Failed to update listing status.");
      return;
    }

    await fetchListings(userId, 0);
  };

  const deleteListing = async (id: number) => {
    if (!userId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this listing?"
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting listing:", error);
      alert("Failed to delete listing.");
      return;
    }

    if (editingId === id) cancelEdit();
    await fetchListings(userId, 0);
  };

  const activeCount = listings.filter(
    (item) => (item.status || "active") === "active"
  ).length;

  const pausedCount = listings.filter((item) => item.status === "paused").length;
  const soldCount = listings.filter((item) => item.status === "sold").length;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-4 py-8 text-black sm:px-6">
        <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          Loading session...
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-4 py-8 text-black sm:px-6">
        <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-medium">You are not signed in</p>
          <p className="mt-2 text-black/55">
            Sign in to view and manage your own listings.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth"
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Go to auth
            </Link>

            <Link
              href="/"
              className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium"
            >
              Back to marketplace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f8f6] px-4 py-6 text-black sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-[28px] bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            Selqiro Store
          </p>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                My listings
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
                These are the listings connected to your signed-in account.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/sell"
                className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white"
              >
                + Add listing
              </Link>

              <Link
                href="/"
                className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium"
              >
                Back to marketplace
              </Link>
            </div>
          </div>
        </header>

        {editingId && (
          <section className="rounded-[28px] bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
                  Edit listing
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Update your item
                </h2>
              </div>

              <button
                onClick={cancelEdit}
                className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    rows={7}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Price</label>
                  <input
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className={inputClass}
                    >
                      <option value="general">General</option>
                      <option value="vehicles">Vehicles</option>
                      <option value="parts">Parts</option>
                      <option value="electronics">Electronics</option>
                      <option value="clothing">Clothing</option>
                      <option value="real_estate">Real estate</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Condition</label>
                    <select
                      value={editCondition}
                      onChange={(e) => setEditCondition(e.target.value)}
                      className={inputClass}
                    >
                      <option value="new">New</option>
                      <option value="used">Used</option>
                      <option value="for_parts">For parts</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(
                        e.target.value as "active" | "paused" | "sold"
                      )
                    }
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Country</label>
                    <select
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className={inputClass}
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
                    <label className={labelClass}>City</label>
                    <input
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Change image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageUpload}
                    className={inputClass}
                  />
                </div>

                <section className="rounded-[24px] border border-black/8 bg-black/[0.015] p-5">
                  <h3 className="mb-5 text-xl font-semibold tracking-tight">
                    Technical info
                  </h3>

                  <div className="space-y-5">
                    <div>
                      <label className={labelClass}>Manufacturer</label>
                      <input
                        value={editManufacturer}
                        onChange={(e) => setEditManufacturer(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Part number</label>
                      <input
                        value={editPartNumber}
                        onChange={(e) => setEditPartNumber(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>OEM number</label>
                      <input
                        value={editOemNumber}
                        onChange={(e) => setEditOemNumber(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-black/8 bg-black/[0.015] p-5">
                  <h3 className="mb-5 text-xl font-semibold tracking-tight">
                    Vehicle fitment
                  </h3>

                  <div className="space-y-5">
                    <div>
                      <label className={labelClass}>Brand</label>
                      <input
                        value={editVehicleBrand}
                        onChange={(e) => setEditVehicleBrand(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Model</label>
                      <input
                        value={editVehicleModel}
                        onChange={(e) => setEditVehicleModel(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Year</label>
                      <input
                        value={editVehicleYear}
                        onChange={(e) => setEditVehicleYear(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Engine</label>
                      <input
                        value={editEngine}
                        onChange={(e) => setEditEngine(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </section>

                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="w-full rounded-2xl bg-black px-5 py-4 text-base font-medium text-white disabled:opacity-60"
                >
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>
              </div>

              <aside className="h-fit rounded-[28px] border border-black/8 bg-white p-4 shadow-sm">
                <div className="overflow-hidden rounded-2xl bg-neutral-100">
                  {editImage ? (
                    <img
                      src={editImage}
                      alt="Preview"
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-black/40">
                      No image
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-black/35">
                    Preview
                  </p>

                  <h3 className="break-words text-2xl font-semibold tracking-tight">
                    {editTitle || "Listing title"}
                  </h3>

                  <p className="mt-3 break-words text-3xl font-bold">
                    {editPrice || "0"}
                  </p>

                  <p className="mt-4 line-clamp-4 break-words text-sm leading-6 text-black/60">
                    {editDescription || "Listing description preview."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-sm text-black/55">
                    <span className="rounded-full border border-black/10 px-3 py-2">
                      {editCategory}
                    </span>
                    <span className="rounded-full border border-black/10 px-3 py-2">
                      {editCondition}
                    </span>
                    <span className="rounded-full border border-black/10 px-3 py-2">
                      {editCountry}
                      {editCity ? ` • ${editCity}` : ""}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <p className="text-sm text-black/45">Loaded listings</p>
            <p className="mt-2 text-3xl font-semibold">{listings.length}</p>
          </div>

          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <p className="text-sm text-black/45">Loaded active</p>
            <p className="mt-2 text-3xl font-semibold">{activeCount}</p>
          </div>

          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <p className="text-sm text-black/45">Loaded paused / sold</p>
            <p className="mt-2 text-3xl font-semibold">
              {pausedCount + soldCount}
            </p>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <input
              type="text"
              placeholder="Search your listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />

            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as "all" | "active" | "paused" | "sold")
              }
              className={inputClass}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </section>

        {loadingListings ? (
          <div className="rounded-[28px] bg-white p-8 text-center shadow-sm">
            Loading your listings...
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-[28px] bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-medium">No listings for this account</p>
            <Link
              href="/sell"
              className="mt-5 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Create listing
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((item) => {
                const imageUrl = getListingImage(item);

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-[28px] bg-white p-4 shadow-sm"
                  >
                    <Link href={`/listing/${item.id}`}>
                      <div className="cursor-pointer">
                        <div className="mb-4 overflow-hidden rounded-2xl bg-neutral-100">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.title}
                              loading="lazy"
                              className="h-52 w-full object-cover"
                            />
                          ) : (
                            <div className="h-52 w-full bg-neutral-100" />
                          )}
                        </div>

                        <h3 className="break-words text-xl font-semibold tracking-tight">
                          {item.title}
                        </h3>

                        <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-black/60">
                          {item.description}
                        </p>

                        <p className="mt-4 break-words text-2xl font-semibold">
                          {item.price}
                        </p>

                        <div className="mt-3 text-sm text-black/45">
                          {item.category || "general"} •{" "}
                          {item.condition || "used"} •{" "}
                          {item.country || "No country"}
                          {item.city ? ` • ${item.city}` : ""}
                        </div>
                      </div>
                    </Link>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        onClick={() => updateStatus(item.id, "active")}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                      >
                        Active
                      </button>

                      <button
                        onClick={() => updateStatus(item.id, "paused")}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                      >
                        Pause
                      </button>

                      <button
                        onClick={() => updateStatus(item.id, "sold")}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                      >
                        Sold
                      </button>

                      <button
                        onClick={() => startEdit(item)}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteListing(item.id)}
                        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-2xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}