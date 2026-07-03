import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export type SelectedLocation = {
  country: string;
  city: string;
  display_name?: string;
  lat?: number;
  lng?: number;
};

type GeocodedCity = {
  lat: number;
  lng: number;
};

async function geocodeCity(
  country: string,
  city: string,
): Promise<GeocodedCity | null> {
  const response = await fetch("/api/location/geocode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ country, city }),
  });

  const data = await response.json();

  if (!data.success) {
    return null;
  }

  return {
    lat: data.lat,
    lng: data.lng,
  };
}

export function useLocation(userId: string | null) {
  const [homeCountry, setHomeCountry] = useState("Estonia");
  const [homeCity, setHomeCity] = useState("");
  const [selectedHomeLocation, setSelectedHomeLocation] =
    useState<SelectedLocation | null>(null);
  const [savingHomeLocation, setSavingHomeLocation] = useState(false);

  const saveHomeLocation = async () => {
    if (!userId) return;

    setSavingHomeLocation(true);

    try {
      const cleanCountry = selectedHomeLocation?.country || homeCountry.trim();
      const cleanCity = selectedHomeLocation?.city || homeCity.trim();

      const coords = selectedHomeLocation
        ? {
            lat: selectedHomeLocation.lat,
            lng: selectedHomeLocation.lng,
          }
        : await geocodeCity(cleanCountry, cleanCity);

      const { error } = await supabase.rpc(
        "update_my_active_identity_location",
        {
          p_country: cleanCountry,
          p_city: cleanCity,
          p_lat: coords?.lat || null,
          p_lng: coords?.lng || null,
        },
      );

      if (error) throw error;
    } catch (error) {
      console.error("Error saving home location:", error);
      alert("Failed to save home location.");
    } finally {
      setSavingHomeLocation(false);
    }
  };

  return {
    homeCountry,
    setHomeCountry,
    homeCity,
    setHomeCity,
    selectedHomeLocation,
    setSelectedHomeLocation,
    savingHomeLocation,
    saveHomeLocation,
  };
}
