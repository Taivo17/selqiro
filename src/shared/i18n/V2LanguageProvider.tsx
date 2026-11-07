"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../../../lib/useAuth";
import type { Language } from "../../../lib/i18n/translations";
import { getCatalogTranslation, normalizeLanguage, type MessageCatalog, type TranslationParams } from "../../../lib/i18n/useTranslation";
import { supabaseBrowserClient } from "../supabase/browserClient";

type Status = "loading" | "ready" | "saving" | "error";
type Preference = { userId: string | null; language: Language; status: Status; error: "load" | "save" | null };
type LanguageContext = {
  language: Language;
  status: Status;
  error: Preference["error"];
  signedIn: boolean;
  canChange: boolean;
  setLanguage: (language: Language) => Promise<boolean>;
  refresh: () => void;
};

const initial: Preference = { userId: null, language: "en", status: "loading", error: null };
const V2LanguageContext = createContext<LanguageContext>({
  language: "en", status: "ready", error: null, signedIn: false, canChange: false,
  setLanguage: async () => false, refresh: () => {},
});

async function withinDeadline<T>(operation: () => PromiseLike<T>, abort: AbortController): Promise<T> {
  let rejectAborted: () => void = () => {};
  const interrupted = new Promise<never>((_resolve, reject) => {
    rejectAborted = () => reject(new Error("language_request_interrupted"));
    abort.signal.addEventListener("abort", rejectAborted, { once: true });
    if (abort.signal.aborted) rejectAborted();
  });
  const deadline = setTimeout(() => abort.abort(), 12_000);
  try {
    return await Promise.race([Promise.resolve().then(operation), interrupted]);
  } finally {
    clearTimeout(deadline);
    abort.signal.removeEventListener("abort", rejectAborted);
  }
}

/** One account preference for the entire V2 route tree; changing it never keys/remounts children. */
export default function V2LanguageProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const [preference, setPreference] = useState<Preference>(initial);
  const [readVersion, setReadVersion] = useState(0);
  const requestVersion = useRef(0);
  const liveUserId = useRef<string | null | undefined>(undefined);
  const requestAbort = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const mounted = useRef(false);

  const refresh = useCallback(() => {
    if (!saving.current) setReadVersion(value => value + 1);
  }, []);

  useEffect(() => {
    mounted.current = true;
    // Synchronous invalidation only: never start Supabase work inside its auth callback.
    const { data } = supabaseBrowserClient.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      const nextUserId = event === "SIGNED_OUT" ? null : session?.user.id ?? null;
      if (nextUserId === liveUserId.current) return;
      liveUserId.current = nextUserId;
      ++requestVersion.current;
      requestAbort.current?.abort();
      saving.current = false;
      setPreference({ ...initial, userId: nextUserId });
    });
    window.addEventListener("focus", refresh);
    return () => {
      mounted.current = false;
      ++requestVersion.current;
      requestAbort.current?.abort();
      data.subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    const version = ++requestVersion.current;
    requestAbort.current?.abort();
    saving.current = false;
    liveUserId.current = userId;
    if (auth.loading || auth.error) {
      setPreference({ ...initial, userId, status: auth.error ? "error" : "loading", error: auth.error ? "load" : null });
      return;
    }
    if (!userId) {
      setPreference(current => current.userId === null && current.status === "ready"
        ? current : { ...initial, status: "ready" });
      return;
    }
    const abort = new AbortController();
    requestAbort.current = abort;
    const current = () => mounted.current && requestVersion.current === version && liveUserId.current === userId;
    setPreference(previous => ({
      userId, language: previous.userId === userId ? previous.language : "en", status: "loading", error: null,
    }));
    void (async () => {
      try {
        const { data, error } = await withinDeadline(() => supabaseBrowserClient.from("profiles")
          .select("language").eq("id", userId).abortSignal(abort.signal).maybeSingle(), abort);
        if (error || abort.signal.aborted) throw new Error("language_read_unavailable");
        if (current()) setPreference({ userId, language: normalizeLanguage(data?.language), status: "ready", error: null });
      } catch {
        if (current()) setPreference(previous => ({
          userId, language: previous.userId === userId ? previous.language : "en", status: "error", error: "load",
        }));
      }
    })();
    return () => { abort.abort(); };
  }, [auth.loading, auth.error, userId, readVersion]);

  const language = !auth.loading && preference.userId === userId ? preference.language : "en";
  const status: Status = auth.loading || preference.userId !== userId ? "loading" : preference.status;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => () => { document.documentElement.lang = "en"; }, []);

  const setLanguage = useCallback(async (requested: Language): Promise<boolean> => {
    if ((requested !== "en" && requested !== "et") || auth.loading || auth.error || saving.current) return false;
    if (liveUserId.current !== userId) return false;
    if (!userId) {
      // Visitors may choose a language for this visit. No second persisted preference is created.
      setPreference({ userId: null, language: requested, status: "ready", error: null });
      return true;
    }
    const version = ++requestVersion.current;
    requestAbort.current?.abort();
    const abort = new AbortController();
    requestAbort.current = abort;
    saving.current = true;
    const current = () => mounted.current && version === requestVersion.current && liveUserId.current === userId;
    const previousLanguage = preference.userId === userId ? preference.language : "en";
    setPreference({ userId, language: previousLanguage, status: "saving", error: null });
    try {
      await withinDeadline(async () => {
        const before = await supabaseBrowserClient.auth.getUser();
        if (!current() || before.error || before.data.user?.id !== userId || abort.signal.aborted) throw new Error("language_actor_changed");
        const result = await supabaseBrowserClient.from("profiles").update({ language: requested })
          .eq("id", userId).select("id,language").abortSignal(abort.signal).maybeSingle();
        if (!current() || result.error || result.data?.id !== userId || result.data?.language !== requested || abort.signal.aborted) {
          throw new Error("language_save_unconfirmed");
        }
        const after = await supabaseBrowserClient.auth.getUser();
        if (!current() || after.error || after.data.user?.id !== userId || abort.signal.aborted) throw new Error("language_actor_changed");
      }, abort);
      if (!current()) return false;
      setPreference({ userId, language: requested, status: "ready", error: null });
      return true;
    } catch {
      if (current()) setPreference({ userId, language: previousLanguage, status: "error", error: "save" });
      return false;
    } finally {
      if (current()) saving.current = false;
    }
  }, [auth.loading, auth.error, userId, preference.userId, preference.language]);

  const value = useMemo<LanguageContext>(() => ({
    language, status, error: preference.userId === userId ? preference.error : null,
    signedIn: !!userId, canChange: !auth.loading && !auth.error && status !== "loading" && status !== "saving",
    setLanguage, refresh: auth.error ? auth.retry : refresh,
  }), [language, status, preference.userId, preference.error, userId, auth.loading, auth.error, auth.retry, setLanguage, refresh]);

  return <V2LanguageContext.Provider value={value}>{children}</V2LanguageContext.Provider>;
}

export function useV2Language() { return useContext(V2LanguageContext); }

export function useV2Translation<Key extends string>(catalog: MessageCatalog<Key>) {
  const { language } = useV2Language();
  const t = useCallback((key: Key, params?: TranslationParams) =>
    getCatalogTranslation(language, catalog, key, params), [language, catalog]);
  return { language, t };
}
