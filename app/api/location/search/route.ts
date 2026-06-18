import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = clean(body.query);
    const countryInput = clean(body.country);
    const country =
      countryInput.toLowerCase() === "eesti" ? "Estonia" : countryInput;

    if (!query) {
      return NextResponse.json(
        { success: false, message: "Query is required." },
        { status: 400 }
      );
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "8");
    url.searchParams.set("q", country ? `${query}, ${country}` : query);

    if (country.toLowerCase() === "estonia") {
      url.searchParams.set("countrycodes", "ee");
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Selqiro Marketplace location search",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Location search failed." },
        { status: 502 }
      );
    }

    const results = await response.json();
    const rows = Array.isArray(results) ? results : [];

    const places = rows
      .map((row: any) => {
        const lat = Number(row.lat);
        const lng = Number(row.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const address = row.address || {};

        return {
          provider: "nominatim",
          provider_place_id: String(row.place_id || row.osm_id || ""),
          display_name: String(row.display_name || ""),
          place_type: String(row.type || row.class || ""),
          country: String(address.country || country || ""),
          country_code: String(address.country_code || ""),
          city: String(
            address.city ||
              address.town ||
              address.village ||
              address.hamlet ||
              address.city_district ||
              address.suburb ||
              row.name ||
              address.municipality ||
              query
          ),
          region: String(address.county || address.state || ""),
          lat,
          lng,
          raw: row,
        };
      })
      .filter(Boolean);

    for (const place of places) {
      if (!place) continue;

      await supabase.from("location_search_cache").insert({
        query,
        country: place.country || country || null,
        provider: place.provider,
        provider_place_id: place.provider_place_id,
        display_name: place.display_name,
        place_type: place.place_type,
        country_code: place.country_code,
        lat: place.lat,
        lng: place.lng,
        raw: place.raw,
      });
    }

    return NextResponse.json({
      success: true,
      places,
    });
  } catch (error) {
    console.error("Location search API error:", error);

    return NextResponse.json(
      { success: false, message: "Unexpected location search error." },
      { status: 500 }
    );
  }
}
