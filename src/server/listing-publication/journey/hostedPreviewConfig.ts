import "server-only";
import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { HOSTED_PORTAL_ORIGIN, HOSTED_PORTAL_PROJECT_REF, HOSTED_PORTAL_REGION } from "../../../shared/config/hostedPreviewProtocol";

export type HostedPreviewConfig = Readonly<{
  integrationScope: "hosted-preview-v1";
  deploymentTarget: "preview" | "portal";
  appOrigin: string;
  projectRef: string;
  instanceId: string;
  projectOrigin: string;
  publicKey: string;
  serviceKey: string;
  storageOrigin: string;
  s3Endpoint: string;
  s3Region: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
}>;

const validatedConfigs = new WeakSet<object>();
type JwtParts = Readonly<{ header: Record<string, unknown>; claims: Record<string, unknown> }>;

/** Decode consistency fields only. This does not verify a signature or authenticate
 * a user; Supabase Auth and Storage still validate the supplied credentials. */
export function inspectHostedJwt(value: unknown): JwtParts | null {
  if (typeof value !== "string" || value.length > 8192
      || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const [headerPart, claimsPart] = value.split(".");
    const decode = (part: string): Record<string, unknown> => {
      const bytes = Buffer.from(part, "base64url");
      if (bytes.toString("base64url") !== part) throw new Error("jwt_shape");
      const decoded: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new Error("jwt_shape");
      return decoded as Record<string, unknown>;
    };
    const header = decode(headerPart), claims = decode(claimsPart);
    if (!["HS256", "ES256", "RS256"].includes(String(header.alg))
        || (header.typ !== undefined && header.typ !== "JWT")) return null;
    return { header, claims };
  } catch { return null; }
}

function legacyKey(value: unknown, role: "anon" | "service_role", projectRef: string, nowMs: number): value is string {
  const token = inspectHostedJwt(value);
  // Legacy project keys use a different issuer shape from user access tokens.
  // Bind their role and project ref, without treating decoded claims as proof.
  return token !== null && token.header.alg === "HS256" && token.claims.role === role
    && token.claims.ref === projectRef && Number.isSafeInteger(token.claims.exp)
    && Number(token.claims.exp) * 1000 > nowMs;
}

function serverCredential(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 8192
    && !/[\s\x00-\x1f\x7f]/.test(value);
}

/** A valid configuration is not backend readiness or publication authority.
 * This module neither enables routes nor calls a service. The hosted schema,
 * Storage authority and cleanup contracts must be connected separately. */
export function hostedPreviewConfig(env: NodeJS.ProcessEnv = process.env, nowMs = Date.now()): HostedPreviewConfig | null {
  if (typeof window !== "undefined" || !Number.isFinite(nowMs) || nowMs < 0
      || env.NODE_ENV !== "production" || env.VERCEL !== "1"
      || env.SELQIRO_V2_LOCAL_INTEGRATION !== undefined
      || env.NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION !== undefined) return null;

  const preview = env.VERCEL_ENV === "preview"
    && env.SELQIRO_V2_HOSTED_PREVIEW === "v1" && env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW === "v1"
    && env.SELQIRO_V2_HOSTED_PORTAL === undefined && env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL === undefined;
  const portal = env.VERCEL_ENV === "production"
    && env.SELQIRO_V2_HOSTED_PORTAL === "v1" && env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL === "v1"
    && env.SELQIRO_V2_HOSTED_PREVIEW === undefined && env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW === undefined;
  if (!preview && !portal) return null;

  const projectRef = env.SELQIRO_V2_HOSTED_PROJECT_REF;
  const instanceId = env.SELQIRO_V2_HOSTED_INSTANCE_ID;
  const region = env.SELQIRO_V2_HOSTED_REGION;
  const deploymentHost = env.VERCEL_URL;
  if (!projectRef || !/^[a-z]{20}$/.test(projectRef) || !isUploadUuid(instanceId)
      || !region || !/^[a-z]{2}(?:-[a-z]+){1,3}-[0-9]$/.test(region)
      || !deploymentHost || deploymentHost.length > 253
      || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/.test(deploymentHost)) return null;

  const projectOrigin = `https://${projectRef}.supabase.co`;
  const appOrigin = portal ? HOSTED_PORTAL_ORIGIN : `https://${deploymentHost}`;
  // Production intentionally uses the approved stable portal alias. Preview
  // remains bound to the exact per-deployment hostname supplied by Vercel.
  if (portal && (projectRef !== HOSTED_PORTAL_PROJECT_REF || region !== HOSTED_PORTAL_REGION
      || env.SELQIRO_V2_APP_ORIGIN !== HOSTED_PORTAL_ORIGIN)) return null;
  if (env.NEXT_PUBLIC_SUPABASE_URL !== projectOrigin
      || (env.SELQIRO_V2_APP_ORIGIN !== undefined && env.SELQIRO_V2_APP_ORIGIN !== appOrigin)) return null;
  const publicKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const s3AccessKeyId = env.SELQIRO_V2_S3_ACCESS_KEY_ID, s3SecretAccessKey = env.SELQIRO_V2_S3_SECRET_ACCESS_KEY;
  if (!legacyKey(publicKey, "anon", projectRef, nowMs) || !legacyKey(serviceKey, "service_role", projectRef, nowMs)
      || !serverCredential(s3AccessKeyId) || !serverCredential(s3SecretAccessKey)) return null;

  const storageOrigin = `https://${projectRef}.storage.supabase.co`;
  const config: HostedPreviewConfig = Object.freeze({
    integrationScope: "hosted-preview-v1", deploymentTarget: portal ? "portal" : "preview",
    appOrigin, projectRef, instanceId, projectOrigin,
    publicKey, serviceKey, storageOrigin, s3Endpoint: `${storageOrigin}/storage/v1/s3`,
    s3Region: region, s3AccessKeyId, s3SecretAccessKey,
  });
  validatedConfigs.add(config);
  return config;
}

/** Prevent accidental use of copied, unvalidated or caller-built configurations.
 * This process-local marker is not a remote readiness or authorization assertion. */
export function isHostedPreviewConfig(value: unknown): value is HostedPreviewConfig {
  return value !== null && typeof value === "object" && Object.isFrozen(value) && validatedConfigs.has(value);
}
