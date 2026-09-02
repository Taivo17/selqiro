"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";

export type LocationSearchScope = "all" | "locality";

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
  place_type?: string;
};

type Props = {
  country?: string;
  value: string;
  placeholder?: string;
  searchScope?: LocationSearchScope;
  onTextChange: (value: string) => void;
  onSelect: (location: SelectedLocation) => void;
};

const LOCALITY_PLACE_TYPES = new Set([
  "administrative",
  "borough",
  "city",
  "city_district",
  "hamlet",
  "locality",
  "municipality",
  "suburb",
  "town",
  "village",
]);

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("et")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getLocalityMatchRank(place: SelectedLocation, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  const candidates = [place.city, place.display_name.split(",")[0] || ""];
  let bestRank = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeSearchText(candidate);

    if (normalizedCandidate === normalizedQuery) {
      bestRank = Math.min(bestRank, 0);
    } else if (normalizedCandidate.startsWith(normalizedQuery)) {
      bestRank = Math.min(bestRank, 1);
    } else if (normalizedCandidate.includes(normalizedQuery)) {
      bestRank = Math.min(bestRank, 2);
    }
  }

  return bestRank;
}

function filterLocalityPlaces(places: SelectedLocation[], query: string) {
  const ranked = places
    .filter((place) =>
      LOCALITY_PLACE_TYPES.has(String(place.place_type || "").toLowerCase())
    )
    .map((place) => ({ place, rank: getLocalityMatchRank(place, query) }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((left, right) => left.rank - right.rank);

  const visible: SelectedLocation[] = [];
  const seen = new Set<string>();

  for (const { place } of ranked) {
    const key = [
      place.city,
      place.region || "",
      place.display_name.split(",")[0] || "",
    ]
      .map(normalizeSearchText)
      .join("::");

    if (seen.has(key)) continue;

    seen.add(key);
    visible.push(place);
  }

  return visible;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export default function LocationAutocomplete({
  country = "Estonia",
  value,
  placeholder = "Otsi asukohta...",
  searchScope = "all",
  onTextChange,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState<SelectedLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [userTyped, setUserTyped] = useState(false);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const cancelActiveSearch = () => {
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  };

  useEffect(() => {
    const query = value.trim();
    const normalizedCountry =
      country.toLowerCase() === "eesti" ? "Estonia" : country;
    const requestId = requestIdRef.current + 1;
    const controller = new AbortController();

    requestIdRef.current = requestId;
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setLoading(false);
    setPlaces([]);
    setOpen(false);

    if (!userTyped || query.length < 2) {
      controller.abort();
      controllerRef.current = null;
      return;
    }

    const timer = window.setTimeout(async () => {
      if (controller.signal.aborted || requestIdRef.current !== requestId) return;

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
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Location search failed.");

        const data: {
          success?: boolean;
          places?: SelectedLocation[];
        } = await response.json();

        if (controller.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        const nextPlaces =
          data.success && Array.isArray(data.places)
            ? searchScope === "locality"
              ? filterLocalityPlaces(data.places, query)
              : data.places
            : [];

        setPlaces(nextPlaces);
        setOpen(nextPlaces.length > 0);
      } catch (error) {
        if (isAbortError(error) || requestIdRef.current !== requestId) return;

        console.error("Location autocomplete error:", error);
        setPlaces([]);
        setOpen(false);
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
          if (controllerRef.current === controller) controllerRef.current = null;
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      if (controllerRef.current === controller) controllerRef.current = null;
      if (requestIdRef.current === requestId) requestIdRef.current += 1;
    };
  }, [country, searchScope, userTyped, value]);

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    cancelActiveSearch();
    setLoading(false);
    setPlaces([]);
    setOpen(false);
    setUserTyped(true);
    onTextChange(event.target.value);
  };

  const handleSelectMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleSelect = (place: SelectedLocation) => {
    cancelActiveSearch();
    setUserTyped(false);
    setLoading(false);
    setPlaces([]);
    setOpen(false);
    onSelect(place);
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={handleTextChange}
        onFocus={() => {
          if (places.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        className="w-full rounded-2xl border border-black/10 px-4 py-4 outline-none"
      />

      {loading ? (
        <div className="absolute right-4 top-4 text-sm text-black/40">
          Otsin...
        </div>
      ) : null}

      {open ? (
        <div
          role="listbox"
          className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-black/10 bg-white shadow-lg"
        >
          {places.map((place) => (
            <button
              key={`${place.provider_place_id}-${place.lat}-${place.lng}`}
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={handleSelectMouseDown}
              onClick={() => handleSelect(place)}
              className="block w-full border-b border-black/5 px-4 py-3 text-left hover:bg-black/5"
            >
              <div className="font-medium">{place.city || place.display_name}</div>
              <div className="text-sm text-black/50">{place.display_name}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
