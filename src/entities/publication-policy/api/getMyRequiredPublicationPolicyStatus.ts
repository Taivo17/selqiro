import {
  supabaseBrowserClient,
} from "../../../shared/supabase/browserClient";

import {
  type GetMyRequiredPublicationPolicyStatusInput,
  type PublicationPolicyStatus,
} from "../model/types";

const POLICY_STATUS_RPC =
  "get_my_required_publication_policy_status_v1";

type PublicationPolicyRpcError = {
  code?: string | null;
  message?: string | null;
};

type PublicationPolicyRpcResult = {
  data: unknown;
  error: PublicationPolicyRpcError | null;
};

type PublicationPolicyRpcClient = {
  rpc: (
    name: typeof POLICY_STATUS_RPC,
    args: {
      p_content_type: string;
      p_country_code: string | null;
      p_locale: string;
    }
  ) => PromiseLike<PublicationPolicyRpcResult>;
};

export class PublicationPolicyStatusLoadError
  extends Error {
  readonly code: string | null;

  constructor(
    message: string,
    code: string | null = null
  ) {
    super(message);
    this.name =
      "PublicationPolicyStatusLoadError";
    this.code = code;
  }
}

function requireString(
  row: Record<string, unknown>,
  key: string
): string {
  const value = row[key];

  if (
    typeof value !== "string"
    || value.length === 0
  ) {
    throw new PublicationPolicyStatusLoadError(
      `Invalid publication policy field: ${key}`
    );
  }

  return value;
}

function optionalString(
  row: Record<string, unknown>,
  key: string
): string | null {
  const value = row[key];
  return typeof value === "string"
    && value.length > 0
    ? value
    : null;
}

function mapPublicationPolicyStatus(
  value: unknown
): PublicationPolicyStatus {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw new PublicationPolicyStatusLoadError(
      "Invalid publication policy response row."
    );
  }

  const row = value as Record<string, unknown>;

  return {
    policyDocumentId: requireString(
      row,
      "policy_document_id"
    ),
    policyKey: requireString(
      row,
      "policy_key"
    ),
    policyVersion: requireString(
      row,
      "policy_version"
    ),
    countryCode: optionalString(
      row,
      "country_code"
    ),
    locale: requireString(row, "locale"),
    title: requireString(row, "title"),
    summary: requireString(row, "summary"),
    bodyText: requireString(
      row,
      "body_text"
    ),
    contentHash: requireString(
      row,
      "content_hash"
    ),
    metadata: row.metadata ?? null,
    accepted: row.accepted === true,
    acceptanceId: optionalString(
      row,
      "acceptance_id"
    ),
    acceptedAt: optionalString(
      row,
      "accepted_at"
    ),
  };
}

export async function
getMyRequiredPublicationPolicyStatus(
  input: GetMyRequiredPublicationPolicyStatusInput
): Promise<PublicationPolicyStatus[]> {
  const client =
    supabaseBrowserClient as unknown as PublicationPolicyRpcClient;

  const { data, error } = await client.rpc(
    POLICY_STATUS_RPC,
    {
      p_content_type: input.contentType,
      p_country_code: input.countryCode,
      p_locale: input.locale,
    }
  );

  if (error) {
    throw new PublicationPolicyStatusLoadError(
      error.message
        || "Publication policy status request failed.",
      error.code || null
    );
  }

  if (data === null) {
    return [];
  }

  if (!Array.isArray(data)) {
    throw new PublicationPolicyStatusLoadError(
      "Invalid publication policy response."
    );
  }

  return data.map(
    mapPublicationPolicyStatus
  );
}
