import { PRIVATE_UPLOAD, PrivateUploadError, uploadFail } from "../../listing/model/privatePublicationUpload";
import type { UploadFetch } from "../../listing/api/privateUploadHttp";
/** Read-only service owner pages can contain 50 descriptions and galleries.
 * Their separate 4 MiB bound does not relax private upload command envelopes.
 * Bounded response/deadline, no retries and no remote error text in exceptions.
 * Aborting local I/O is NOT proof of rollback, missing object or revoked capability. */
export async function serviceOwnerPageHttp(fetcher: UploadFetch, url: string, init: RequestInit, options: {
  signal?: AbortSignal; timeoutMs?: number; responseBytes?: number;
  /** Explicit structured-error opt-in. The caller must allowlist safe fields;
   * the same byte/deadline/JSON limits apply and errors never become exceptions. */
  readErrorStatuses?: readonly number[];
} = {}): Promise<{ status: number; json: unknown }> {
  const timeoutMs = options.timeoutMs ?? PRIVATE_UPLOAD.rpcTimeoutMs;
  const max = options.responseBytes ?? 4 * 1024 * 1024;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > PRIVATE_UPLOAD.uploadTimeoutMs ||
      !Number.isSafeInteger(max) || max < 1 || max > 4 * 1024 * 1024) return uploadFail("configuration");
  if (options.readErrorStatuses !== undefined && (!Array.isArray(options.readErrorStatuses)
      || options.readErrorStatuses.length > 8 || options.readErrorStatuses.some(status =>
        !Number.isInteger(status) || status < 400 || status > 599))) return uploadFail("configuration");
  const readErrors = new Set(options.readErrorStatuses ?? []);
  if (options.signal?.aborted) return uploadFail("aborted");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectDeadline: (reason: PrivateUploadError) => void = () => {};
  const deadline = new Promise<never>((_, reject) => { rejectDeadline = reject; });
  const abort = () => { controller.abort(); rejectDeadline(new PrivateUploadError("aborted")); };
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  timer = setTimeout(() => { controller.abort(); rejectDeadline(new PrivateUploadError("outcome_unknown")); }, timeoutMs);
  const operation = (async () => {
    if (controller.signal.aborted) return uploadFail("aborted");
    const res = await fetcher(url, { ...init, headers: new Headers(init.headers),
      signal: controller.signal, redirect: "error", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
    if (controller.signal.aborted) { void res.body?.cancel().catch(() => {}); return uploadFail("outcome_unknown"); }
    if (res.redirected || !Number.isInteger(res.status) || res.status < 100 || res.status > 599) return uploadFail("invalid_response");
    if ((res.status < 200 || res.status >= 300) && !readErrors.has(res.status)) {
      void res.body?.cancel().catch(() => {}); return { status: res.status, json: null };
    }
    const declared = res.headers.get("content-length");
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > max)) return uploadFail("invalid_response");
    if (!res.body) return uploadFail("invalid_response");
    const reader = res.body.getReader(); const chunks: Uint8Array[] = []; let count = 0;
    try {
      while (true) {
        const item = await reader.read();
        if (controller.signal.aborted) return uploadFail("outcome_unknown");
        if (item.done) break;
        count += item.value.byteLength;
        if (count > max) return uploadFail("invalid_response");
        chunks.push(item.value.slice());
      }
      if (declared !== null && !res.headers.has("content-encoding") && count !== Number(declared)) return uploadFail("invalid_response");
      const all = new Uint8Array(count); let offset = 0;
      for (const b of chunks) { all.set(b, offset); offset += b.length; }
      const json: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(all));
      return { status: res.status, json };
    } finally { void reader.cancel().catch(() => {}); }
  })();
  try { return await Promise.race([operation, deadline]); }
  catch (error) { if (error instanceof PrivateUploadError) throw error; return uploadFail("outcome_unknown"); }
  finally { clearTimeout(timer); options.signal?.removeEventListener("abort", abort); controller.abort(); }
}
