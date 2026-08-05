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
      "Valitud teenuse staatus ei ole korrektne."
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
    return "Aktiivne identiteet puudub või sul ei ole õigust selle teenuse staatust muuta.";
  }

  if (
    lowerMessage.includes(
      "service id"
    )
  ) {
    return "Teenuse ID ei ole korrektne.";
  }

  if (
    lowerMessage.includes(
      "service status"
    ) ||
    lowerMessage.includes(
      "status is invalid"
    )
  ) {
    return "Valitud teenuse staatus ei ole korrektne.";
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
    "Teenuse ID ei ole korrektne."
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
        "Teenuse staatust ei saanud muuta."
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
      "Andmebaas ei tagastanud muudetud teenust."
    );
  }

  const service =
    mapServiceRow(row);

  if (
    service.id !== serviceId ||
    service.status !== status
  ) {
    throw new Error(
      "Andmebaas tagastas ootamatu teenuse staatuse."
    );
  }

  if (
    status === "published" &&
    !service.publishedAt
  ) {
    throw new Error(
      "Avaldatud teenusel puudub avaldamise aeg."
    );
  }

  return service;
}
