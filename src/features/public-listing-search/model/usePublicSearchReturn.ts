"use client";

import { useEffect } from "react";
import { clearListingReturnContext, getCurrentRelativeUrl, isListingReturnNavigation, readListingReturnContext }
  from "../../listing-navigation/model/listingReturnContext";

/** Search-only restoration. Does not change the existing public-profile return contract. */
export function usePublicSearchReturn(ready: boolean, ids: string[], scope: string) {
  const idsKey = ids.join(",");
  useEffect(() => {
    if (!ready) return;
    const context = readListingReturnContext();
    if (!context || context.source !== "products" || context.sourceUrl !== getCurrentRelativeUrl() ||
        !isListingReturnNavigation(context)) return;
    const saved = context;
    let active = true;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const timers: ReturnType<typeof setTimeout>[] = [];
    function stop(clear: boolean) {
      active = false; timers.forEach(clearTimeout); window.history.scrollRestoration = previous;
      if (clear) clearListingReturnContext(saved);
    }
    function userMoved() { stop(true); }
    function align() {
      if (!active) return;
      const card = Array.from(document.querySelectorAll<HTMLElement>("[data-listing-card-id]"))
        .find(el => el.dataset.listingCardId === saved.listingId);
      const top = card ? window.scrollY + card.getBoundingClientRect().top - saved.cardViewportTop : saved.scrollY;
      window.scrollTo({top: Math.max(0, top), behavior: "auto"});
    }
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
      window.addEventListener(event, userMoved, {passive: true});
    for (const delay of [0, 120, 360]) timers.push(setTimeout(() => {
      align(); if (delay === 360 && active) stop(true);
    }, delay));
    return () => {
      stop(false);
      for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
        window.removeEventListener(event, userMoved);
    };
  }, [ready, idsKey, scope]);
}
