"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SellPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [status, setStatus] = useState("active");

  const [category, setCategory] = useState("general");
  const [condition, setCondition] = useState("used");
  const [location, setLocation] = useState("");

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!title || !description || !price) {
      alert("Please fill required fields.");
      return;
    }

    const newListing = {
      id: Date.now(),
      title,
      description,
      price,
      image,
      status,
      category,
      condition,
      location,
    };

    const existing = JSON.parse(localStorage.getItem("listings") || "[]");
    const updated = [newListing, ...existing];

    localStorage.setItem("listings", JSON.stringify(updated));
    router.push("/my-page");
  };

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex gap-3">
          <Link href="/" className="rounded-2xl border px-4 py-2">
            Back
          </Link>
        </div>

        <h1 className="mb-6 text-4xl font-semibold">Create listing</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT */}
          <div className="space-y-4">
            <input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />

            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="general">General</option>
              <option value="cars">Cars</option>
              <option value="parts">Parts</option>
              <option value="electronics">Electronics</option>
            </select>

            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>

            <input
              placeholder="Location (city)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />

            <input type="file" onChange={handleImageUpload} />

            <button
              onClick={handleSubmit}
              className="w-full rounded-xl bg-black py-3 text-white"
            >
              Publish
            </button>
          </div>

          {/* RIGHT PREVIEW */}
          <div className="rounded-2xl border p-4">
            <div className="h-48 bg-gray-100">
              {image && (
                <img src={image} className="h-full w-full object-cover" />
              )}
            </div>

            <h2 className="mt-4 text-xl font-semibold">
              {title || "Title preview"}
            </h2>

            <p className="text-gray-500">
              {description || "Description preview"}
            </p>

            <p className="mt-2 font-semibold">
              {price || "0€"}
            </p>

            <div className="mt-2 text-sm text-gray-500">
              {category} • {condition} • {location}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}