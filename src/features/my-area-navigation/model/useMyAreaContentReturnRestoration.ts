"use client";

import {
  useEffect,
  useRef,
} from "react";
import {
  clearMyAreaContentReturnContext,
  getCurrentMyAreaRelativeUrl,
  isMyAreaContentReturnNavigation,
  readMyAreaContentReturnContext,
  type MyAreaContentType,
} from "./myAreaContentReturnContext";

const RESTORE_DELAYS_MS = [
  0,
  120,
  360,
  720,
  1200,
  1800,
];

function findContentCard(input: {
  contentType: MyAreaContentType;
  contentId: string;
}): HTMLElement | null {
  const elements =
    document.querySelectorAll<HTMLElement>(
      "[data-my-area-content-card]"
    );

  for (const element of elements) {
    if (
      element.dataset
        .myAreaContentType ===
        input.contentType &&
      element.dataset
        .myAreaContentId ===
        input.contentId
    ) {
      return element;
    }
  }

  return null;
}

export function
useMyAreaContentReturnRestoration(input: {
  contentType: MyAreaContentType;
  ready: boolean;
  contentIds: string[];
}) {
  const restorationStartedRef =
    useRef(false);

  const contentIdsKey =
    input.contentIds.join(
      "\u001f"
    );

  useEffect(() => {
    if (
      !input.ready ||
      restorationStartedRef.current
    ) {
      return;
    }

    const context =
      readMyAreaContentReturnContext();

    if (
      !context ||
      context.contentType !==
        input.contentType ||
      context.sourceUrl !==
        getCurrentMyAreaRelativeUrl() ||
      !isMyAreaContentReturnNavigation(
        context
      )
    ) {
      return;
    }

    restorationStartedRef.current =
      true;

    /*
     * TypeScript ei säilita `context` null-kitsendust
     * hiljem käivitatavate sisemiste funktsioonide sees.
     * Pärast kontrolli loodud alias on kindlalt mitte-null.
     */
    const returnContext = context;

    let cancelled = false;
    let finished = false;

    const timerIds: number[] = [];

    let firstFrameId:
      | number
      | null = null;

    let secondFrameId:
      | number
      | null = null;

    let observerFrameId:
      | number
      | null = null;

    let resizeObserver:
      | ResizeObserver
      | null = null;

    const previousScrollRestoration =
      "scrollRestoration" in
      window.history
        ? window.history
            .scrollRestoration
        : null;

    if (
      previousScrollRestoration !==
      null
    ) {
      window.history.scrollRestoration =
        "manual";
    }

    const contentAvailable =
      input.contentIds.includes(
        returnContext.contentId
      );

    function alignReturnPosition() {
      if (cancelled) {
        return;
      }

      const card =
        contentAvailable
          ? findContentCard({
              contentType:
                returnContext.contentType,
              contentId:
                returnContext.contentId,
            })
          : null;

      if (!card) {
        window.scrollTo({
          top: returnContext.scrollY,
          behavior: "auto",
        });

        return;
      }

      const currentCardTop =
        card.getBoundingClientRect()
          .top;

      const targetScrollY =
        Math.max(
          0,
          window.scrollY +
            currentCardTop -
            returnContext.cardViewportTop
        );

      window.scrollTo({
        top: targetScrollY,
        behavior: "auto",
      });
    }

    function scheduleAlignment() {
      if (cancelled) {
        return;
      }

      if (
        observerFrameId !== null
      ) {
        window.cancelAnimationFrame(
          observerFrameId
        );
      }

      observerFrameId =
        window.requestAnimationFrame(
          () => {
            observerFrameId = null;
            alignReturnPosition();
          }
        );
    }

    function finishRestoration() {
      if (
        cancelled ||
        finished
      ) {
        return;
      }

      finished = true;

      resizeObserver?.disconnect();
      resizeObserver = null;

      alignReturnPosition();

      clearMyAreaContentReturnContext(
        returnContext
      );

      if (
        previousScrollRestoration !==
        null
      ) {
        window.history.scrollRestoration =
          previousScrollRestoration;
      }
    }

    if (
      "ResizeObserver" in window
    ) {
      resizeObserver =
        new ResizeObserver(
          scheduleAlignment
        );

      resizeObserver.observe(
        document.body
      );
    }

    firstFrameId =
      window.requestAnimationFrame(
        () => {
          secondFrameId =
            window.requestAnimationFrame(
              () => {
                for (
                  const delay of
                    RESTORE_DELAYS_MS
                ) {
                  const timerId =
                    window.setTimeout(
                      () => {
                        if (
                          delay ===
                            RESTORE_DELAYS_MS[
                              RESTORE_DELAYS_MS.length -
                                1
                            ]
                        ) {
                          finishRestoration();
                          return;
                        }

                        alignReturnPosition();
                      },
                      delay
                    );

                  timerIds.push(
                    timerId
                  );
                }
              }
            );
        }
      );

    return () => {
      cancelled = true;

      resizeObserver?.disconnect();

      if (
        firstFrameId !== null
      ) {
        window.cancelAnimationFrame(
          firstFrameId
        );
      }

      if (
        secondFrameId !== null
      ) {
        window.cancelAnimationFrame(
          secondFrameId
        );
      }

      if (
        observerFrameId !== null
      ) {
        window.cancelAnimationFrame(
          observerFrameId
        );
      }

      for (const timerId of timerIds) {
        window.clearTimeout(timerId);
      }

      if (
        !finished &&
        previousScrollRestoration !==
          null
      ) {
        window.history.scrollRestoration =
          previousScrollRestoration;
      }
    };
  }, [
    input.ready,
    input.contentType,
    contentIdsKey,
  ]);
}
