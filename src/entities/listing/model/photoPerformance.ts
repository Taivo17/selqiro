/** Local, bounded timing only. No identifiers, photo contents, network or persistence. */
export type PhotoPerformanceStage = "preparation" | "upload" | "prepare" | "image_prepare" |
  "image_verify" | "status" | "append" | "gallery" | "publish" | "total";
type PhotoSizes = {inputBytes?: number; outputBytes?: number};
const stages = new Set<PhotoPerformanceStage>(["preparation", "upload", "prepare", "image_prepare",
  "image_verify", "status", "append", "gallery", "publish", "total"]);
const maxEntriesPerStage = 8;
const maxDurationMs = 600_000;
const maxPhotoBytes = 25 * 1024 * 1024;

function now(): number | null {
  try {
    if (typeof window === "undefined" || typeof performance === "undefined") return null;
    const value = performance.now();
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch { return null; }
}

/** Fixed names make the entries inspectable in browser performance tools without user data. */
export function recordPhotoTiming(stage: PhotoPerformanceStage, elapsedMs: number, sizes?: PhotoSizes): void {
  try {
    const end = now();
    if (end === null || !stages.has(stage) || !Number.isFinite(elapsedMs) || elapsedMs < 0) return;
    const name = "selqiro:photo:" + stage;
    const duration = Math.min(maxDurationMs, Math.round(elapsedMs * 10) / 10, end);
    const detail: PhotoSizes = {};
    for (const key of ["inputBytes", "outputBytes"] as const) {
      const value = sizes?.[key];
      if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maxPhotoBytes)
        detail[key] = value;
    }
    if (performance.getEntriesByName(name, "measure").length >= maxEntriesPerStage) performance.clearMeasures(name);
    performance.measure(name, {start: end - duration, end, detail});
  } catch { /* Optional instrumentation must never alter a photo operation. */ }
}

export async function measurePhotoTask<T>(stage: PhotoPerformanceStage, work: () => Promise<T>, sizes?: PhotoSizes): Promise<T> {
  const started = now();
  try { return await work(); }
  finally {
    const ended = now();
    if (started !== null && ended !== null) recordPhotoTiming(stage, ended - started, sizes);
  }
}
