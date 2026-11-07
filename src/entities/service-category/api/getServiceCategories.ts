import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import {
  SERVICE_CATEGORY_CODE_PATTERN,
  compareServiceCategories,
  type ServiceCategory,
} from "../model/types";

type ServiceCategoryRow = {
  code?: string | null;
  parent_code?: string | null;
  label_et?: string | null;
  label_en?: string | null;
  sort_order?: number | string | null;
};

const SERVICE_CATEGORY_LIMIT = 500;

function requiredCode(
  value: string | null | undefined,
  fieldName: string
): string {
  const cleanValue =
    String(value || "").trim();

  if (
    !SERVICE_CATEGORY_CODE_PATTERN.test(
      cleanValue
    )
  ) {
    throw new Error(
      marketplaceMessage("category.the_service_category_field_is_invalid_value.f34b86", { p0: String(fieldName) })
    );
  }

  return cleanValue;
}

function optionalParentCode(
  value: string | null | undefined
): string | null {
  const cleanValue =
    String(value || "").trim();

  if (!cleanValue) {
    return null;
  }

  return requiredCode(
    cleanValue,
    "parent_code"
  );
}

function requiredLabel(
  value: string | null | undefined,
  fieldName: string
): string {
  const cleanValue =
    String(value || "")
      .trim()
      .replace(/\s+/g, " ");

  if (
    cleanValue.length < 2 ||
    cleanValue.length > 120
  ) {
    throw new Error(
      marketplaceMessage("category.the_service_category_label_is_invalid_value.0a01d1", { p0: String(fieldName) })
    );
  }

  return cleanValue;
}

function normalizeSortOrder(
  value:
    | number
    | string
    | null
    | undefined
): number {
  const parsedValue = Number(
    value ?? 0
  );

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    return 0;
  }

  return Math.floor(parsedValue);
}

function mapServiceCategoryRow(
  row: ServiceCategoryRow
): ServiceCategory {
  const code = requiredCode(
    row.code,
    "code"
  );

  const parentCode =
    optionalParentCode(
      row.parent_code
    );

  if (parentCode === code) {
    throw new Error(
      marketplaceMessage("category.a_service_category_cannot_be_its_own_parent.cb566f")
    );
  }

  return {
    code,
    parentCode,
    labelEt: requiredLabel(
      row.label_et,
      "label_et"
    ),
    labelEn: requiredLabel(
      row.label_en,
      "label_en"
    ),
    sortOrder: normalizeSortOrder(
      row.sort_order
    ),
  };
}

function getCategoryLoadErrorMessage(
  error: {
    code?: string | null;
    message?: string | null;
  }
): string {
  const message =
    String(error.message || "")
      .trim();

  if (
    error.code === "42501" ||
    message
      .toLowerCase()
      .includes("permission")
  ) {
    return marketplaceMessage("category.you_do_not_have_access_to_read_service.21ba9f");
  }

  return (
    message ||
    marketplaceMessage("category.service_categories_could_not_be_loaded.9373a9")
  );
}

export async function getServiceCategories():
  Promise<ServiceCategory[]> {
  const { data, error } =
    await supabaseBrowserClient
      .from("service_categories")
      .select(
        [
          "code",
          "parent_code",
          "label_et",
          "label_en",
          "sort_order",
        ].join(",")
      )
      .eq(
        "is_active",
        true
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      )
      .order(
        "code",
        {
          ascending: true,
        }
      )
      .limit(
        SERVICE_CATEGORY_LIMIT
      );

  if (error) {
    throw new Error(
      getCategoryLoadErrorMessage(
        error
      )
    );
  }

  return (
    (data || []) as ServiceCategoryRow[]
  )
    .map(mapServiceCategoryRow)
    .sort(compareServiceCategories);
}
