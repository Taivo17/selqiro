"use client";

import { useEffect, useMemo, useState } from "react";
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

function sortImages(images: ListingImage[]) {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

export default function MyPage() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;

  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [images, setImages] = useState<ListingImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const fetchListings = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("listings")
      .select(
        "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setListings((data || []) as Listing[]);
    setLoadingListings(false);
  };

  useEffect(() => {
    if (!loading && userId) fetchListings();
  }, [loading, userId]);

  const startEdit = (item: Listing) => {
    setEditingId(item.id);

    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditPrice(item.price);

    setImages(sortImages(item.listing_images || []));
    setNewFiles([]);
  };

  const removeImage = async (img: ListingImage) => {
    if (!editingId) return;

    await supabase
      .from("listing_images")
      .delete()
      .eq("id", img.id);

    setImages((prev) => prev.filter((i) => i.id !== img.id));
  };

  const setPrimary = async (img: ListingImage) => {
    if (!editingId || !userId) return;

    await supabase
      .from("listing_images")
      .update({ is_primary: false })
      .eq("listing_id", editingId);

    await supabase
      .from("listing_images")
      .update({ is_primary: true })
      .eq("id", img.id);

    setImages((prev) =>
      prev.map((i) => ({ ...i, is_primary: i.id === img.id }))
    );
  };  const moveImage = (index: number, direction: "up" | "down") => {
    setImages((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;

      if (target < 0 || target >= next.length) return prev;

      const current = next[index];
      next[index] = next[target];
      next[target] = current;

      return next.map((img, imgIndex) => ({
        ...img,
        sort_order: imgIndex,
        is_primary: imgIndex === 0,
      }));
    });
  };

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

  const saveEdit = async () => {
    if (!editingId || !userId) return;

    setSavingEdit(true);

    try {
      for (let index = 0; index < images.length; index += 1) {
        await supabase
          .from("listing_images")
          .update({
            sort_order: index,
            is_primary: index === 0,
          })
          .eq("id", images[index].id);
      }

      const newRows = [];

      for (let index = 0; index < newFiles.length; index += 1) {
        const resizedFile = await resizeImage(newFiles[index]);
        const fileName = `${userId}/${editingId}-${Date.now()}-${index}.jpg`;

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

        newRows.push({
          listing_id: editingId,
          user_id: userId,
          original_url: originalUrl,
          medium_url: `${originalUrl}?width=900&resize=contain`,
          thumb_url: `${originalUrl}?width=400&height=300&resize=cover`,
          sort_order: images.length + index,
          is_primary: images.length === 0 && index === 0,
        });
      }

      if (newRows.length > 0) {
        const { error: insertError } = await supabase
          .from("listing_images")
          .insert(newRows);

        if (insertError) throw insertError;
      }

      const primaryImage =
        images[0]?.original_url ||
        images[0]?.medium_url ||
        images[0]?.thumb_url ||
        newRows[0]?.original_url ||
        null;

      const { error } = await supabase
        .from("listings")
        .update({
          title: editTitle.trim(),
          description: editDescription.trim(),
          price: editPrice.trim(),
          image: primaryImage,
        })
        .eq("id", editingId)
        .eq("user_id", userId);

      if (error) throw error;

      setEditingId(null);
      setNewFiles([]);
      setImages([]);
      await fetchListings();
    } catch (error) {
      console.error(error);
      alert("Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return <main className="p-6">Loading...</main>;
  }

  if (!userId) {
    return (
      <main className="p-6">
        <p>You are not signed in.</p>
        <Link href="/auth">Go to auth</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[28px] bg-white p-5 shadow-sm">
          <h1 className="text-3xl font-semibold">My listings</h1>

          <div className="mt-4 flex flex-wrap gap-3">
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
              Marketplace
            </Link>
          </div>
        </header>

        {editingId && (
          <section className="rounded-[28px] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Edit listing</h2>

              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-2xl border border-black/10 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={inputClass}
                placeholder="Title"
              />

              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className={`${inputClass} min-h-32`}
                placeholder="Description"
              />

              <input
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className={inputClass}
                placeholder="Price"
              />

              <div>
                <label className={labelClass}>Add images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setNewFiles(Array.from(e.target.files || []))
                  }
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {images.map((img, index) => {
                  const url =
                    img.thumb_url || img.medium_url || img.original_url || "";

                  return (
                    <div
                      key={img.id}
                      className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                    >
                      {url ? (
                        <img
                          src={url}
                          alt=""
                          className="h-44 w-full object-cover"
                        />
                      ) : (
                        <div className="h-44 bg-neutral-100" />
                      )}

                      <div className="flex flex-wrap gap-2 p-3">
                        {index === 0 && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                            Primary
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => moveImage(index, "up")}
                          className="rounded-xl border px-3 py-1 text-xs"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() => moveImage(index, "down")}
                          className="rounded-xl border px-3 py-1 text-xs"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() => setPrimary(img)}
                          className="rounded-xl border px-3 py-1 text-xs"
                        >
                          Primary
                        </button>

                        <button
                          type="button"
                          onClick={() => removeImage(img)}
                          className="rounded-xl border border-red-200 px-3 py-1 text-xs text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {newFiles.length > 0 && (
                <p className="text-sm text-black/55">
                  {newFiles.length} new image(s) selected.
                </p>
              )}

              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="w-full rounded-2xl bg-black px-5 py-4 font-medium text-white disabled:opacity-60"
              >
                {savingEdit ? "Saving..." : "Save changes"}
              </button>
            </div>
          </section>
        )}

        {loadingListings ? (
          <div className="rounded-[28px] bg-white p-8 text-center shadow-sm">
            Loading your listings...
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((item) => {
              const img = sortImages(item.listing_images || [])[0];
              const imageUrl =
                img?.thumb_url ||
                img?.medium_url ||
                img?.original_url ||
                item.image ||
                "";

              return (
                <article
                  key={item.id}
                  className="rounded-[28px] bg-white p-4 shadow-sm"
                >
                  <Link href={`/listing/${item.id}`}>
                    <div className="overflow-hidden rounded-2xl bg-neutral-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.title}
                          className="h-52 w-full object-cover"
                        />
                      ) : (
                        <div className="h-52" />
                      )}
                    </div>

                    <h3 className="mt-4 text-xl font-semibold">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-2xl font-semibold">
                      {item.price}
                    </p>
                  </Link>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-xl border border-black/10 px-3 py-2 text-sm"
                    >
                      Edit
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}