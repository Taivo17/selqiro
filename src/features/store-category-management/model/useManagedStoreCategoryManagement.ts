"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import type { StoreCategory } from "../../../entities/store-category/model/types";
import { managedStoreCategoryApi } from "../../../entities/store-category/api/managedStoreCategoriesClient";
import { StoreCategoryManagementError, type StoreCategoryManagementProblem } from "../../../entities/store-category/model/managedStoreCategories";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_STORAGE_KEY,
  identityChangePending } from "../../v2-shell/model/identityEvents";
import { STORE_CATEGORIES_CHANGED_EVENT } from "../../my-area/model/useMyAreaStoreCategories";
import { managementDraftCanSubmit, managementDraftCommand, managementDraftHasResult, managementDraftMatchesSnapshot,
  type StoreCategoryManagementEditor } from "./storeCategoryManagementDraft";

export type StoreCategoryManagementOutcome = {
  code: "created" | "renamed" | "deleted" | "review_matches" | "review_differs"; name: string; removedListingLinks?: number;
};
type State = {
  scope: string; categories: StoreCategory[]; loaded: boolean; loading: boolean;
  busy: null | "create" | "rename" | "delete"; editor: StoreCategoryManagementEditor | null;
  error: StoreCategoryManagementProblem | null; outcome: StoreCategoryManagementOutcome | null; reviewRequired: boolean;
};
const initial = (scope: string): State => ({ scope, categories: [], loaded: false, loading: true, busy: null,
  editor: null, error: null, outcome: null, reviewRequired: false });
const notify = () => window.dispatchEvent(new Event(STORE_CATEGORIES_CHANGED_EVENT));

