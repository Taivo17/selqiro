import type { ServiceSearchInput } from "../../../entities/service/model/publicService";

export type ServiceDiscoveryFilters = {query: string; category: string; subcategory: string; city: string};
export const emptyServiceFilters = (): ServiceDiscoveryFilters => ({query: "", category: "", subcategory: "", city: ""});

export function readServiceFilters(search: string): ServiceDiscoveryFilters {
  const params = new URLSearchParams(search);
  const text = (key: string, max: number) => {
    const value = params.get(key) ?? "";
    return value.length <= max && !/[\u0000-\u001f]/.test(value) ? value : "";
  };
  const category = text("category", 120);
  return {query: text("q", 200), category, subcategory: category ? text("subcategory", 160) : "", city: text("city", 160)};
}

export function serviceFiltersUrl(filters: ServiceDiscoveryFilters): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.category) params.set("category", filters.category);
  if (filters.category && filters.subcategory) params.set("subcategory", filters.subcategory);
  if (filters.city) params.set("city", filters.city);
  const query = params.toString();
  return "/v2/services" + (query ? `?${query}` : "");
}

export function serviceSearchInput(filters: ServiceDiscoveryFilters): ServiceSearchInput {
  return {query: filters.query, category: filters.category || null, subcategory: filters.subcategory || null,
    country: null, city: filters.city || null};
}
