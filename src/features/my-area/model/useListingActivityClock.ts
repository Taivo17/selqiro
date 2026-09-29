"use client";
import { useEffect, useState } from "react";
/** One display clock for the list; no network polling or automatic renewal. */
export function useListingActivityClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  return now;
}
