"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ListingResult = {
  title: string;
  description: string;
  price: string;
};

export default function SellPage() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<ListingResult | null>(null);
  const [published, setPublished] = useState(false);
  const router = useRouter();

  const handleGenerate = () => {
    setResult({
      title: "BMW E39 headlights",
      description:
        "Used headlights in good condition. Fits BMW E39 models. Clean and ready to install.",
      price: "60€",
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-black">
      <div className="mx-auto max-w-3xl">
        {!result && (
          <>
            <h1 className="mb-3 text-4xl font-semibold tracking-tight">
              Add your item
            </h1>

            <p className="mb-10 text-black/60">
              Upload a photo or describe what you want to sell.
            </p>

            <div className="rounded-3xl border border-black/10 p-6 shadow-sm">
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium">
                  Upload photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full rounded-xl border border-black/10 p-3"
                />
              </div>

              {image && (
                <div className="mb-6">
                  <img
                    src={image}
                    alt="Preview"
                    className="h-48 w-full rounded-2xl object-cover"
                  />
                </div>
              )}

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium">
                  Describe your item
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="For example: BMW E39 headlights, used, good condition"
                  className="min-h-[140px] w-full rounded-xl border border-black/10 p-3 outline-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                className="rounded-2xl bg-green-500 px-6 py-3 text-white transition hover:bg-green-600"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="rounded-3xl border border-black/10 p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Your listing ✨</h2>

            {image && (
              <div className="mb-6">
                <img
                  src={image}
                  alt="Listing"
                  className="h-64 w-full rounded-2xl object-cover"
                />
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-black/50">Title</p>
              <p className="text-lg font-medium">{result.title}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-black/50">Description</p>
              <p>{result.description}</p>
            </div>

            <div className="mb-6">
              <p className="text-sm text-black/50">Suggested price</p>
              <p className="text-lg font-medium">{result.price}</p>
            </div>

            <button
              onClick={() => {
                const existing = JSON.parse(
                  localStorage.getItem("listings") || "[]"
                );

                const newListing = {
                  id: Date.now(),
                  title: result.title,
                  description: result.description,
                  price: result.price,
                  image: image,
                  seller: {
                    name: "Taivo’s Page",
                    bio: "Personal seller on Selqiro",
                    messenger: "https://m.me/",
                    instagram: "https://instagram.com/",
                    whatsapp: "https://wa.me/",
                    email: "mailto:seller@example.com",
                  },
                };

                localStorage.setItem(
                  "listings",
                  JSON.stringify([newListing, ...existing])
                );

                setPublished(true);

                setTimeout(() => {
                  router.push("/my-page");
                }, 1000);
              }}
              className="rounded-2xl bg-green-500 px-6 py-3 text-white"
            >
              Publish
            </button>

            {published && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
                Your listing is live 🎉
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}