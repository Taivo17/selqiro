import type { ListingPriceInput } from "./listingPriceInput";

/** Input to the existing closed creation contract, NOT a publication or upload command.
 * Actor, status, expiry, request key, image URLs and policy evidence are not form input.
 * A later authorized publication boundary must bind/verify those separately. */
export type ListingCreationInput = Readonly<{
  basics: Readonly<{ title: string; description: string; condition: "new" | "used" | "damaged" }>;
  price: ListingPriceInput;
  category_path: readonly string[];
  location: Readonly<{ country: string; city: string; latitude: null; longitude: null }>;
  attributes: Readonly<{
    manufacturer: string; part_number: string; oem_number: string;
    vehicle_brand: string; vehicle_model: string; vehicle_year: string; engine: string;
  }>;
  details: Readonly<Record<string, string>>;
  language: "et";
}>;
