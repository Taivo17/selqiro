import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const country = clean(body.country);
    const city = clean(body.city);

    if (!country || !city) {
      return NextResponse.json(
        { success: false, message: "Country and city are required." },
        { status: 400 }
      );
    }

    const { data: cached, error: cacheError } = await supabase
      .from("city_geocache")
      .select("lat, lng")
      .ilike("country", country)
      .ilike("city", city)
      .maybeSingle();

    if (!cacheError && cached?.lat && cached?.lng) {
      return NextResponse.json({
        success: true,
        source: "cache",
        lat: cached.lat,
        lng: cached.lng,
      });
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("city", city);
    url.searchParams.set("country", country);

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Selqiro Marketplace location geocoder",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Geocoding failed." },
        { status: 502 }
      );
    }

    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;

    if (!first?.lat || !first?.lon) {
      return NextResponse.json(
        { success: false, message: "Location not found." },
        { status: 404 }
      );
    }

    const lat = Number(first.lat);
    const lng = Number(first.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { success: false, message: "Invalid location result." },
        { status: 404 }
      );
    }

    await supabase.from("city_geocache").upsert(
      {
        country,
        city,
        lat,
        lng,
      },
      { onConflict: "country,city" }
    );

    return NextResponse.json({
      success: true,
      source: "nominatim",
      lat,
      lng,
    });
  } catch (error) {
    console.error("Geocode API error:", error);

    return NextResponse.json(
      { success: false, message: "Unexpected geocode error." },
      { status: 500 }
    );
  }
}
