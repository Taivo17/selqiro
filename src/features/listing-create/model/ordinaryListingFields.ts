import { CATEGORY_TREE } from "../../../../lib/categories";
import { getCategoryFields, type CategoryField } from "../../../../lib/categoryFields";
import type { ListingPriceKind } from "../../../entities/listing/model/listingPriceInput";

export type OrdinaryCategoryNode = Readonly<{
  value: string; label: string; children?: readonly OrdinaryCategoryNode[];
}>;
export type OrdinaryListingFieldState = Readonly<{
  categoryPath: readonly string[];
  condition: "" | "new" | "used" | "damaged";
  priceKind: ListingPriceKind;
  amountInput: string;
  currencyInput: string;
  country: string;
  city: string;
  detailValues: Readonly<Record<string, string>>;
}>;
export const ORDINARY_CATEGORY_TREE: readonly OrdinaryCategoryNode[] = CATEGORY_TREE;
export const ORDINARY_CONDITIONS = [
  { value: "new", label: "Uus" }, { value: "used", label: "Kasutatud" },
  { value: "damaged", label: "Vigane / parandamist vajav" },
] as const;

export function createOrdinaryListingFieldState(): OrdinaryListingFieldState {
  return { categoryPath: [], condition: "", priceKind: "fixed", amountInput: "",
    currencyInput: "", country: "", city: "", detailValues: {} };
}

/** Full ancestry, not a globally matched leaf ID. Empty/inconsistent paths fail closed. */
export function ordinaryCategoryNodes(path: readonly string[]): readonly OrdinaryCategoryNode[] | null {
  if (!Array.isArray(path) || path.length < 1 || path.length > 3) return null;
  let options = ORDINARY_CATEGORY_TREE;
  const nodes: OrdinaryCategoryNode[] = [];
  for (const value of path) {
    if (typeof value !== "string") return null;
    const found = options.find(node => node.value === value);
    if (!found) return null;
    nodes.push(found); options = found.children ?? [];
  }
  return nodes;
}
export function ordinaryCategoryIsComplete(path: readonly string[]): boolean {
  const nodes = ordinaryCategoryNodes(path);
  return nodes !== null && !(nodes[nodes.length - 1].children?.length);
}

/** Existing registry, with the common condition shown only once in basic fields. */
export function ordinaryDetailFields(path: readonly string[]): readonly CategoryField[] {
  if (!ordinaryCategoryIsComplete(path)) return [];
  return getCategoryFields(path[path.length - 1]).filter(field => field.key !== "condition");
}

/** The caller confirms discarding entered details before invoking this reducer. */
export function selectOrdinaryCategory(
  state: OrdinaryListingFieldState, level: number, value: string,
): OrdinaryListingFieldState {
  if (!Number.isInteger(level) || level < 0 || level > 2 || level > state.categoryPath.length) {
    throw new Error("Kategooria valiku aste ei sobi.");
  }
  if (state.categoryPath[level] === value || (value === "" && level === state.categoryPath.length)) return state;
  const categoryPath = [...state.categoryPath.slice(0, level), ...(value ? [value] : [])];
  if (categoryPath.length && !ordinaryCategoryNodes(categoryPath)) throw new Error("Kategooriatee ei sobi.");
  // Do not carry a field such as 'type' between unrelated category meanings.
  return { ...state, categoryPath, detailValues: {} };
}
export function selectOrdinaryPriceKind(
  state: OrdinaryListingFieldState, priceKind: ListingPriceKind,
): OrdinaryListingFieldState {
  if (!["fixed", "free", "negotiable", "unspecified"].includes(priceKind)) throw new Error("Vali hinna liik.");
  return { ...state, priceKind,
    amountInput: priceKind === "fixed" ? state.amountInput : "",
    currencyInput: priceKind === "fixed" ? state.currencyInput : "" };
}
export function setOrdinaryDetail(
  state: OrdinaryListingFieldState, key: string, value: string,
): OrdinaryListingFieldState {
  if (!ordinaryDetailFields(state.categoryPath).some(field => field.key === key) || typeof value !== "string") {
    throw new Error("Detail ei kuulu valitud kategooriasse.");
  }
  return { ...state, detailValues: { ...state.detailValues, [key]: value } };
}
