import type { Viewport } from "next";
import type { ReactNode } from "react";

// Android Chrome normally resizes only the visual viewport for its keyboard.
// This conversation uses the resized layout viewport; the viewport hook remains
// the fallback for browsers that ignore this hint. Browser zoom stays enabled.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function ConversationLayout({ children }: { children: ReactNode }) {
  return children;
}
