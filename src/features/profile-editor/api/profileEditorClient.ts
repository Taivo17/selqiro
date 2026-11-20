import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { parseProfileSnapshot, profileActorArgs, profileEditorFailure, profileSaveArgs, ProfileEditorError,
  sameProfilePatch, type ProfileEditorContext, type ProfileEditorPatch, type ProfileIdentityType } from "../model/profileEditor";

async function rpc(name: string, args: object, context: ProfileEditorContext): Promise<unknown> {
  if (context.signal.aborted || !context.accessToken) throw new ProfileEditorError("authChanged");
  const controller = new AbortController(), abort = () => controller.abort();
  const timer = setTimeout(abort, 20000);
  context.signal.addEventListener("abort", abort, {once: true});
  try {
    // Pin the captured account's token; the RPC also rechecks both expected IDs atomically.
    const {data, error} = await supabaseBrowserClient.rpc(name, args)
      .setHeader("Authorization", `Bearer ${context.accessToken}`).abortSignal(controller.signal);
    if (context.signal.aborted || controller.signal.aborted) throw new ProfileEditorError("unknown");
    if (error) throw profileEditorFailure(error);
    return data;
  } catch (error) { throw profileEditorFailure(error); }
  finally { clearTimeout(timer); context.signal.removeEventListener("abort", abort); }
}

export async function readProfileEditor(context: ProfileEditorContext) {
  return parseProfileSnapshot(await rpc("get_my_profile_editor_v1", profileActorArgs(context), context), context);
}
export async function saveProfileEditor(context: ProfileEditorContext, revision: string | null, patch: ProfileEditorPatch, identityType: ProfileIdentityType) {
  const args = profileSaveArgs(context, revision, patch, identityType);
  const saved = parseProfileSnapshot(await rpc("save_my_profile_editor_v1", args, context), context);
  if (saved.identity_type !== identityType || saved.revision === null || saved.revision === revision
    || !sameProfilePatch(saved, args.p_patch)) throw new ProfileEditorError("unknown");
  return saved;
}
export const profileEditorClient = {read: readProfileEditor, save: saveProfileEditor};
export type ProfileEditorClient = typeof profileEditorClient;
