import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import {
  SERVICE_STATUSES,
  type Service,
  type ServiceStatus,
} from "../model/types";
import {
  mapServiceRow,
  type ServiceRow,
} from "./getMyServices";

type SupabaseOperationError = {
  code?: string | null;
  message?: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstRow<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeUuid(
  value: string,
  errorMessage: string
): string {
  const cleanValue = value.trim();

  if (!UUID_PATTERN.test(cleanValue)) {
    throw new Error(errorMessage);
  }

  return cleanValue;
}

function normalizeStatus(
  value: ServiceStatus
): ServiceStatus {
  const cleanValue = String(value || "")
    .trim()
    .toLowerCase() as ServiceStatus;

  if (
    !SERVICE_STATUSES.includes(
      cleanValue
    )
  ) {
    throw new Error(
      marketplaceMessage("service.the_selected_service_status_is_invalid.c72279")
    );
  }

  return cleanValue;
}

function getStatusErrorMessage(
  error: SupabaseOperationError,
  fallback: string
): string {
  const message =
    String(error.message || "")
      .trim();

  const lowerMessage =
    message.toLowerCase();

  if (
    error.code === "42501" ||
    lowerMessage.includes(
      "active identity"
    ) ||
    lowerMessage.includes(
      "does not belong"
    ) ||
    lowerMessage.includes(
      "permission"
    )
  ) {
    return marketplaceMessage("service.there_is_no_active_identity_or_you_do.487f1c");
  }

  if (
    lowerMessage.includes(
      "service id"
    )
  ) {
    return marketplaceMessage("service.the_service_id_is_invalid.23000a");
  }

  if (
    lowerMessage.includes(
      "service status"
    ) ||
    lowerMessage.includes(
      "status is invalid"
    )
  ) {
    return marketplaceMessage("service.the_selected_service_status_is_invalid.c72279");
  }

  return message || fallback;
}

export async function setMyServiceStatus(
  input: {
    serviceId: string;
    status: ServiceStatus;
  }
): Promise<Service> {
  const serviceId = normalizeUuid(
    input.serviceId,
    marketplaceMessage("service.the_service_id_is_invalid.23000a")
  );

  const status = normalizeStatus(
    input.status
  );

  const { data, error } =
    await supabaseBrowserClient.rpc(
      "set_my_service_status_v2",
      {
        p_service_id: serviceId,
        p_status: status,
      }
    );

  if (error) {
    throw new Error(
      getStatusErrorMessage(
        error,
        marketplaceMessage("service.the_service_status_could_not_be_changed.076de2")
      )
    );
  }

  const row = firstRow(
    data as
      | ServiceRow
      | ServiceRow[]
      | null
  );

  if (!row) {
    throw new Error(
      marketplaceMessage("service.the_database_did_not_return_the_updated_service.2002de")
    );
  }

  const service =
    mapServiceRow(row);

  if (
    service.id !== serviceId ||
    service.status !== status
  ) {
    throw new Error(
      marketplaceMessage("service.the_database_returned_an_unexpected_service_status.3b1c44")
    );
  }

  if (
    status === "published" &&
    !service.publishedAt
  ) {
    throw new Error(
      marketplaceMessage("service.the_published_service_has_no_publication_date.991665")
    );
  }

  return service;
}
