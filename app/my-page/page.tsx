"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Listing = {
  id: number;
  title: string;
  description: string;
  price: string;
  image?: string;
  status?: "active" | "paused" | "sold";
  category?: string;
  condition?: string;
  location?: string;
  country?: string;
  city?: string;
};

export default function MyPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "sold">("all");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "paused" | "sold">("active");
  const [editImage, setEditImage] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [editCondition, setEditCondition] = useState("used");
  const [editCountry, setEditCountry] = useState("Estonia");
  const [editCity, setEditCity] = useState("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("listings") || "[]");
    setListings(stored);
  }, []);

  const saveListings = (updated: Listing[]) => {
    setListings(updated);
    localStorage.setItem("listings", JSON.stringify(updated));
  };

  const updateStatus = (id: number, status: "active" | "paused" | "sold") => {
    const updated = listings.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    saveListings(updated);
  };

  const deleteListing = (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this listing?");
    if (!confirmed) return;

    const updated = listings.filter((item) => item.id !== id);
    saveListings(updated);

    if (editingId === id) {
      cancelEdit();
    }
  };

  const startEdit = (item: Listing) => {
    setEditingId(item.id);
    setEditTitle(item.title || "");
    setEditDescription(item.description || "");
    setEditPrice(item.price || "");
    setEditStatus((item.status as "active" | "paused" | "sold") || "active");
    setEditImage(item.image || "");
    setEditCategory(item.category || "general");
    setEditCondition(item.condition || "used");
    setEditCountry(item.country || "Estonia");
    setEditCity(item.city || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditPrice("");
    setEditStatus("active");
    setEditImage("");
    setEditCategory("general");
    setEditCondition("used");
    setEditCountry("Estonia");
    setEditCity("");
  };

  const saveEdit = () => {
    if (!editingId) return;

    if (!editTitle || !editDescription || !editPrice) {
      alert("Please fill title, description and price.");
      return;
    }

    const cleanCountry = editCountry.trim();
    const cleanCity = editCity.trim();

    const location =
      cleanCity && cleanCountry
        ? `${cleanCountry} • ${cleanCity}`
        : cleanCountry || cleanCity || "";

    const updated = listings.map((item) =>
      item.id === editingId
        ? {
            ...item,
            title: editTitle,
            description: editDescription,
            price: editPrice,
            status: editStatus,
            image: editImage,
            category: editCategory,
            condition: editCondition,
            country: cleanCountry,
            city: cleanCity,
            location,
          }
        : item
    );

    saveListings(updated);
    cancelEdit();
  };

  const handleEditImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      const currentStatus = item.status || "active";
      const matchesFilter = filter === "all" ? true : currentStatus === filter;

      return matchesSearch && matchesFilter;
    });
  }, [listings, search, filter]);

  const activeCount = listings.filter((item) => (item.status || "active") === "active").length;
  const pausedCount = listings.filter((item) => item.status === "paused").length;
  const soldCount = listings.filter((item) => item.status === "sold").length;

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[36px] border border-black/8 bg-white px-6 py-6 shadow-sm sm:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-black/40">
                Selqiro Store
              </p>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#111827] text-xl font-semibold text-white">
                  T
                </div>
                <div>
                  <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                    Taivo Garage
                  </h1>
                  <p className="mt-2 text-base text-black/60">
                    Personal store for parts, tools and useful finds.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-black/55">
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  Personal store
                </span>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  Private seller
                </span>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2">
                  Live preview
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/sell"
                className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              >
                + Add listing
              </Link>

              <Link
                href="/"
                className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
              >
                Back to marketplace
              </Link>
            </div>
          </div>
        </header>

        {editingId && (
          <section className="mb-8 rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
                  Edit listing
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Update your item
                </h2>
              </div>

              <button
                onClick={cancelEdit}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Description
                  </label>
                  <textarea
                    rows={6}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Price
                  </label>
                  <input
                    type="text"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  >
                    <option value="general">General</option>
                    <option value="cars">Cars</option>
                    <option value="parts">Parts</option>
                    <option value="electronics">Electronics</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Condition
                  </label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as "active" | "paused" | "sold")
                    }
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Country
                    </label>
                    <select
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
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
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      City
                    </label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Change image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageUpload}
                    className="block w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                  />
                </div>

                <button
                  onClick={saveEdit}
                  className="w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Save changes
                </button>
              </div>

              <aside className="rounded-[28px] border border-black/8 bg-white p-4">
                <div className="overflow-hidden rounded-2xl bg-neutral-100">
                  {editImage ? (
                    <img
                      src={editImage}
                      alt="Preview"
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="h-64 w-full bg-neutral-100" />
                  )}
                </div>

                <div className="mt-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {editTitle || "Listing title"}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        editStatus === "active"
                          ? "bg-green-100 text-green-700"
                          : editStatus === "paused"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      {editStatus}
                    </span>
                  </div>

                  <p className="line-clamp-3 text-sm leading-6 text-black/60">
                    {editDescription || "Listing description preview."}
                  </p>

                  <p className="mt-4 text-2xl font-semibold">{editPrice || "0€"}</p>

                  <div className="mt-3 text-sm text-black/45">
                    {editCategory} • {editCondition} • {editCountry}
                    {editCity ? ` • ${editCity}` : ""}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}

        <section className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/45">All listings</p>
            <p className="mt-2 text-4xl font-semibold">{listings.length}</p>
          </div>

          <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/45">Active</p>
            <p className="mt-2 text-4xl font-semibold">{activeCount}</p>
          </div>

          <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/45">Paused / Sold</p>
            <p className="mt-2 text-4xl font-semibold">{pausedCount + soldCount}</p>
          </div>
        </section>

        <section className="mb-6 rounded-[32px] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
              Management
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Search and filter your listings
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <input
              type="text"
              placeholder="Search by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
            />

            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as "all" | "active" | "paused" | "sold")
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </section>

        <section className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">
            Listings
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Manage your items</h2>
        </section>

        {filteredListings.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-black/10 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-medium">No matching listings</p>
            <p className="mt-2 text-black/55">
              Try another search or filter, or add a new listing.
            </p>

            <Link
              href="/sell"
              className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Create listing
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-[30px] border border-black/8 bg-white p-4 shadow-sm"
              >
                <Link href={`/listing/${item.id}`}>
                  <div className="cursor-pointer">
                    <div className="mb-4 overflow-hidden rounded-2xl bg-neutral-100">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-52 w-full object-cover"
                        />
                      ) : (
                        <div className="h-52 w-full bg-neutral-100" />
                      )}
                    </div>

                    <div className="mb-4 flex items-start justify-between gap-3">
                      <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                          (item.status || "active") === "active"
                            ? "bg-green-100 text-green-700"
                            : item.status === "paused"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-neutral-200 text-neutral-700"
                        }`}
                      >
                        {item.status || "active"}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-sm leading-6 text-black/60">
                      {item.description}
                    </p>

                    <p className="mt-4 text-2xl font-semibold">{item.price}</p>

                    <div className="mt-3 text-sm text-black/45">
                      {item.category || "general"} • {item.condition || "used"} •{" "}
                      {item.country || "No country"}
                      {item.city ? ` • ${item.city}` : ""}
                    </div>
                  </div>
                </Link>

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    title="Mark active"
                    onClick={() => updateStatus(item.id, "active")}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm transition hover:bg-black/[0.03]"
                  >
                    ✓
                  </button>

                  <button
                    title="Pause"
                    onClick={() => updateStatus(item.id, "paused")}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm transition hover:bg-black/[0.03]"
                  >
                    ⏸
                  </button>

                  <button
                    title="Mark as sold"
                    onClick={() => updateStatus(item.id, "sold")}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm transition hover:bg-black/[0.03]"
                  >
                    ✔
                  </button>

                  <button
                    title="Edit listing"
                    onClick={() => startEdit(item)}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm transition hover:bg-black/[0.03]"
                  >
                    ✎
                  </button>

                  <button
                    title="Delete listing"
                    onClick={() => deleteListing(item.id)}
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                  >
                    🗑
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}