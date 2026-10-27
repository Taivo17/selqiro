import { HOSTED_PORTAL_ORIGIN, HOSTED_PORTAL_PROJECT_REF,
  HOSTED_PREVIEW_RELEASE_ID, type HostedPreviewCapability } from "./hostedPreviewProtocol";

/** These choices select UI contracts. Server Auth and database authority remain
 * mandatory; a public flag or browser value is never an authorization decision. */
export function loopbackOrigin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    return u.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname)
      && !u.username && !u.password && !u.search && !u.hash && u.pathname === "/"
      && u.origin === value && u.port ? u.origin : null;
  } catch { return null; }
}

function localIntegrationEnabled(): boolean {
  return process.env.NODE_ENV !== "production"
    && process.env.NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION === "v1"
    && !!loopbackOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && (typeof window === "undefined" || !!loopbackOrigin(window.location.origin));
}

export function hostedPreviewRequested(): boolean {
  return process.env.NODE_ENV === "production"
    && process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW === "v1"
    && process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL === undefined;
}

export function hostedPortalRequested(): boolean {
  return process.env.NODE_ENV === "production"
    && process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL === "v1"
    && process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW === undefined
    && process.env.NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION === undefined
    && process.env.NEXT_PUBLIC_SUPABASE_URL === `https://${HOSTED_PORTAL_PROJECT_REF}.supabase.co`;
}

export function hostedPublicationRequested(): boolean {
  return hostedPreviewRequested() || hostedPortalRequested();
}

// Browser-only state is installed before the hosted subtree mounts. Server
// requests never write or read a process-global readiness decision.
let browserCapability: HostedPreviewCapability | null = null;
export function installHostedPreviewCapability(value: HostedPreviewCapability | null): boolean {
  if (typeof window === "undefined") return false;
  browserCapability = null;
  if (!hostedPublicationRequested() || process.env.NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION !== undefined || !value) return false;
  const project = /^https:\/\/([a-z]{20})\.supabase\.co$/.exec(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  if (!project || value.schemaVersion !== 1 || value.mode !== "hosted-preview-v1"
      || value.releaseId !== HOSTED_PREVIEW_RELEASE_ID
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.instanceId)
      || value.projectOrigin !== project[0] || value.storageOrigin !== `https://${project[1]}.storage.supabase.co`
      || value.appOrigin !== window.location.origin || !/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(value.appOrigin)) return false;
  if (hostedPortalRequested() && value.appOrigin !== HOSTED_PORTAL_ORIGIN) return false;
  browserCapability = Object.freeze({...value});
  return true;
}

export function v2IntegrationEnabled(): boolean {
  return localIntegrationEnabled() || (typeof window !== "undefined" && hostedPublicationRequested()
    && browserCapability !== null && browserCapability.appOrigin === window.location.origin
    && browserCapability.projectOrigin === process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function publicationUploadOrigin(): string | undefined {
  return v2IntegrationEnabled() && typeof window !== "undefined" && browserCapability
    ? browserCapability.storageOrigin : process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Navigation may preserve a V2 return link even before its DB readiness check.
 * This helper must not be used to select RPCs or grant publication access. */
export function v2NavigationContextEnabled(): boolean {
  return localIntegrationEnabled() || hostedPublicationRequested();
}

export function localPublicationOrigin(value: string): boolean {
  if (!localIntegrationEnabled() || value !== process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  return typeof window !== "undefined" ||
    (process.env.SELQIRO_V2_LOCAL_INTEGRATION === "v1" && process.env.VERCEL === undefined);
}
