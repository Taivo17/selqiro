import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { fail, row } from "./finalContract";

const taskKeys = ["schema_version", "object_id", "work_key", "bucket_id", "object_path", "try_count", "lease_until_epoch"] as const;
const uuid = (value: unknown): value is string => typeof value === "string" && value.length === 36 && isUploadUuid(value);
type Scope = Readonly<{attemptId: string; requestKey: string}>;

/** SQL has already authorized this exact parent/child binding under its actor
 * lock. Normalize that scoped receipt for the unchanged one-object cleaner.
 * Legacy claims can name only the original attempt's own objects. */
export function cleanupFamilyTask(value: unknown, scope: Scope, suffix?: string): unknown {
  if (value === null) return null;
  const raw = row(value);
  const family = raw.schema_version === 2;
  const task = row(value, family ? [...taskKeys, "attempt_id", "request_key", "origin_attempt_id", "origin_request_key"] : taskKeys);
  let origin = scope.attemptId;
  if (family) {
    if (task.attempt_id !== scope.attemptId || task.request_key !== scope.requestKey
      || !uuid(task.origin_attempt_id) || !uuid(task.origin_request_key)
      || task.origin_attempt_id === scope.attemptId && task.origin_request_key !== scope.requestKey) return fail("response");
    origin = String(task.origin_attempt_id);
  } else if (task.schema_version !== 1) return fail("response");
  const path = task.object_path;
  if (typeof path !== "string" || !path.startsWith(`v1/${origin}/`)
    || suffix !== undefined && !path.endsWith(suffix)) return fail("response");
  return Object.fromEntries(taskKeys.map(key => [key, key === "schema_version" ? 1 : task[key]]));
}
