export const STORE_CATEGORY_NAME_MAX_LENGTH = 60;

export type StoreCategory = {
  id: string;
  name: string;
  sort_order?: number | null;
  parent_id: string | null;
};

export function normalizeStoreCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
