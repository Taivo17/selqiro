/** Coarse request-local timings only. Labels are fixed; no request data is kept. */
const stages = ["gate", "image_auth", "source_session", "source_finalize", "source_read",
  "sanitize", "web_session", "web_write", "web_finalize", "web_read", "owner_rpc"] as const;
export type PublicationTimingStage = typeof stages[number];
export type PublicationTimingSink = (stage: PublicationTimingStage, milliseconds: number) => void;
type Clock = () => number;
const now: Clock = () => performance.now();
const maxMilliseconds = 600_000;

function readClock(clock: Clock): number | null {
  try { const value = clock(); return Number.isFinite(value) ? value : null; }
  catch { return null; }
}

/** Observability must never suppress, repeat, change or replace the operation. */
export async function timePublicationStage<T>(sink: PublicationTimingSink | undefined,
    stage: PublicationTimingStage, operation: () => Promise<T>, clock: Clock = now): Promise<T> {
  if (!sink) return operation();
  const started = readClock(clock);
  try { return await operation(); }
  finally {
    const ended = started === null ? null : readClock(clock);
    if (started !== null && ended !== null && ended >= started) {
      try { sink(stage, ended - started); } catch { /* Timing cannot change the result. */ }
    }
  }
}

export function createPublicationTiming(clock: Clock = now) {
  const started = readClock(clock);
  const durations = new Map<PublicationTimingStage, number>();
  const record: PublicationTimingSink = (stage, milliseconds) => {
    if (!stages.includes(stage) || !Number.isFinite(milliseconds) || milliseconds < 0) return;
    durations.set(stage, Math.min(maxMilliseconds, (durations.get(stage) ?? 0) + milliseconds));
  };
  return Object.freeze({record, header(): string {
    try {
      const values = stages.flatMap(stage => {
        const duration = durations.get(stage);
        return duration === undefined ? [] : [`${stage};dur=${duration.toFixed(1)}`];
      });
      const ended = started === null ? null : readClock(clock);
      if (started !== null && ended !== null && ended >= started)
        values.push(`total;dur=${Math.min(maxMilliseconds, ended - started).toFixed(1)}`);
      // At most 12 fixed metrics; no descriptions, URLs, IDs or arbitrary labels.
      return values.join(", ");
    } catch { return ""; }
  }});
}
