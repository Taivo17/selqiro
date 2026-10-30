"use client";
import { useLayoutEffect, useRef } from "react";

/** Keep the composer inside the visible viewport, including native keyboard pan.
 * A panned/scrolled section must never increase its own height. During phone
 * composition the thread is anchored to the visual viewport instead of the page.
 * No measurement changes a draft or generates a message/read mutation. */
export function useConversationViewport() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0, typingSession = false;
    let restingHeight = window.visualViewport?.height ?? window.innerHeight;
    let previousWidth = window.innerWidth;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const visibleHeight = viewport?.height ?? window.innerHeight;
        const visibleTop = viewport?.offsetTop ?? 0;
        const phone = window.matchMedia("(max-width: 767px)").matches;
        const inputFocused = element.querySelector("textarea") === document.activeElement;
        const composerFocused = element.querySelector('form[data-composer-focused="true"]') !== null;
        if (inputFocused) typingSession = true;
        // Rotation changes the resting size. Pinch zoom remains browser-controlled.
        if (Math.abs(window.innerWidth - previousWidth) > 80) restingHeight = visibleHeight;
        previousWidth = window.innerWidth;
        const keyboard = phone && (viewport?.scale ?? 1) <= 1.05
          && ((typingSession && visibleHeight < restingHeight - 100) || (inputFocused && visibleHeight < 480));
        if (!keyboard && !inputFocused) {
          restingHeight = Math.max(visibleHeight, restingHeight);
          typingSession = false;
        }
        // Change positioning before reading the normal-flow rectangle on close.
        element.dataset.chatKeyboard = String(keyboard);
        element.style.setProperty("--chat-top", Math.round(visibleTop) + "px");
        const visibleInset = Math.max(0, element.getBoundingClientRect().top - visibleTop);
        const height = keyboard ? visibleHeight
          : Math.min(visibleHeight, Math.max(120, visibleHeight - visibleInset - (phone ? 0 : 16)));
        element.style.setProperty("--chat-height", Math.round(height) + "px");
        element.dataset.chatCompact = String(height < 420 || (phone && composerFocused));
        element.dataset.chatTight = String(height < 300);
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    element.addEventListener("focusin", measure);
    element.addEventListener("focusout", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    const observer = new ResizeObserver(measure);
    const header = document.querySelector("header");
    if (header) observer.observe(header);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      element.removeEventListener("focusin", measure);
      element.removeEventListener("focusout", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, []);
  return root;
}
