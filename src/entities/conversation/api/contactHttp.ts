import { contactFail, ListingContactError } from "../model/listingContact";
export type ContactFetch = (url: string, init: RequestInit) => Promise<Response>;

/** A conversation page contains up to 50 complete user messages. Its response
 * budget is therefore larger than the existing upload-receipt transport. */
export async function contactHttp(fetcher: ContactFetch, url: string, init: RequestInit, signal?: AbortSignal) {
  if (signal?.aborted) return contactFail("aborted");
  const controller = new AbortController();
  let rejectWait: (error: ListingContactError) => void = () => {};
  const wait = new Promise<never>((_, reject) => { rejectWait = reject; });
  const abort = () => { controller.abort(); rejectWait(new ListingContactError("aborted")); };
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(() => { controller.abort(); rejectWait(new ListingContactError("outcome_unknown")); }, 20000);
  const operation = (async () => {
    const response = await fetcher(url, { ...init, headers: new Headers(init.headers), signal: controller.signal,
      redirect: "error", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
    if (controller.signal.aborted) { void response.body?.cancel().catch(() => {}); return contactFail("outcome_unknown"); }
    if (response.redirected) return contactFail("response");
    if (!response.ok) { void response.body?.cancel().catch(() => {}); return { status: response.status, json: null }; }
    const declared = response.headers.get("content-length");
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > 2000000)) return contactFail("response");
    if (!response.body) return contactFail("response");
    const reader = response.body.getReader(); let count = 0; const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const result = await reader.read();
        if (controller.signal.aborted) return contactFail("outcome_unknown");
        if (result.done) break;
        count += result.value.byteLength; if (count > 2000000) return contactFail("response"); chunks.push(result.value.slice());
      }
      if (declared !== null && !response.headers.has("content-encoding") && count !== Number(declared)) return contactFail("response");
      const all = new Uint8Array(count); let offset = 0;
      for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
      return { status: response.status, json: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(all)) as unknown };
    } finally { void reader.cancel().catch(() => {}); }
  })();
  try { return await Promise.race([operation, wait]); }
  catch (error) { if (error instanceof ListingContactError) throw error; return contactFail("outcome_unknown"); }
  finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); controller.abort(); }
}
