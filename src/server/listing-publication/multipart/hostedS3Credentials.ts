import "server-only";
import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { inspectHostedJwt, isHostedPreviewConfig, type HostedPreviewConfig } from "../journey/hostedPreviewConfig";

export type HostedSourceS3Credentials = Readonly<{
  accessKeyId: string; secretAccessKey: string; sessionToken: string;
}>;
export type HostedServerS3Credentials = Readonly<{ accessKeyId: string; secretAccessKey: string }>;

/** Managed Supabase SOURCE signing uses project ref + legacy anon key + user JWT.
 * These checks bind configuration and token shape; the caller must still validate
 * the current user with Auth before issuing a capability. Storage enforces RLS.
 * No signing, network request or publication is performed by this factory. */
export function hostedSourceS3Credentials(config: HostedPreviewConfig, userAccessToken: string,
    nowMs = Date.now()): HostedSourceS3Credentials | null {
  if (!isHostedPreviewConfig(config) || !Number.isFinite(nowMs) || nowMs < 0) return null;
  const token = inspectHostedJwt(userAccessToken);
  if (!token || token.claims.role !== "authenticated" || !isUploadUuid(token.claims.sub)
      || token.claims.iss !== `${config.projectOrigin}/auth/v1`
      || !Number.isSafeInteger(token.claims.exp) || Number(token.claims.exp) * 1000 <= nowMs
      || (token.claims.nbf !== undefined && (!Number.isSafeInteger(token.claims.nbf)
        || Number(token.claims.nbf) * 1000 > nowMs))) return null;
  return Object.freeze({ accessKeyId: config.projectRef, secretAccessKey: config.publicKey, sessionToken: userAccessToken });
}

/** Privileged S3 credentials stay on the server and bypass user RLS. They must
 * never be used to sign the browser's SOURCE grant or be included in a response. */
export function hostedServerS3Credentials(config: HostedPreviewConfig): HostedServerS3Credentials | null {
  return isHostedPreviewConfig(config)
    ? Object.freeze({ accessKeyId: config.s3AccessKeyId, secretAccessKey: config.s3SecretAccessKey })
    : null;
}
