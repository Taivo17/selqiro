"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Listing = {
  id: number;
  title: string;
  description: string;
  price: string;
  image?: string | null;
  status?: "active" | "paused" | "sold";
  category?: string;
  condition?: string;
  location?: string;
};

export default function Home() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");

  const correctPassword = "selqiro123";

  useEffect(() => {
    const savedAccess = localStorage.getItem("selqiro-access");
    if (savedAccess === "granted") setAuthorized(true);

    const stored = JSON.parse(localStorage.getItem("listings") || "[]");
    setListings(stored);
  }, []);

  const handleLogin = () => {
    if (password === correctPassword) {
      localStorage.setItem("selqiro-access", "granted");
      setAuthorized(true);
    } else {
      alert("Wrong password");
    }
  };

  // ainult aktiivsed
  const activeListings = useMemo(() => {
    return listings.filter((item) => (item.status || "active") === "active");
  }, [listings]);

  // dünaamilised valikud (ilma filtrita)
  const availableCategories = useMemo(() => {
    const set = new Set(
      activeListings.map((item) => item.category || "general")
    );
    return Array.from(set);
  }, [activeListings]);

  const availableConditions = useMemo(() => {
    const set = new Set(
      activeListings.map((item) => item.condition || "used")
    );
    return Array.from(set);
  }, [activeListings]);

  // filtreeritud tulemused
  const filteredListings = useMemo(() => {
    return activeListings.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "all"
          ? true
          : (item.category || "general") === categoryFilter;

      const matchesCondition =
        conditionFilter === "all"
          ? true
          : (item.condition || "used") === conditionFilter;

      const matchesLocation =
        locationFilter.trim() === ""
          ? true
          : (item.location || "")
              .toLowerCase()
              .includes(locationFilter.toLowerCase());

      return (
        matchesSearch &&
        matchesCategory &&
        matchesCondition &&
        matchesLocation
      );
    });
  }, [activeListings, search, categoryFilter, conditionFilter, locationFilter]);

  // 👉 SIIN toimub “nutikas filter”
  const dynamicCategories = useMemo(() => {
    const set = new Set(
      filteredListings.map((item) => item.category || "general")
    );
    return Array.from(set);
  }, [filteredListings]);

  const dynamicConditions = useMemo(() => {
    const set = new Set(
      filteredListings.map((item) => item.condition || "used")
    );
    return Array.from(set);
  }, [filteredListings]);

  if (!authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div>
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin}>Enter</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-10">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8">
          <h1 className="text-4xl font-semibold">Marketplace</h1>
        </header>

        {/* FILTERS */}
        <section className="mb-8 grid gap-4 lg:grid-cols-4">
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border px-4 py-3"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            <option value="all">All categories</option>
            {dynamicCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            <option value="all">All conditions</option>
            {dynamicConditions.map((cond) => (
              <option key={cond} value={cond}>
                {cond}
              </option>
            ))}
          </select>

          <input
            placeholder="Location..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="rounded-xl border px-4 py-3"
          />
        </section>

        {/* LISTINGS */}
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredListings.map((item) => (
            <Link key={item.id} href={`/listing/${item.id}`}>
              <div className="rounded-2xl border p-4">
                {item.image && (
                  <img
                    src={item.image}
                    className="mb-3 h-40 w-full object-cover"
                  />
                )}
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p className="text-gray-500">{item.description}</p>
                <p className="mt-2 font-semibold">{item.price}</p>
              </div>
            </Link>
          ))}
        </section>

      </div>
    </main>
  );
}