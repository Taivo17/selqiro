import { CATEGORY_TREE, getCategoryLabel } from "../../../../lib/categories";

export const PUBLIC_SEARCH_PAGE_SIZE = 24;
export const PUBLIC_SEARCH_MAX_OFFSET = 100000;
export type SearchCondition = "" | "new" | "used" | "damaged";
export type PublicSearchFields = {
  query: string; category: string; subcategory: string; detailCategory: string;
  condition: SearchCondition; location: string;
};
export type PublicSearchInput = PublicSearchFields & { offset: number };
export const EMPTY_PUBLIC_SEARCH: PublicSearchInput = {
  query: "", category: "", subcategory: "", detailCategory: "",
  condition: "", location: "", offset: 0,
};
export type SearchCategory = { value: string; label: string; children?: readonly SearchCategory[] };
export const SEARCH_CATEGORIES: readonly SearchCategory[] = CATEGORY_TREE;
export const SEARCH_CONDITIONS = [
  { value: "new", label: "Uus" }, { value: "used", label: "Kasutatud" },
  { value: "damaged", label: "Kahjustatud" },
] as const;
export const searchCategoryLabel = (node: SearchCategory) => getCategoryLabel(node.value, node.label, "et");
export function searchCategoryChildren(category: string, subcategory?: string): readonly SearchCategory[] {
  const children = SEARCH_CATEGORIES.find(n => n.value === category)?.children || [];
  return subcategory ? children.find(n => n.value === subcategory)?.children || [] : children;
}
export function publicSearchError(input: PublicSearchInput): string | null {
  if ([input.query, input.location].some(v => typeof v !== "string" || [...v].length > 160))
    return "Otsingutekst võib olla kuni 160 märki.";
  if (!Number.isInteger(input.offset) || input.offset < 0 || input.offset > PUBLIC_SEARCH_MAX_OFFSET)
    return "See tulemuste lehekülg ei ole toetatud. Alusta otsingut uuesti.";
  if (!["", "new", "used", "damaged"].includes(input.condition)) return "Vali toetatud seisukord.";
  if ((input.category && !SEARCH_CATEGORIES.some(n => n.value === input.category)) ||
      (input.subcategory && !searchCategoryChildren(input.category).some(n => n.value === input.subcategory)) ||
      (input.detailCategory && (!input.subcategory ||
        !searchCategoryChildren(input.category, input.subcategory).some(n => n.value === input.detailCategory))))
    return "See kategooriavalik ei ole toetatud. Vali kategooria uuesti.";
  return null;
}
export function publicSearchKey(input: PublicSearchInput): string {
  return JSON.stringify([input.query.trim(), input.category, input.subcategory, input.detailCategory,
    input.condition, input.location.trim(), input.offset]);
}
export function parsePublicSearch(params: URLSearchParams): { input: PublicSearchInput; error: string | null } {
  const scalar = (key: string) => params.get(key) || "";
  const rawOffset = scalar("offset");
  const input: PublicSearchInput = {
    query: scalar("q"), category: scalar("category"), subcategory: scalar("subcategory"),
    detailCategory: scalar("detail"), condition: scalar("condition") as SearchCondition,
    location: scalar("location"), offset: rawOffset === "" ? 0 : /^\d{1,6}$/.test(rawOffset) ? Number(rawOffset) : -1,
  };
  const keys = ["q", "category", "subcategory", "detail", "condition", "location", "offset"];
  const duplicate = keys.some(k => params.getAll(k).length > 1);
  const unsupported = ["min_price", "max_price", "price_min", "price_max", "currency", "radius", "purpose"]
    .some(k => params.has(k)) || (params.has("sort") && params.get("sort") !== "newest");
  return {input, error: duplicate || unsupported
    ? "Link sisaldab toetamata või korduvaid filtreid. Alusta otsingut uuesti."
    : publicSearchError(input)};
}
export function publicSearchUrl(input: PublicSearchInput): string {
  const params = new URLSearchParams();
  for (const [key, value] of [["q", input.query], ["category", input.category],
    ["subcategory", input.subcategory], ["detail", input.detailCategory],
    ["condition", input.condition], ["location", input.location]] as const) {
    if (value) params.set(key, value);
  }
  if (input.offset) params.set("offset", String(input.offset));
  const search = params.toString();
  return "/v2/products" + (search ? "?" + search : "");
}
export const publicFilterCount = (input: PublicSearchFields) =>
  Number(Boolean(input.category)) + Number(Boolean(input.condition)) + Number(Boolean(input.location.trim()));
export function publicCategoryPath(input: Pick<PublicSearchFields, "category" | "subcategory" | "detailCategory">): string {
  let nodes = SEARCH_CATEGORIES;
  const labels: string[] = [];
  for (const value of [input.category, input.subcategory, input.detailCategory]) {
    const node = nodes.find(n => n.value === value);
    if (!node) break;
    labels.push(searchCategoryLabel(node)); nodes = node.children || [];
  }
  return labels.join(" › ");
}
export const formatSearchCount = (text: string) => text.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
