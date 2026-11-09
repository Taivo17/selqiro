"use client";
import { useEffect, useRef, type RefObject } from "react";
import { currentServiceUrl, readServiceSourceReturn, type ServiceReturnContext } from "./serviceReturnContext";

/** Match the clicked card's viewport position after data and upper-page layout load. */
export function useServiceReturnRestoration(input: {
  context: ServiceReturnContext | null; visit: number; ready: boolean; serviceIds: string[];
  horizontalScrollRef?: RefObject<HTMLDivElement | null>;
}) {
  const completed = useRef<string | null>(null);
  const idsKey = input.serviceIds.join(",");
  useEffect(() => {
    const context = input.context, key = context ? `${context.token}:${input.visit}` : null;
    if (!context || !key || !input.ready || completed.current === key || context.sourceUrl !== currentServiceUrl()) return;
    const saved = context;
    let active = true, frame: number | null = null;
    const timers: number[] = [];
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    let observer: ResizeObserver | null = null;
    function stop(done: boolean) {
      if (!active) return;
      active = false;
      timers.forEach(id => window.clearTimeout(id));
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.history.scrollRestoration = previous;
      if (done) completed.current = key;
    }
    function align() {
      if (!active) return;
      if (saved.sourceUrl !== currentServiceUrl() || readServiceSourceReturn(saved.source)?.token !== saved.token) {
        stop(false); return;
      }
      if (saved.profile && !saved.profile.expanded && input.horizontalScrollRef?.current)
        input.horizontalScrollRef.current.scrollLeft = saved.profile.horizontalScrollLeft;
      const card = Array.from(document.querySelectorAll<HTMLElement>("[data-service-card-id]"))
        .find(element => element.dataset.serviceCardId === saved.serviceId);
      const top = card ? window.scrollY + card.getBoundingClientRect().top - saved.cardViewportTop : saved.scrollY;
      window.scrollTo({top: Math.max(0, top), behavior: "auto"});
    }
    function schedule() {
      if (!active || frame !== null) return;
      frame = window.requestAnimationFrame(() => {frame = null; align();});
    }
    const userMoved = () => stop(true);
    const leaving = () => stop(false);
    const inputs = ["wheel", "touchstart", "pointerdown", "keydown"];
    inputs.forEach(event => window.addEventListener(event, userMoved, {passive: true}));
    window.addEventListener("popstate", leaving);
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      observer.observe(document.body);
    }
    // The upper profile sections can resolve after the service data. Observe for
    // a bounded interval, while always yielding immediately to user interaction.
    for (const delay of [0, 120, 360, 720, 1200, 1800, 3000, 4500, 6000])
      timers.push(window.setTimeout(() => {align(); if (delay === 6000) stop(true);}, delay));
    return () => {
      stop(false);
      inputs.forEach(event => window.removeEventListener(event, userMoved));
      window.removeEventListener("popstate", leaving);
    };
  }, [input.context, input.visit, input.ready, input.horizontalScrollRef, idsKey]);
}
