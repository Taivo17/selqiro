import { getOwnerJobs, isRetryableOwnerJobReadError } from "../../../entities/job/api/jobClient";
import { JobError, type JobActor, type OwnerJobCursor } from "../../../entities/job/model/types";

type Authority = Readonly<{signal: AbortSignal;isCurrent: () => boolean}>;

function waitForRetry(signal: AbortSignal): Promise<void> {
  return new Promise((resolve,reject) => {
    if (signal.aborted) {reject(new JobError("forbidden")); return;}
    const cancel = () => {clearTimeout(timer); signal.removeEventListener("abort",cancel); reject(new JobError("forbidden"));};
    const timer = setTimeout(() => {signal.removeEventListener("abort",cancel); resolve();},350);
    signal.addEventListener("abort",cancel,{once: true});
  });
}

/** At most two reads of the same page. An actor change or unmount ends both attempts. */
export async function readOwnerJobsWithRecovery(expected: JobActor, cursor: OwnerJobCursor | null, signal: AbortSignal, authority: Authority) {
  const actor = Object.freeze({...expected}), pageCursor = cursor ? Object.freeze({...cursor}) : null;
  const controller = new AbortController(), cancel = () => controller.abort();
  signal.addEventListener("abort",cancel,{once: true});
  authority.signal.addEventListener("abort",cancel,{once: true});
  if (signal.aborted || authority.signal.aborted) cancel();
  const current = () => !controller.signal.aborted && authority.isCurrent();
  const read = async () => {
    if (!current()) throw new JobError("forbidden");
    const page = await getOwnerJobs(actor,pageCursor,controller.signal);
    if (!current()) throw new JobError("forbidden");
    return page;
  };
  try {
    try {return await read();}
    catch (error) {
      if (!current() || !isRetryableOwnerJobReadError(error)) throw error;
      await waitForRetry(controller.signal);
      return await read();
    }
  } finally {
    signal.removeEventListener("abort",cancel);
    authority.signal.removeEventListener("abort",cancel);
  }
}
