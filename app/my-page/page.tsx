"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { CATEGORY_TREE } from "../../lib/categories";
import { getCategoryFields } from "../../lib/categoryFields";

const PAGE_SIZE = 30;
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


const ADMIN_EMAIL = "taiwo17@gmail.com";

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
  created_at?: string | null;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  status?: "active" | "paused" | "sold";
  active_until?: string | null;
  category?: string;
  subcategory?: string;
  details?: Record<string, unknown> | null;
  condition?: string;
  country?: string;
  city?: string;
  location?: string;
  search_text?: string | null;
  manufacturer?: string;
  part_number?: string;
  oem_number?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  engine?: string;
  listing_images?: ListingImage[];
  listing_store_categories?: {
    store_category_id: string;
  }[];
};

type Profile = {
  id: string;
  is_premium?: boolean | null;
  premium_until?: string | null;
};

type StoreCategory = {
  id: string;
  user_id: string;
  name: string;
  sort_order?: number | null;
};

type ClaimResponse = {
  success?: boolean;
  message?: string;
  premium_until?: string;
};

type InviteResponse = {
  success?: boolean;
  message?: string;
  invite_code?: string;
  premium_days?: number;
  expires_at?: string;
};


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

const inputClass =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-black/30 sm:text-sm";

const labelClass = "mb-2 block text-sm font-medium text-black/60";

const baseStatusButtonClass =
  "rounded-xl border px-3 py-2 text-sm font-medium transition";

function getStatusButtonClass(
  buttonStatus: "active" | "paused" | "sold",
  currentStatus: "active" | "paused" | "sold",
  expired: boolean
) {
  const effectiveStatus =
    expired && currentStatus === "active" ? "paused" : currentStatus;
  const isSelected = buttonStatus === effectiveStatus;

  if (!isSelected) {
    return `${baseStatusButtonClass} border-black/10 bg-white text-black hover:bg-black/[0.03]`;
  }

  if (buttonStatus === "active") {
    return `${baseStatusButtonClass} border-green-200 bg-green-100 text-green-700`;
  }

  if (buttonStatus === "paused") {
    return `${baseStatusButtonClass} border-yellow-200 bg-yellow-100 text-yellow-800`;
  }

  return `${baseStatusButtonClass} border-neutral-300 bg-neutral-900 text-white`;
}

