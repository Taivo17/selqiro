"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { horseStoreCategoryApi } from "../../../entities/horse-offer/api/horseStoreCategoriesClient";
import { sameHorseCategoryIds, HorseStoreCategoryError,
  type HorseStoreCategorySnapshot } from "../../../entities/horse-offer/model/storeCategories";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_STORAGE_KEY,
  identityChangePending } from "../../v2-shell/model/identityEvents";

type State = {
  scope: string; categories: HorseStoreCategorySnapshot["categories"]; savedCategoryIds: string[];
  selectedCategoryIds: string[]; loaded: boolean; loading: boolean; saving: boolean; reviewRequired: boolean;
  error: string | null; message: string | null;
};
const initial = (scope: string): State => ({ scope, categories: [], savedCategoryIds: [], selectedCategoryIds: [],
  loaded: false, loading: true, saving: false, reviewRequired: false, error: null, message: null });

/** Independent from the text/price session and photo operations. No horse publication, owner refresh,
 * page remount, local storage or automatic replay is part of a category save. */
export function useHorseStoreCategories({ actor, offerId, blocked = false }: {
  actor: PublicationActor; offerId: string; blocked?: boolean;
}) {
  const key = useMemo(() => Object.freeze({ userId: actor.userId, identityId: actor.identityId, offerId }),
    [actor.userId, actor.identityId, offerId]);
  const scope = `${key.userId}:${key.identityId}:${key.offerId}`;
  const scopeRef = useRef(scope), blockedRef = useRef(blocked);
  scopeRef.current = scope; blockedRef.current = blocked;
  const [state, setState] = useState(() => initial(scope));
  const stateRef = useRef(state), generation = useRef(0), live = useRef(false), locked = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const loadRef = useRef<(manual?: boolean) => Promise<void>>(async () => {});
  const update = (next: State) => { stateRef.current = next; setState(next); };
  const applies = (version: number) => live.current && generation.current === version && scopeRef.current === scope
    && !identityChangePending(key.userId) && !controller.current?.signal.aborted;
  const invalidate = () => {
    ++generation.current; controller.current?.abort(); locked.current = false;
    if (live.current && scopeRef.current === scope)
      update({ ...initial(scope), loading: false, error: "storeAssignmentContextChanged" });
  };
  const allowed = () => live.current && scopeRef.current === scope && stateRef.current.scope === scope
    && !blockedRef.current && !identityChangePending(key.userId);
  async function load(manual = true) {
    if (!live.current || scopeRef.current !== scope || identityChangePending(key.userId)
      || locked.current || manual && blockedRef.current) return;
    // Taking the lock before yielding prevents repeated read/save clicks in one tick.
    locked.current = true; const version = ++generation.current;
    controller.current?.abort(); controller.current = new AbortController();
    const previous = stateRef.current.scope === scope ? stateRef.current : initial(scope);
    const preserve = previous.loaded && (previous.reviewRequired
      || !sameHorseCategoryIds(previous.savedCategoryIds, previous.selectedCategoryIds));
    update({ ...previous, loading: true, saving: false, error: null, message: null });
    try {
      const snapshot = await horseStoreCategoryApi.read(key, controller.current.signal);
      if (!applies(version)) return;
      const selectedCategoryIds = preserve ? previous.selectedCategoryIds : snapshot.categoryIds;
      update({ ...previous, categories: snapshot.categories, savedCategoryIds: snapshot.categoryIds, selectedCategoryIds,
        loaded: true, loading: false, saving: false, reviewRequired: false, error: null,
        message: previous.reviewRequired ? sameHorseCategoryIds(snapshot.categoryIds, selectedCategoryIds)
          ? "storeSelectionVerified" : "storeSelectionDiffers" : null });
    } catch (error) {
      if (!applies(version)) return;
      if (error instanceof HorseStoreCategoryError && error.code === "context") { invalidate(); return; }
      update({ ...previous, loading: false, saving: false, error: "storeAssignmentReadFailed", message: null });
    } finally { if (version === generation.current) locked.current = false; }
  }
  loadRef.current = load;
  useEffect(() => {
    live.current = true; locked.current = false;
    update(initial(scope));
    const retire = () => invalidate();
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === ACTIVE_IDENTITY_STORAGE_KEY || event.key?.startsWith("sb-")) retire();
    };
    const subscription = supabaseBrowserClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || event === "USER_UPDATED" || session?.user.id !== key.userId) retire();
    }).data.subscription;
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, retire);
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, retire);
    window.addEventListener("storage", storage);
    void loadRef.current(false);
    return () => {
      live.current = false; invalidate();
      subscription.unsubscribe(); window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, retire);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, retire); window.removeEventListener("storage", storage);
    };
    // This lifetime is exactly the immutable actor + identity + horse key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
  function canChange() {
    const current = stateRef.current;
    return allowed() && !locked.current && current.loaded && !current.loading && !current.saving
      && !current.reviewRequired && !current.error;
  }
  function select(categoryIds: string[]) {
    if (!canChange()) return;
    update({ ...stateRef.current, selectedCategoryIds: [...categoryIds].sort(), error: null, message: null });
  }
  function toggleCategory(categoryId: string) {
    const current = stateRef.current;
    if (!canChange() || !current.categories.some(category => category.id === categoryId)) return;
    select(current.selectedCategoryIds.includes(categoryId)
      ? current.selectedCategoryIds.filter(id => id !== categoryId) : [...current.selectedCategoryIds, categoryId]);
  }
  async function saveSelection() {
    const current = stateRef.current;
    if (!canChange() || sameHorseCategoryIds(current.savedCategoryIds, current.selectedCategoryIds)
      || current.selectedCategoryIds.some(id => !current.categories.some(category => category.id === id))) return;
    const requested = [...current.selectedCategoryIds];
    locked.current = true; const version = ++generation.current;
    controller.current?.abort(); controller.current = new AbortController();
    update({ ...current, saving: true, error: null, message: null });
    try {
      const receipt = await horseStoreCategoryApi.save(key, requested, controller.current.signal);
      if (!applies(version)) return;
      update({ ...current, savedCategoryIds: receipt.categoryIds, selectedCategoryIds: receipt.categoryIds,
        saving: false, error: null, message: receipt.assignedCount === 0 ? "storeAssignmentsRemoved"
          : receipt.assignedCount === 1 ? "storeAssignmentOneSaved" : "storeAssignmentCountSaved" });
    } catch (error) {
      if (!applies(version)) return;
      const problem = error instanceof HorseStoreCategoryError ? error : new HorseStoreCategoryError("unknown");
      if (problem.code === "context") { invalidate(); return; }
      update({ ...current, saving: false, reviewRequired: problem.code === "unknown", error: problem.message, message: null });
    } finally { if (version === generation.current) locked.current = false; }
  }
  // Old render handlers and old responses cannot expose a new route's previous scope.
  const visible = state.scope === scope ? state : initial(scope);
  const dirty = !sameHorseCategoryIds(visible.savedCategoryIds, visible.selectedCategoryIds);
  const missingCategoryCount = visible.selectedCategoryIds.filter(id => !visible.categories.some(category => category.id === id)).length;
  const disabled = blocked || visible.loading || visible.saving || !visible.loaded || visible.reviewRequired || !!visible.error;
  return { ...visible, dirty, missingCategoryCount, disabled, canSave: !disabled && dirty && missingCategoryCount === 0,
    toggleCategory, clearSelection: () => select([]), resetSelection: () => select(stateRef.current.savedCategoryIds),
    saveSelection, refresh: () => loadRef.current(true) };
}
