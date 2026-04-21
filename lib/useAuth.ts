"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type UseAuthReturn = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const loadSession = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("getSession error:", error);
          applySession(null);
          return;
        }

        applySession(currentSession ?? null);
      } catch (error) {
        console.error("Unexpected getSession error:", error);
        applySession(null);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      applySession(nextSession ?? null);
    });

    const refreshIfNeeded = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!currentSession?.refresh_token) {
          applySession(currentSession ?? null);
          return;
        }

        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
          console.error("refreshSession error:", error);

          const {
            data: { session: fallbackSession },
          } = await supabase.auth.getSession();

          applySession(fallbackSession ?? null);
          return;
        }

        applySession(data.session ?? null);
      } catch (error) {
        console.error("Unexpected refreshSession error:", error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshIfNeeded();
      }
    };

    const handleWindowFocus = () => {
      refreshIfNeeded();
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = window.setInterval(() => {
      refreshIfNeeded();
    }, 5 * 60 * 1000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, []);

  return { user, session, loading };
}