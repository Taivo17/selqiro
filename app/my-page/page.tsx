"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

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

  manufacturer?: string;
  part_number?: string;
  oem_number?: string;

  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  engine?: string;
};

export default function MyPage() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;

  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "paused" | "sold">("active");

  const [editCategory, setEditCategory] = useState("general");
  const [editCondition, setEditCondition] = useState("used");
  const [editCountry, setEditCountry] = useState("Estonia");
  const [editCity, setEditCity] = useState("");

  // 🆕 TECH
  const [editManufacturer, setEditManufacturer] = useState("");
  const [editPartNumber, setEditPartNumber] = useState("");
  const [editOemNumber, setEditOemNumber] = useState("");

  // 🆕 VEHICLE
  const [editBrand, setEditBrand] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editEngine, setEditEngine] = useState("");

  const fetchListings = async (uid: string) => {
    setLoadingListings(true);

    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", uid)
      .order("id", { ascending: false });

    setListings((data || []) as Listing[]);
    setLoadingListings(false);
  };

  useEffect(() => {
    if (!loading && userId) {
      fetchListings(userId);
    }
  }, [userId, loading]);

  const startEdit = (item: Listing) => {
    setEditingId(item.id);

    setEditTitle(item.title || "");
    setEditDescription(item.description || "");
    setEditPrice(item.price || "");
    setEditStatus(item.status || "active");

    setEditCategory(item.category || "general");
    setEditCondition(item.condition || "used");
    setEditCountry(item.country || "Estonia");
    setEditCity(item.city || "");

    // 🆕
    setEditManufacturer(item.manufacturer || "");
    setEditPartNumber(item.part_number || "");
    setEditOemNumber(item.oem_number || "");

    setEditBrand(item.vehicle_brand || "");
    setEditModel(item.vehicle_model || "");
    setEditYear(item.vehicle_year || "");
    setEditEngine(item.engine || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId || !userId) return;

    const location =
      editCity && editCountry
        ? `${editCountry} • ${editCity}`
        : editCountry || editCity || "";

    await supabase
      .from("listings")
      .update({
        title: editTitle,
        description: editDescription,
        price: editPrice,
        status: editStatus,
        category: editCategory,
        condition: editCondition,
        country: editCountry,
        city: editCity,
        location,

        manufacturer: editManufacturer,
        part_number: editPartNumber,
        oem_number: editOemNumber,

        vehicle_brand: editBrand,
        vehicle_model: editModel,
        vehicle_year: editYear,
        engine: editEngine,
      })
      .eq("id", editingId)
      .eq("user_id", userId);

    cancelEdit();
    fetchListings(userId);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="min-h-screen bg-[#f8f8f6] p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <h1 className="text-3xl font-semibold">My listings</h1>

        {editingId && (
          <div className="bg-white p-6 rounded-2xl space-y-4 shadow-sm">

            <h2 className="text-2xl font-semibold">Update your item</h2>

            <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="input"/>
            <textarea value={editDescription} onChange={e=>setEditDescription(e.target.value)} className="input"/>
            <input value={editPrice} onChange={e=>setEditPrice(e.target.value)} className="input"/>

            <select value={editCondition} onChange={e=>setEditCondition(e.target.value)} className="input">
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>

            <input value={editCity} onChange={e=>setEditCity(e.target.value)} className="input"/>

            {/* 🔧 TECH */}
            <h3 className="text-lg font-semibold mt-4">Technical info</h3>

            <input placeholder="Manufacturer" value={editManufacturer} onChange={e=>setEditManufacturer(e.target.value)} className="input"/>
            <input placeholder="Part number" value={editPartNumber} onChange={e=>setEditPartNumber(e.target.value)} className="input"/>
            <input placeholder="OEM number" value={editOemNumber} onChange={e=>setEditOemNumber(e.target.value)} className="input"/>

            {/* 🚗 VEHICLE */}
            <h3 className="text-lg font-semibold mt-4">Vehicle fitment</h3>

            <input placeholder="Brand" value={editBrand} onChange={e=>setEditBrand(e.target.value)} className="input"/>
            <input placeholder="Model" value={editModel} onChange={e=>setEditModel(e.target.value)} className="input"/>
            <input placeholder="Year" value={editYear} onChange={e=>setEditYear(e.target.value)} className="input"/>
            <input placeholder="Engine" value={editEngine} onChange={e=>setEditEngine(e.target.value)} className="input"/>

            <div className="flex gap-3">
              <button onClick={saveEdit} className="btn-black">Save</button>
              <button onClick={cancelEdit} className="btn-white">Cancel</button>
            </div>

          </div>
        )}

        {loadingListings ? (
          <div>Loading...</div>
        ) : (
          listings.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p>{item.price}</p>

              <button
                onClick={() => startEdit(item)}
                className="mt-2 text-sm underline"
              >
                Edit listing
              </button>
            </div>
          ))
        )}

      </div>
    </main>
  );
}