/** One actor lifetime; uncertain writes retain their exact draft until manual readback. */
export function useManagedStoreCategoryManagement({ actor, blocked = false }: { actor: PublicationActor; blocked?: boolean }) {
  const key = useMemo(() => Object.freeze({ userId: actor.userId, identityId: actor.identityId }), [actor.userId, actor.identityId]);
  const scope = `${key.userId}:${key.identityId}`, scopeRef = useRef(scope), blockedRef = useRef(blocked);
  scopeRef.current = scope; blockedRef.current = blocked;
  const [state, setState] = useState(() => initial(scope));
  const stateRef = useRef(state), generation = useRef(0), live = useRef(false), locked = useRef(false);
  const controller = useRef<AbortController | null>(null), loadRef = useRef<(manual?: boolean) => Promise<void>>(async () => {});
  const update = (next: State) => { stateRef.current = next; setState(next); };
  const applies = (version: number) => live.current && generation.current === version && scopeRef.current === scope
    && !identityChangePending(key.userId) && !controller.current?.signal.aborted;
  const allowed = () => live.current && scopeRef.current === scope && stateRef.current.scope === scope
    && !blockedRef.current && !identityChangePending(key.userId);
  const invalidate = () => {
    ++generation.current; controller.current?.abort(); locked.current = false;
    if (live.current && scopeRef.current === scope) update({ ...initial(scope), loading: false, error: "context" });
  };
  async function load(manual = true) {
    if (!live.current || scopeRef.current !== scope || identityChangePending(key.userId) || locked.current || manual && blockedRef.current) return;
    locked.current = true; const version = ++generation.current;
    controller.current?.abort(); controller.current = new AbortController();
    const previous = stateRef.current.scope === scope ? stateRef.current : initial(scope);
    update({ ...previous, loading: true, busy: null, error: null, outcome: null });
    try {
      const snapshot = await managedStoreCategoryApi.read(key, controller.current.signal);
      if (!applies(version)) return;
      const matches = !!previous.editor && previous.reviewRequired && managementDraftHasResult(previous.editor, snapshot.categories);
      const stale = !!previous.editor && !matches && !managementDraftMatchesSnapshot(previous.editor, snapshot.categories);
      update({ ...previous, categories: snapshot.categories, loaded: true, loading: false, busy: null, reviewRequired: false,
        error: stale ? "stale" : null,
        outcome: previous.reviewRequired && previous.editor ? { code: matches ? "review_matches" : "review_differs", name: previous.editor.name } : null });
      notify();
    } catch (error) {
      if (!applies(version)) return;
      if (error instanceof StoreCategoryManagementError && error.code === "context") { invalidate(); return; }
      update({ ...previous, loading: false, busy: null, error: "read", outcome: null });
    } finally { if (version === generation.current) locked.current = false; }
  }
  loadRef.current = load;
  useEffect(() => {
    live.current = true; locked.current = false; update(initial(scope));
    const retire = () => invalidate();
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === ACTIVE_IDENTITY_STORAGE_KEY || event.key?.startsWith("sb-")) retire();
    };
    const subscription = supabaseBrowserClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || event === "USER_UPDATED" || session?.user.id !== key.userId) retire();
    }).data.subscription;
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, retire); window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, retire);
    window.addEventListener("storage", storage); void loadRef.current(false);
    return () => {
      live.current = false; invalidate(); subscription.unsubscribe();
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, retire); window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, retire);
      window.removeEventListener("storage", storage);
    };
    // The immutable verified actor defines the subscription and request lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const canEdit = () => allowed() && stateRef.current.loaded && !locked.current && !stateRef.current.reviewRequired;
  const begin = (editor: StoreCategoryManagementEditor) => {
    if (canEdit()) update({ ...stateRef.current, editor, error: null, outcome: null });
  };
  const beginCreate = (parentId: string | null = null) => {
    if (!canEdit() || parentId !== null && !stateRef.current.categories.some(row => row.id === parentId && row.parent_id === null)) return;
    begin({ kind: "create", categoryId: crypto.randomUUID(), parentId, name: "" });
  };
  const beginExisting = (kind: "rename" | "delete", categoryId: string) => {
    const row = stateRef.current.categories.find(category => category.id === categoryId);
    if (!row || kind === "delete" && stateRef.current.categories.some(category => category.parent_id === row.id)) return;
    begin({ kind, categoryId, parentId: row.parent_id, name: row.name, originalName: row.name });
  };
  const canSave = () => canEdit() && !stateRef.current.loading && stateRef.current.error === null
    && stateRef.current.outcome?.code !== "review_matches" && managementDraftCanSubmit(stateRef.current.editor, stateRef.current.categories);
  async function submit() {
    if (!canSave()) return;
    const previous = stateRef.current, editor = previous.editor!;
    locked.current = true; const version = ++generation.current;
    controller.current?.abort(); controller.current = new AbortController();
    update({ ...previous, busy: editor.kind, error: null, outcome: null });
    try {
      const receipt = await managedStoreCategoryApi.mutate(key, managementDraftCommand(editor), controller.current.signal);
      if (!applies(version)) return;
      const categories = previous.categories.filter(row => row.id !== receipt.categoryId);
      if (editor.kind !== "delete") categories.push({ id: receipt.categoryId, name: receipt.name, parent_id: receipt.parentId, sort_order: receipt.sortOrder });
      update({ ...previous, categories, busy: null, editor: null, error: null, reviewRequired: false,
        outcome: { code: editor.kind === "create" ? "created" : editor.kind === "rename" ? "renamed" : "deleted",
          name: receipt.name, removedListingLinks: receipt.removedListingLinks } });
      notify();
    } catch (error) {
      if (!applies(version)) return;
      const code = error instanceof StoreCategoryManagementError ? error.code : "unknown";
      if (code === "context") { invalidate(); return; }
      update({ ...previous, busy: null, error: code, outcome: null, reviewRequired: code === "unknown" });
    } finally { if (version === generation.current) locked.current = false; }
  }
  const current = state.scope === scope ? state : initial(scope);
  return { ...current, disabled: !allowed() || !current.loaded || current.loading || current.busy !== null || current.reviewRequired,
    canSubmit: canSave(), beginCreate, beginRename: (id: string) => beginExisting("rename", id),
    beginDelete: (id: string) => beginExisting("delete", id),
    changeName(name: string) {
      const previous = stateRef.current;
      if (canEdit() && previous.editor && previous.editor.kind !== "delete" && previous.outcome?.code !== "review_matches")
        update({ ...previous, editor: { ...previous.editor, name }, error: previous.error === "invalid" || previous.error === "duplicate" ? null : previous.error, outcome: null });
    },
    cancelEdit() { if (canEdit()) update({ ...stateRef.current, editor: null, error: null, outcome: null }); },
    submit, refresh: () => load(true),
  };
}
export type ManagedStoreCategoryManagement = ReturnType<typeof useManagedStoreCategoryManagement>;
