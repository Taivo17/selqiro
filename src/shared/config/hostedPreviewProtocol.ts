/** Public identifiers describe a deployed contract. They are not credentials. */
export const HOSTED_PREVIEW_RELEASE_ID = "listing-publication-hosted-preview-v1";
export const HOSTED_PREVIEW_STORAGE_CONTRACT = "supabase-s3-session-v1";

/** The existing portal target approved by its owner. These public constants bind
 * the deliberately enabled portal branch; they are not publication authority. */
export const HOSTED_PORTAL_ORIGIN = "https://selqiro.vercel.app";
export const HOSTED_PORTAL_PROJECT_REF = "vyjletlmwoiwxsnsunlm";
export const HOSTED_PORTAL_REGION = "eu-central-1";

export type HostedPreviewCapability = Readonly<{
  schemaVersion: 1;
  mode: "hosted-preview-v1";
  releaseId: typeof HOSTED_PREVIEW_RELEASE_ID;
  instanceId: string;
  appOrigin: string;
  projectOrigin: string;
  storageOrigin: string;
}>;
