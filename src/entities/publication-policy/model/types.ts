export type PublicationPolicyStatus = {
  policyDocumentId: string;
  policyKey: string;
  policyVersion: string;
  countryCode: string | null;
  locale: string;
  title: string;
  summary: string;
  bodyText: string;
  contentHash: string;
  metadata: unknown;
  accepted: boolean;
  acceptanceId: string | null;
  acceptedAt: string | null;
};

export type GetMyRequiredPublicationPolicyStatusInput = {
  contentType: string;
  countryCode: string | null;
  locale: string;
};

export type PublicationPolicyAcceptance = {
  acceptanceId: string;
  policyDocumentId: string;
  acceptedAt: string;
};

export type AcceptPublicationPolicyInput = {
  policyDocumentId: string;
  policyVersion: string;
  contentHash: string;
  identityId?: string | null;
};
