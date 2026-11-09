"use client";
import { useEffect, useState } from "react";
import { readServiceSourceReturn, type ServiceReturnContext, type ServiceReturnSource } from "./serviceReturnContext";

export function useServiceReturnSnapshot(source: ServiceReturnSource, scope: string) {
  const [state, setState] = useState<{scope: string; ready: boolean; visit: number; context: ServiceReturnContext | null}>(
    {scope, ready: false, visit: 0, context: null});
  useEffect(() => {
    function read() {
      const context = readServiceSourceReturn(source);
      setState(previous => ({scope, ready: true, visit: previous.visit + 1, context}));
    }
    read();
    window.addEventListener?.("popstate", read);
    return () => window.removeEventListener?.("popstate", read);
  }, [source, scope]);
  return state.scope === scope ? state : {scope, ready: false, visit: 0, context: null};
}
