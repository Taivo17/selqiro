"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: "timeout" | "unavailable" | null;
};

type UseAuthReturn = AuthState & { retry: () => void };

const pending: AuthState = { user: null, session: null, loading: true, error: null };

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>(pending);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);

  const retry = useCallback(() => {
    // Retire an old read immediately, before React cleans up its effect.
    ++generation.current;
    setState(pending);
    setAttempt(value => value + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    let reading = true;
    const currentGeneration = ++generation.current;
    const current = () => mounted && currentGeneration === generation.current;

    const fail = (error: Exclude<AuthState["error"], null>) => {
      if (!current() || !reading) return;
      reading = false;
      clearTimeout(deadline);
      setState({ user: null, session: null, loading: false, error });
    };
    const deadline = setTimeout(() => fail("timeout"), 15_000);

    const accept = (session: Session | null) => {
      if (!current()) return;
      reading = false;
      clearTimeout(deadline);
      setState({ user: session?.user ?? null, session, loading: false, error: null });
    };

    let subscription: { unsubscribe: () => void } | undefined;
    try {
      subscription = supabase.auth.onAuthStateChange((event, nextSession) => {
        // getSession exposes bootstrap errors; INITIAL_SESSION may turn them
        // into null. Only later auth events supersede that explicit read.
        // This callback stays synchronous and never re-enters the auth lock.
        if (event === "INITIAL_SESSION") return;
        accept(event === "SIGNED_OUT" ? null : nextSession ?? null);
      }).data.subscription;

      void supabase.auth.getSession().then(({ data, error }) => {
        // A sign-out/account change, timeout or manual retry retires this read.
        if (!current() || !reading) return;
        if (error) fail("unavailable");
        else accept(data.session ?? null);
      }).catch(() => fail("unavailable"));
    } catch {
      fail("unavailable");
    }

    return () => {
      mounted = false;
      clearTimeout(deadline);
      subscription?.unsubscribe();
    };
  }, [attempt]);

  return { ...state, retry };
}