function sortImages(images: ListingImage[]) {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

function buildPrefixSearchQuery(value: string) {
  const tokens = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return "";

  return tokens.map((token) => `${token}:*`).join(" & ");
}

function getListingImage(item: Listing) {
  const img = sortImages(item.listing_images || [])[0];

  return (
    img?.thumb_url ||
    img?.medium_url ||
    img?.original_url ||
    item.image ||
    ""
  );
}

function getStoragePathFromUrl(url?: string | null) {
  if (!url) return null;

  const marker = "/storage/v1/object/public/listing-images/";
  const index = url.indexOf(marker);

  if (index === -1) return null;

  const pathWithQuery = url.slice(index + marker.length);
  const cleanPath = pathWithQuery.split("?")[0];

  try {
    return decodeURIComponent(cleanPath);
  } catch {
    return cleanPath;
  }
}

function getDaysLeft(activeUntil?: string | null) {
  if (!activeUntil) return null;

  const now = new Date();
  const end = new Date(activeUntil);
  const diff = end.getTime() - now.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isPremiumActive(profile: Profile | null) {
  if (!profile?.is_premium || !profile.premium_until) return false;

  return new Date(profile.premium_until).getTime() > Date.now();
}

function parsePriceAmount(value: string) {
  const normalized = value
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
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

  const [profile, setProfile] = useState<Profile | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [claimingInvite, setClaimingInvite] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);

  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [newStoreCategoryName, setNewStoreCategoryName] = useState("");
  const [savingStoreCategory, setSavingStoreCategory] = useState(false);

  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
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

  const [editImages, setEditImages] = useState<ListingImage[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [editPreviewUrls, setEditPreviewUrls] = useState<string[]>([]);

  const [editCategory, setEditCategory] = useState("general");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editDetailCategory, setEditDetailCategory] = useState("");
  const [editDynamicFields, setEditDynamicFields] = useState<Record<string, string>>({});
  const [editStoreCategoryId, setEditStoreCategoryId] = useState("");
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


  useEffect(() => {
    const urls = editNewFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setEditPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [editNewFiles]);

  const editSelectedCategory = CATEGORY_TREE.find(
    (item) => item.value === editCategory
  );
  const editSubcategoryOptions = editSelectedCategory?.children || [];
  const editSelectedSubcategory = editSubcategoryOptions.find(
    (item) => item.value === editSubcategory
  );
  const editDetailCategoryOptions = (editSelectedSubcategory as any)?.children || [];
  const editActiveFields = getCategoryFields(editDetailCategory || editSubcategory);

  const premiumActive = isPremiumActive(profile);

  const activeListingsCount = listings.filter(
    (item) => (item.status || "active") === "active"
  ).length;

  const freeLimitReached = !premiumActive && activeListingsCount >= 50;

  const fetchStoreCategories = async (currentUserId: string) => {
    const { data, error } = await supabase
      .from("store_categories")
      .select("id, user_id, name, sort_order")
      .eq("user_id", currentUserId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching store sections:", error);
      setStoreCategories([]);
      return;
    }

    setStoreCategories((data || []) as StoreCategory[]);
  };

  const createStoreCategory = async () => {
    if (!userId) return;

    const cleanName = newStoreCategoryName.trim();

    if (!cleanName) {
      alert("Enter category name.");
      return;
    }

    setSavingStoreCategory(true);

    try {
      const { error } = await supabase.from("store_categories").insert({
        user_id: userId,
        name: cleanName,
        sort_order: storeCategories.length,
      });

      if (error) throw error;

      setNewStoreCategoryName("");
      await fetchStoreCategories(userId);
    } catch (error) {
      console.error("Error creating store section:", error);
      alert("Failed to create store section.");
    } finally {
      setSavingStoreCategory(false);
    }
  };

  const deleteStoreCategory = async (categoryId: string) => {
    if (!userId) return;

    const confirmed = window.confirm(
      "Delete this store section? Listings will remain, but this store section link will be removed."
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("store_categories")
      .delete()
      .eq("id", categoryId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting store section:", error);
      alert("Failed to delete store section.");
      return;
    }

    await fetchStoreCategories(userId);
  };

  const fetchProfile = async (currentUserId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, is_premium, premium_until")
      .eq("id", currentUserId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
      return;
    }

    setProfile((data || null) as Profile | null);
  };

  const buildListingsQuery = (currentUserId: string, from: number) => {
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("listings")
      .select(
        "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order), listing_store_categories(store_category_id)"
      )
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const searchQuery = buildPrefixSearchQuery(search);

    if (searchQuery) {
      query = query.filter("search_vector", "fts(simple)", searchQuery);
    }

    return query;
  };

  const fetchListings = async (currentUserId: string, from = 0) => {
    if (from === 0 && listings.length === 0) {
      setLoadingListings(true);
    }

    const { data, error } = await buildListingsQuery(currentUserId, from);

    if (error) {
      console.error("Error fetching user listings:", error);
      if (from === 0) setListings([]);
      setLoadingListings(false);
      setLoadingMore(false);
      return;
    }

    let loaded = (data || []) as Listing[];


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
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (loading) return;

    if (!userId) {
      setProfile(null);
      setListings([]);
      setLoadingListings(false);
      return;
    }

    fetchProfile(userId);
    fetchStoreCategories(userId);

    const timer = setTimeout(() => {
      fetchListings(userId, 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [userId, loading, debouncedSearch, filter]);

  const claimPremiumInvite = async () => {
    if (!userId) return;

    const cleanCode = inviteCode.trim();

    if (!cleanCode) {
      setClaimMessage("Enter invite code.");
      return;
    }

    setClaimingInvite(true);
    setClaimMessage("");

    try {
      const { data, error } = await supabase.rpc("claim_premium_invite", {
        input_code: cleanCode,
      });

      if (error) throw error;

      const result = data as ClaimResponse;

      if (!result?.success) {
        setClaimMessage(result?.message || "Invite could not be claimed.");
        return;
      }

      setClaimMessage("Premium activated.");
      setInviteCode("");

      await fetchProfile(userId);
    } catch (error) {
      console.error("Premium invite claim failed:", error);
      setClaimMessage("Premium invite claim failed.");
    } finally {
      setClaimingInvite(false);
    }
  };

  const createPremiumInvite = async () => {
    if (!userId) return;

    setCreatingInvite(true);
    setGeneratedCode("");

    try {
      const { data, error } = await supabase.rpc("create_premium_invite", {
        premium_days_input: 30,
        expires_in_days_input: 30,
      });

      if (error) throw error;

      const result = data as InviteResponse;

      if (!result?.success || !result.invite_code) {
        alert(result?.message || "Failed to create invite.");
        return;
      }

      setGeneratedCode(result.invite_code);
    } catch (error) {
      console.error("Error creating invite:", error);
      alert("Failed to create invite.");
    } finally {
      setCreatingInvite(false);
    }
  };

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

    setEditImages(sortImages(item.listing_images || []));
    setEditNewFiles([]);

    const itemDetails = (item.details || {}) as Record<string, unknown>;

    setEditCategory(item.category || "general");
    setEditSubcategory(item.subcategory || "");
    setEditDetailCategory(
      typeof itemDetails.detailCategory === "string"
        ? itemDetails.detailCategory
        : ""
    );

    const dynamicValues: Record<string, string> = {};
    Object.entries(itemDetails).forEach(([key, value]) => {
      if (
        typeof value === "string" &&
        ![
          "manufacturer",
          "partNumber",
          "oemNumber",
          "vehicleBrand",
          "vehicleModel",
          "vehicleYear",
          "engine",
          "detailCategory",
        ].includes(key)
      ) {
        dynamicValues[key] = value;
      }
    });
    setEditDynamicFields(dynamicValues);
    setEditStoreCategoryId(
      item.listing_store_categories?.[0]?.store_category_id || ""
    );

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
    setSavingEdit(false);

    setEditTitle("");
    setEditDescription("");
    setEditPrice("");
    setEditStatus("active");

    setEditImages([]);
    setEditNewFiles([]);

    setEditCategory("general");
    setEditSubcategory("");
    setEditDetailCategory("");
    setEditDynamicFields({});
    setEditStoreCategoryId("");
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

  const handleNewImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;

    const validFiles: File[] = [];

    for (const file of selected) {
      const validationError = validateSourceImageFile(file);

      if (validationError) {
        alert(`${file.name}: ${validationError}`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const currentTotal = editImages.length + editNewFiles.length;
    const remainingSlots = MAX_IMAGES - currentTotal;

    if (remainingSlots <= 0) {
      alert(`Maximum ${MAX_IMAGES} images allowed.`);
      event.target.value = "";
      return;
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);

    if (validFiles.length > remainingSlots) {
      alert(`Only ${remainingSlots} more image(s) can be added.`);
    }

    setEditNewFiles((prev) => [...prev, ...filesToAdd]);
    event.target.value = "";
  };

  const removeNewImage = (index: number) => {
    setEditNewFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const deleteStorageFile = async (image: ListingImage) => {
    const path =
      getStoragePathFromUrl(image.original_url) ||
      getStoragePathFromUrl(image.medium_url) ||
      getStoragePathFromUrl(image.thumb_url);

    if (!path) return;

    const { error } = await supabase.storage.from("listing-images").remove([path]);

    if (error) {
      console.warn("Storage file delete failed:", error);
    }
  };

  const deleteEditImage = async (imageId: string) => {
    if (!editingId || !userId) return;

    if (editImages.length + editNewFiles.length <= 1) {
      alert("A listing should have at least one image.");
      return;
    }

    const imageToDelete = editImages.find((img) => img.id === imageId);

    const confirmed = window.confirm("Delete this image?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("listing_images")
      .delete()
      .eq("id", imageId)
      .eq("user_id", userId);

    if (error) {
      console.error(error);
      alert("Failed to delete image.");
      return;
    }

    if (imageToDelete) {
      await deleteStorageFile(imageToDelete);
    }

    const remaining = editImages.filter((img) => img.id !== imageId);

    if (remaining.length > 0 && !remaining.some((img) => img.is_primary)) {
      const first = remaining[0];

      await supabase
        .from("listing_images")
        .update({ is_primary: true, sort_order: 0 })
        .eq("id", first.id)
        .eq("user_id", userId);

      remaining[0] = { ...first, is_primary: true, sort_order: 0 };
    }

    setEditImages(sortImages(remaining));
  };

  const setEditImagePrimary = async (imageId: string) => {
    if (!editingId || !userId) return;

    const { error: clearError } = await supabase
      .from("listing_images")
      .update({ is_primary: false })
      .eq("listing_id", editingId)
      .eq("user_id", userId);

    if (clearError) {
      console.error(clearError);
      alert("Failed to update images.");
      return;
    }

    const { error } = await supabase
      .from("listing_images")
      .update({ is_primary: true, sort_order: 0 })
      .eq("id", imageId)
      .eq("user_id", userId);

    if (error) {
      console.error(error);
      alert("Failed to set primary image.");
      return;
    }

    setEditImages((prev) =>
      sortImages(
        prev.map((img) => ({
          ...img,
          is_primary: img.id === imageId,
          sort_order: img.id === imageId ? 0 : img.sort_order,
        }))
      )
    );
  };

  const moveEditImage = (imageId: string, direction: "up" | "down") => {
    setEditImages((prev) => {
      const sorted = sortImages(prev);
      const index = sorted.findIndex((img) => img.id === imageId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) {
        return sorted;
      }

      const next = [...sorted];
      const current = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = current;

      return next.map((img, imgIndex) => ({
        ...img,
        sort_order: imgIndex,
        is_primary: imgIndex === 0,
      }));
    });
  };

  const uploadNewImages = async () => {
    if (!editingId || !userId || editNewFiles.length === 0) return [];

    const existingCount = editImages.length;
    const newRows = [];

    for (let index = 0; index < editNewFiles.length; index += 1) {
      const resizedFile = await resizeImage(editNewFiles[index]);
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
        sort_order: existingCount + index,
        is_primary: existingCount === 0 && index === 0,
      });
    }

    if (newRows.length === 0) return [];

    const { data, error } = await supabase
      .from("listing_images")
      .insert(newRows)
      .select("id, thumb_url, medium_url, original_url, is_primary, sort_order");

    if (error) throw error;

    return (data || []) as ListingImage[];
  };

  const saveEdit = async () => {
    if (savingEdit) return;
    if (!editingId || !userId) return;

    if (!editTitle.trim() || !editDescription.trim() || !editPrice.trim()) {
      alert("Please fill title, description and price.");
      return;
    }

    setSavingEdit(true);

    try {
      const uploadedImages = await uploadNewImages();
      const allImages = sortImages([...editImages, ...uploadedImages]);

      for (let index = 0; index < allImages.length; index += 1) {
        const img = allImages[index];

        await supabase
          .from("listing_images")
          .update({
            sort_order: index,
            is_primary: index === 0,
          })
          .eq("id", img.id)
          .eq("user_id", userId);
      }

      const primaryImage =
        allImages[0]?.original_url ||
        allImages[0]?.medium_url ||
        allImages[0]?.thumb_url ||
        null;

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
        editSubcategory,
        editDetailCategory,
        ...Object.values(editDynamicFields),
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
          price_amount: parsePriceAmount(editPrice),
          status: editStatus,
          image: primaryImage,

          category: editCategory,
          subcategory: editSubcategory.trim(),
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
            detailCategory: editDetailCategory,
            ...editDynamicFields,
          },

          search_text: searchText,
        })
        .eq("id", editingId)
        .eq("user_id", userId);

      if (error) throw error;

      await supabase
        .from("listing_store_categories")
        .delete()
        .eq("listing_id", editingId);

      if (editStoreCategoryId) {
        const { error: storeCategoryError } = await supabase
          .from("listing_store_categories")
          .insert({
            listing_id: editingId,
            store_category_id: editStoreCategoryId,
          });

        if (storeCategoryError) throw storeCategoryError;
      }

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

    const updates: {
      status: "active" | "paused" | "sold";
      active_until?: string;
    } = { status };

    if (status === "active") {
      const item = listings.find((listing) => listing.id === id);
      const daysLeft = getDaysLeft(item?.active_until);
      const expired = daysLeft !== null && daysLeft <= 0;

      if (expired || !item?.active_until) {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + 90);
        updates.active_until = newDate.toISOString();
      }
    }

    const { error } = await supabase
      .from("listings")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating status:", error);
      alert("Failed to update listing status.");
      return;
    }

    await fetchListings(userId, 0);
  };

  const reactivateListing = async (id: number) => {
    if (!userId) return;

    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 90);

    const { error } = await supabase
      .from("listings")
      .update({
        status: "active",
        active_until: newDate.toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error reactivating listing:", error);
      alert("Failed to reactivate listing.");
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

    const { data: imageRows, error: imageLoadError } = await supabase
      .from("listing_images")
      .select("id, thumb_url, medium_url, original_url")
      .eq("listing_id", id)
      .eq("user_id", userId);

    if (imageLoadError) {
      console.error("Error loading images before delete:", imageLoadError);
      alert("Failed to delete listing images.");
      return;
    }

    const imagesToDelete = (imageRows || []) as ListingImage[];

    const storagePaths = imagesToDelete
      .map(
        (img) =>
          getStoragePathFromUrl(img.original_url) ||
          getStoragePathFromUrl(img.medium_url) ||
          getStoragePathFromUrl(img.thumb_url)
      )
      .filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("listing-images")
        .remove(storagePaths);

      if (storageError) {
        console.warn("Some storage files were not deleted:", storageError);
      }
    }

    const { error: imageDeleteError } = await supabase
      .from("listing_images")
      .delete()
      .eq("listing_id", id)
      .eq("user_id", userId);

    if (imageDeleteError) {
      console.error("Error deleting image rows:", imageDeleteError);
      alert("Failed to delete image rows.");
      return;
    }

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
              {freeLimitReached ? (
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      "Free account limit reached. Pause or sell listings until active listings are under 50, or activate Premium."
                    )
                  }
                  className="rounded-2xl bg-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700"
                >
                  + Add listing
                </button>
              ) : (
                <Link
                  href="/sell"
                  className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white"
                >
                  + Add listing
                </Link>
              )}

              <Link
                href="/"
                className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium"
              >
                Back to marketplace
              </Link>
            </div>
          </div>
        </header>

        <section
          className={`rounded-[28px] p-5 shadow-sm sm:p-6 ${
            premiumActive
              ? "border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-white to-white shadow-[0_6px_20px_rgba(251,191,36,0.15)]"
              : "bg-white"
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
                Account
              </p>

              <h2 className="text-2xl font-semibold tracking-tight">
                {premiumActive ? "Premium account ✨" : "Free account"}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
                {premiumActive
                  ? `Premium active until ${formatDate(profile?.premium_until)}.`
                  : `Free account can have up to 50 active listings. You currently have ${activeListingsCount} active listings.`}
              </p>

              {!premiumActive && activeListingsCount >= 50 && (
                <p className="mt-2 text-sm font-medium text-yellow-700">
                  Free listing limit reached. Existing listings stay active until
                  their 90-day expiry, but new listings need Premium or fewer than
                  50 active listings.
                </p>
              )}
            </div>

            <div className="w-full max-w-md">
              <label className={labelClass}>Premium invite code</label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code"
                  className={inputClass}
                />

                <button
                  type="button"
                  onClick={claimPremiumInvite}
                  disabled={claimingInvite}
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {claimingInvite ? "Activating..." : "Activate"}
                </button>
              </div>

              {claimMessage && (
                <p className="mt-2 text-sm text-black/55">{claimMessage}</p>
              )}

              {user?.email === ADMIN_EMAIL && (
                <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                  <p className="mb-2 text-sm font-semibold">Admin</p>

                  <button
                    type="button"
                    onClick={createPremiumInvite}
                    disabled={creatingInvite}
                    className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {creatingInvite ? "Creating..." : "Generate premium invite"}
                  </button>

                  {generatedCode && (
                    <div className="mt-3 rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">
                      Code: {generatedCode}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
                Store sections
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">
                Your store layout
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
                These categories are only for your own store. Marketplace
                categories stay separate.
              </p>
            </div>

            <div className="w-full max-w-xl">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={newStoreCategoryName}
                  onChange={(e) => setNewStoreCategoryName(e.target.value)}
                  placeholder="Example: Vegetables, Rugs, Earrings"
                  className={inputClass}
                />

                <button
                  type="button"
                  onClick={createStoreCategory}
                  disabled={savingStoreCategory}
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {savingStoreCategory ? "Adding..." : "Add category"}
                </button>
              </div>

              {storeCategories.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {storeCategories.map((category) => (
                    <span
                      key={category.id}
                      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-sm"
                    >
                      {category.name}

                      <button
                        type="button"
                        onClick={() => deleteStoreCategory(category.id)}
                        className="text-black/35 hover:text-red-600"
                        aria-label={`Delete ${category.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-black/45">
                  No store sections yet.
                </p>
              )}
            </div>
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

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
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

                <section className="rounded-[24px] border border-black/8 bg-black/[0.015] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight">
                        Images
                      </h3>
                      <p className="mt-1 text-sm text-black/50">
                        Maximum {MAX_IMAGES} images. First image is primary.
                      </p>
                    </div>

                    <span className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/55">
                      {editImages.length + editNewFiles.length}/{MAX_IMAGES}
                    </span>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleNewImages}
                    className={inputClass}
                  />

                  {editImages.length > 0 && (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      {editImages.map((img, index) => {
                        const imageUrl =
                          img.thumb_url ||
                          img.medium_url ||
                          img.original_url ||
                          "";

                        return (
                          <div
                            key={img.id}
                            className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                          >
                            {imageUrl ? (
                              <img decoding="async"
                                src={imageUrl}
                                alt="Listing image"
                                className="h-40 w-full object-cover"
                              />
                            ) : (
                              <div className="h-40 bg-neutral-100" />
                            )}

                            <div className="flex flex-wrap gap-2 p-3">
                              {index === 0 && (
                                <span className="rounded-xl bg-green-100 px-3 py-2 text-xs text-green-700">
                                  Primary
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => moveEditImage(img.id, "up")}
                                className="rounded-xl border border-black/10 px-3 py-2 text-xs"
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                onClick={() => moveEditImage(img.id, "down")}
                                className="rounded-xl border border-black/10 px-3 py-2 text-xs"
                              >
                                ↓
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditImagePrimary(img.id)}
                                className="rounded-xl border border-black/10 px-3 py-2 text-xs"
                              >
                                Set primary
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteEditImage(img.id)}
                                className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {editNewFiles.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-3 text-sm font-medium text-black/60">
                        New images to upload
                      </p>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {editNewFiles.map((file, index) => {
                          const previewUrl = editPreviewUrls[index];

                          return (
                            <div
                              key={`${file.name}-${index}`}
                              className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                            >
                              <img decoding="async"
                                src={previewUrl}
                                alt="New image preview"
                                className="h-40 w-full object-cover"
                              />

                              <div className="p-3">
                                <button
                                  type="button"
                                  onClick={() => removeNewImage(index)}
                                  className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-600"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => {
                        setEditCategory(e.target.value);
                        setEditSubcategory("");
                        setEditDetailCategory("");
                        setEditDynamicFields({});
                      }}
                      className={inputClass}
                    >
                      {CATEGORY_TREE.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
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

                {editSubcategoryOptions.length > 0 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Subcategory</label>
                      <select
                        value={editSubcategory}
                        onChange={(e) => {
                          setEditSubcategory(e.target.value);
                          setEditDetailCategory("");
                          setEditDynamicFields({});
                        }}
                        className={inputClass}
                      >
                        <option value="">Select subcategory</option>

                        {editSubcategoryOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {editDetailCategoryOptions.length > 0 && (
                      <div>
                        <label className={labelClass}>Detailed category</label>
                        <select
                          value={editDetailCategory}
                          onChange={(e) => {
                            setEditDetailCategory(e.target.value);
                            setEditDynamicFields({});
                          }}
                          className={inputClass}
                        >
                          <option value="">Select detailed category</option>

                          {editDetailCategoryOptions.map(
                            (item: { value: string; label: string }) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {storeCategories.length > 0 && (
                  <div>
                    <label className={labelClass}>Store section</label>
                    <select
                      value={editStoreCategoryId}
                      onChange={(e) => setEditStoreCategoryId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">No store section</option>

                      {storeCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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

                {editActiveFields.length > 0 && (
                  <section className="rounded-[24px] border border-black/8 bg-black/[0.015] p-5">
                    <h3 className="mb-5 text-xl font-semibold tracking-tight">
                      Category specific details
                    </h3>

                    <div className="space-y-5">
                      {editActiveFields.map((field) => {
                        const maxLength = getFieldMaxLength(field.key);
                        const isLongText = LONG_TEXT_FIELD_KEYS.has(field.key);
                        const value = editDynamicFields[field.key] || "";

                        return (
                          <div key={field.key}>
                            <label className={labelClass}>
                              {field.label}
                            </label>

                            {isLongText ? (
                              <textarea
                                rows={5}
                                maxLength={maxLength}
                                value={value}
                                onChange={(e) =>
                                  setEditDynamicFields((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                className={`${inputClass} resize-y break-words`}
                              />
                            ) : (
                              <input
                                maxLength={maxLength}
                                value={value}
                                onChange={(e) =>
                                  setEditDynamicFields((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                className={inputClass}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

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
                  {editImages[0] ? (
                    <img decoding="async"
                      src={
                        editImages[0].medium_url ||
                        editImages[0].thumb_url ||
                        editImages[0].original_url ||
                        ""
                      }
                      alt="Preview"
                      className="h-64 w-full object-cover"
                    />
                  ) : editNewFiles[0] ? (
                    <img decoding="async"
                      src={editPreviewUrls[0]}
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
                </div>
              </aside>
            </div>
          </section>
        )}

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
                const daysLeft = getDaysLeft(item.active_until);
                const expired = daysLeft !== null && daysLeft <= 0;
                const currentStatus = item.status || "active";

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-[28px] bg-white p-4 shadow-sm"
                  >
                    <Link href={`/listing/${item.id}`}>
                      <div className="cursor-pointer">
                        <div className="mb-4 overflow-hidden rounded-2xl bg-neutral-100">
                          {imageUrl ? (
                            <img decoding="async"
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

                    <div
                      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                        expired && currentStatus === "active"
                          ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                          : currentStatus === "sold"
                          ? "border-neutral-200 bg-neutral-100 text-neutral-700"
                          : currentStatus === "paused"
                          ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                          : "border-green-200 bg-green-50 text-green-700"
                      }`}
                    >
                      {expired && currentStatus === "active" ? (
                        <div className="font-medium">Expired / paused</div>
                      ) : currentStatus === "sold" ? (
                        <div className="font-medium">Sold</div>
                      ) : currentStatus === "paused" ? (
                        <div className="font-medium">Paused</div>
                      ) : daysLeft !== null ? (
                        <div className="font-medium">{daysLeft} days left</div>
                      ) : (
                        <div className="font-medium">Active</div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        onClick={() => updateStatus(item.id, "active")}
                        className={getStatusButtonClass(
                          "active",
                          currentStatus,
                          expired
                        )}
                      >
                        Active
                      </button>

                      <button
                        onClick={() => updateStatus(item.id, "paused")}
                        className={getStatusButtonClass(
                          "paused",
                          currentStatus,
                          expired
                        )}
                      >
                        Pause
                      </button>

                      <button
                        onClick={() => updateStatus(item.id, "sold")}
                        className={getStatusButtonClass(
                          "sold",
                          currentStatus,
                          expired
                        )}
                      >
                        Sold
                      </button>

                      {expired && currentStatus === "active" && (
                        <button
                          onClick={() => reactivateListing(item.id)}
                          className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white"
                        >
                          Reactivate 90 days
                        </button>
                      )}

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
