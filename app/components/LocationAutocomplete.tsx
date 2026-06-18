"use client";

import { useEffect, useState } from "react";

export type SelectedLocation = {
  display_name: string;
  country: string;
  country_code?: string;
  city: string;
  region?: string;
  lat: number;
  lng: number;
  provider?: string;
  provider_place_id?: string;
};

type Props = {
  country?: string;
  value: string;
  placeholder?: string;
  onTextChange: (value: string) => void;
  onSelect: (location: SelectedLocation) => void;
};

export default function LocationAutocomplete({
  country = "Estonia",
  value,
  placeholder = "Otsi asukohta...",
  onTextChange,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState<SelectedLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [suppressNextSearch, setSuppressNextSearch] = useState(false);
  const [userTyped, setUserTyped] = useState(false);

  useEffect(() => {
    const query = value.trim();
    const normalizedCountry =
      country.toLowerCase() === "eesti" ? "Estonia" : country;

    if (!userTyped) {
      setPlaces([]);
      setOpen(false);
      return;
    }

    if (suppressNextSearch) {
      setSuppressNextSearch(false);
      return;
    }

    if (query.length < 2) {
      setPlaces([]);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);

      try {
        const response = await fetch("/api/location/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            country: normalizedCountry,
            query,
          }),
        });

        const data = await response.json();

        if (data?.success && Array.isArray(data.places)) {
          setPlaces(data.places);
          setOpen(data.places.length > 0);
        } else {
          setPlaces([]);
          setOpen(false);
        }
      } catch (error) {
        console.error("Location autocomplete error:", error);
        setPlaces([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [country, value]);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(event) => {
          setUserTyped(true);
          onTextChange(event.target.value);
        }}
        onFocus={() => {
          if (places.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-black/10 px-4 py-4 outline-none"
      />

      {loading ? (
        <div className="absolute right-4 top-4 text-sm text-black/40">
          Otsin...
        </div>
      ) : null}

      {open ? (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-black/10 bg-white shadow-lg">
          {places.map((place) => (
            <button
              key={`${place.provider_place_id}-${place.lat}-${place.lng}`}
              type="button"
              onClick={() => {
                setSuppressNextSearch(true);
                setUserTyped(false);
                setPlaces([]);
                setOpen(false);
                onSelect(place);
              }}
              className="block w-full border-b border-black/5 px-4 py-3 text-left hover:bg-black/5"
            >
              <div className="font-medium">{place.city || place.display_name}</div>
              <div className="text-sm text-black/50">
                {place.display_name}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
