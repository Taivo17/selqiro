import "server-only";
import { loopbackOrigin } from "../../../shared/config/v2Integration";
import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";

export type LocalIntegrationConfig = Readonly<{
  appOrigin: string; projectOrigin: string; publicKey: string; serviceKey: string; runId: string;
  s3Endpoint: string; s3Region: string; s3AccessKeyId: string; s3SecretAccessKey: string; s3TenantId: string;
}>;

/** No default credentials, remote destination, production flag or fallback connection. */
export function localIntegrationConfig(env: NodeJS.ProcessEnv = process.env): LocalIntegrationConfig | null {
  if (env.NODE_ENV === "production" || env.VERCEL !== undefined || env.SELQIRO_V2_LOCAL_INTEGRATION !== "v1"
      || env.NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION !== "v1" || !isUploadUuid(env.SELQIRO_V2_RUN_ID)) return null;
  const appOrigin = loopbackOrigin(env.SELQIRO_V2_APP_ORIGIN);
  const projectOrigin = loopbackOrigin(env.NEXT_PUBLIC_SUPABASE_URL);
  if (!appOrigin || !projectOrigin) return null;
  let s3: URL;
  try { s3 = new URL(env.SELQIRO_V2_S3_ENDPOINT ?? ""); } catch { return null; }
  if (!loopbackOrigin(s3.origin) || s3.username || s3.password || s3.hash || s3.search
      || !["/storage/v1/s3", "/s3"].includes(s3.pathname)) return null;
  const values = [env.NEXT_PUBLIC_SUPABASE_ANON_KEY, env.SUPABASE_SERVICE_ROLE_KEY,
    env.SELQIRO_V2_S3_REGION, env.SELQIRO_V2_S3_ACCESS_KEY_ID, env.SELQIRO_V2_S3_SECRET_ACCESS_KEY, env.SELQIRO_V2_S3_TENANT_ID];
  if (values.some(v => !v || v.length > 8192 || /\s/.test(v))) return null;
  return Object.freeze({ appOrigin, projectOrigin, runId: env.SELQIRO_V2_RUN_ID!,
    publicKey: values[0]!, serviceKey: values[1]!, s3Region: values[2]!,
    s3AccessKeyId: values[3]!, s3SecretAccessKey: values[4]!, s3TenantId: values[5]!, s3Endpoint: s3.href });
}

/** A loopback URL can be a tunnel. Check a random run marker in the actual fresh DB
 * on every HTTP action, including media reads. This function is absent in production. */
export async function assertDisposableDatabase(c: LocalIntegrationConfig, signal?: AbortSignal, fetcher: UploadFetch = fetch) {
  const r = await privateUploadHttp(fetcher, c.projectOrigin + "/rest/v1/rpc/assert_selqiro_disposable_v2", {
    method: "POST", headers: { apikey: c.serviceKey, authorization: "Bearer " + c.serviceKey, "content-type": "application/json" },
    body: JSON.stringify({ p_run_id: c.runId }),
  }, { signal, responseBytes: 2048 });
  if (r.status !== 200 || !r.json || typeof r.json !== "object" || Array.isArray(r.json)
      || Object.keys(r.json).sort().join(",") !== "run_id,scope"
      || (r.json as Record<string, unknown>).run_id !== c.runId
      || (r.json as Record<string, unknown>).scope !== "disposable-v2") throw new Error("integration_unverified");
}
