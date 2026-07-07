import type { ProductListingDetail } from "./types";

export type EditableListingAccessStatus =
  | "ok"
  | "not_authenticated"
  | "not_found"
  | "forbidden";

export type EditableListingResult =
  | {
      status: "ok";
      listing: ProductListingDetail;
    }
  | {
      status: "not_authenticated" | "not_found" | "forbidden";
      listing: null;
    };
