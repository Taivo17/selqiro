import type { UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { WEB_IMAGE, WebImageError, webFail } from "./webImageContract";
/** Full object only: no range, redirects, content decoding, cache or metadata-as-proof.
 * The deadline also covers a hung response body. Abort is NOT remote write settlement. */
export async function readWebObjectBytes(fetcher: UploadFetch, url: string, headers: Record<string,string>,
    maxBytes: number, expectedType: "image/webp" | null, signal?: AbortSignal,
    timeoutMs = WEB_IMAGE.transferTimeoutMs): Promise<Buffer | null> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes<1 || maxBytes>WEB_IMAGE.sourceMax ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs<1 || timeoutMs>WEB_IMAGE.transferTimeoutMs) return webFail("configuration");
  if (signal?.aborted) return webFail("aborted");
  const controller = new AbortController();
  let rejectDeadline: (reason: WebImageError) => void = () => {};
  const deadline = new Promise<never>((_,reject) => { rejectDeadline = reject; });
  const abort = () => { controller.abort(); rejectDeadline(new WebImageError("aborted")); };
  signal?.addEventListener("abort",abort,{once:true}); if(signal?.aborted) abort();
  const timer = setTimeout(() => { controller.abort(); rejectDeadline(new WebImageError("outcome_unknown")); },timeoutMs);
  const operation = (async () => {
    if(controller.signal.aborted) return webFail("aborted");
    const response = await fetcher(url,{ method:"GET",headers:new Headers({...headers,"accept-encoding":"identity","cache-control":"no-store"}),
      signal:controller.signal,redirect:"error",credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer" });
    const cancel = () => { void response.body?.cancel().catch(() => {}); };
    if(controller.signal.aborted) { cancel(); return webFail("outcome_unknown"); }
    if(response.redirected) { cancel(); return webFail("invalid_response"); }
    if(response.status === 404) { cancel(); return null; } // only NOT READY, never permission to remove/retry a write
    if(response.status===401 || response.status===403) { cancel(); return webFail("unauthorized"); }
    if(response.status!==200) { cancel(); return webFail("outcome_unknown"); }
    const length = response.headers.get("content-length"), encoding = response.headers.get("content-encoding");
    if((encoding!==null && encoding!=="identity") || response.headers.has("content-range") ||
      (length!==null && (!/^(0|[1-9][0-9]*)$/.test(length) || Number(length)>maxBytes)) ||
      (expectedType!==null && response.headers.get("content-type")!==expectedType) || !response.body) {
      cancel(); return webFail("invalid_response");
    }
    const reader = response.body.getReader(); const chunks: Buffer[]=[]; let total=0;
    try {
      while(true) {
        const item=await reader.read(); if(controller.signal.aborted) return webFail("outcome_unknown");
        if(item.done) break;
        total+=item.value.byteLength; if(total>maxBytes) return webFail("invalid_response");
        chunks.push(Buffer.from(item.value));
      }
      if(total===0 || (length!==null && total!==Number(length))) return webFail("invalid_response");
      return Buffer.concat(chunks,total);
    } finally { void reader.cancel().catch(() => {}); }
  })();
  try { return await Promise.race([operation,deadline]); }
  catch(error) { if(error instanceof WebImageError) throw error; return webFail("outcome_unknown"); }
  finally { clearTimeout(timer); signal?.removeEventListener("abort",abort); controller.abort(); }
}
