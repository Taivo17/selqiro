"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

export default function PublicProfileServiceDescription({
  serviceId,
  description,
  expanded,
}: {
  serviceId: string;
  description: string;
  expanded: boolean;
}) {
  const [
    descriptionOpen,
    setDescriptionOpen,
  ] = useState(false);

  const [
    descriptionOverflowing,
    setDescriptionOverflowing,
  ] = useState(false);

  const descriptionRef =
    useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setDescriptionOpen(false);
    setDescriptionOverflowing(false);
  }, [
    serviceId,
    description,
    expanded,
  ]);

  useEffect(() => {
    if (
      !expanded ||
      descriptionOpen ||
      !description
    ) {
      return;
    }

    const initialElement =
      descriptionRef.current;

    if (!initialElement) {
      return;
    }

    function updateOverflowState() {
      const currentElement =
        descriptionRef.current;

      if (!currentElement) {
        return;
      }

      setDescriptionOverflowing(
        currentElement.scrollHeight >
          currentElement.clientHeight + 1
      );
    }

    const frameId =
      window.requestAnimationFrame(
        updateOverflowState
      );

    const resizeObserver =
      typeof ResizeObserver ===
      "undefined"
        ? null
        : new ResizeObserver(
            updateOverflowState
          );

    resizeObserver?.observe(
      initialElement
    );

    return () => {
      window.cancelAnimationFrame(
        frameId
      );

      resizeObserver?.disconnect();
    };
  }, [
    description,
    expanded,
    descriptionOpen,
  ]);

  if (!description) {
    return null;
  }

  const canToggle =
    expanded &&
    (
      descriptionOverflowing ||
      descriptionOpen
    );

  return (
    <div className="mt-2 min-w-0">
      <p
        ref={descriptionRef}
        className={[
          "break-words text-sm leading-5 text-neutral-500",
          expanded
            ? descriptionOpen
              ? ""
              : "line-clamp-6"
            : "line-clamp-3",
        ].join(" ")}
      >
        {description}
      </p>

      {canToggle ? (
        <button
          type="button"
          aria-expanded={
            descriptionOpen
          }
          onClick={() =>
            setDescriptionOpen(
              (current) => !current
            )
          }
          className="mt-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-700 shadow-sm transition hover:border-neutral-300"
        >
          {descriptionOpen
            ? "Näita vähem"
            : "Vaata rohkem"}
        </button>
      ) : null}
    </div>
  );
}
