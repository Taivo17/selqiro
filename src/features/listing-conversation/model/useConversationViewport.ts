"use client";
import { useLayoutEffect, useRef } from "react";

/** Fit the thread below the portal header to the *visible* browser viewport.
 * visualViewport supports keyboards that resize the visual but not layout viewport.
 * No viewport measurement changes a draft or generates a message/read mutation. */
export function useConversationViewport() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
        const phone = window.matchMedia("(max-width: 767px)").matches;
        const height = Math.max(120, bottom - element.getBoundingClientRect().top - (phone ? 0 : 16));
        element.style.setProperty("--chat-height", Math.round(height) + "px");
        element.dataset.chatCompact = height < 420 ? "true" : "false";
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    const observer = new ResizeObserver(measure);
    const header = document.querySelector("header");
    if (header) observer.observe(header);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, []);
  return root;
}
