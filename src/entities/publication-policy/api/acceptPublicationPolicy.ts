import {
  supabaseBrowserClient,
} from "../../../shared/supabase/browserClient";

import {
  type AcceptPublicationPolicyInput,
  type PublicationPolicyAcceptance,
} from "../model/types";

const POLICY_ACCEPT_RPC =
  "accept_publication_policy_v1";

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
    name: typeof POLICY_ACCEPT_RPC,
    args: {
      p_policy_document_id: string;
      p_policy_version: string;
      p_content_hash: string;
      p_identity_id: string | null;
      p_acceptance_source: "publication_gate";
    }
  ) => PromiseLike<PublicationPolicyRpcResult>;
};

export class PublicationPolicyAcceptanceError
  extends Error {
  readonly code: string | null;

  constructor(
    message: string,
    code: string | null = null
  ) {
    super(message);
    this.name =
      "PublicationPolicyAcceptanceError";
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
    throw new PublicationPolicyAcceptanceError(
      `Invalid publication policy acceptance field: ${key}`
    );
  }

  return value;
}

function mapPublicationPolicyAcceptance(
  value: unknown
): PublicationPolicyAcceptance {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw new PublicationPolicyAcceptanceError(
      "Invalid publication policy acceptance response row."
    );
  }

  const row = value as Record<string, unknown>;

  return {
    acceptanceId: requireString(row, "id"),
    policyDocumentId: requireString(
      row,
      "policy_document_id"
    ),
    acceptedAt: requireString(
      row,
      "accepted_at"
    ),
  };
}

export async function acceptPublicationPolicy(
  input: AcceptPublicationPolicyInput
): Promise<PublicationPolicyAcceptance> {
  const client =
    supabaseBrowserClient as unknown as PublicationPolicyRpcClient;

  const { data, error } = await client.rpc(
    POLICY_ACCEPT_RPC,
    {
      p_policy_document_id:
        input.policyDocumentId,
      p_policy_version:
        input.policyVersion,
      p_content_hash: input.contentHash,
      p_identity_id: input.identityId ?? null,
      p_acceptance_source:
        "publication_gate",
    }
  );

  if (error) {
    throw new PublicationPolicyAcceptanceError(
      error.message
        || "Publication policy acceptance failed.",
      error.code || null
    );
  }

  if (!Array.isArray(data) || data.length < 1) {
    throw new PublicationPolicyAcceptanceError(
      "Publication policy acceptance returned no record."
    );
  }

  const acceptance =
    mapPublicationPolicyAcceptance(data[0]);

  if (
    acceptance.policyDocumentId
    !== input.policyDocumentId
  ) {
    throw new PublicationPolicyAcceptanceError(
      "Publication policy acceptance response did not match the requested document."
    );
  }

  return acceptance;
}
