"use client";

import {
  useEffect,
  useRef,
} from "react";
import {
  clearListingReturnContext,
  getCurrentRelativeUrl,
  isListingReturnNavigation,
  readListingReturnContext,
  type ListingReturnSource,
} from "./listingReturnContext";

const RESTORE_DELAYS_MS = [
  0,
  120,
  360,
];

function findListingCard(
  listingId: string
): HTMLElement | null {
  const elements =
    document.querySelectorAll<HTMLElement>(
      "[data-listing-card-id]"
    );

  for (const element of elements) {
    if (
      element.dataset
        .listingCardId ===
      listingId
    ) {
      return element;
    }
  }

  return null;
}

export function
useListingReturnRestoration(input: {
  source: ListingReturnSource;
  ready: boolean;
  listingIds: string[];
}) {
  const restorationStartedRef =
    useRef(false);

  const listingIdsKey =
    input.listingIds.join(
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
      readListingReturnContext();

    if (
      !context ||
      context.source !==
        input.source ||
      context.sourceUrl !==
        getCurrentRelativeUrl() ||
      !isListingReturnNavigation(
        context
      )
    ) {
      return;
    }

    /*
     * Keep a stable non-null alias for callbacks that
     * execute after this synchronous guard. TypeScript
     * deliberately does not retain the nullable
     * variable narrowing across those closures.
     */
    const restorationContext =
      context;

    restorationStartedRef.current =
      true;

    let cancelled = false;
    let finished = false;

    const timerIds: number[] =
      [];

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

    const listingAvailable =
      input.listingIds.includes(
        restorationContext.listingId
      );

    function alignReturnPosition() {
      if (cancelled) {
        return;
      }

      const card =
        listingAvailable
          ? findListingCard(
              restorationContext.listingId
            )
          : null;

      if (!card) {
        window.scrollTo({
          top: restorationContext.scrollY,
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
            restorationContext.cardViewportTop
        );

      window.scrollTo({
        top: targetScrollY,
        behavior: "auto",
      });
    }

    function finishRestoration() {
      if (
        cancelled ||
        finished
      ) {
        return;
      }

      finished = true;

      alignReturnPosition();

      clearListingReturnContext(
        restorationContext
      );

      if (
        previousScrollRestoration !==
        null
      ) {
        window.history.scrollRestoration =
          previousScrollRestoration;
      }
    }

    const frameId =
      window.requestAnimationFrame(
        () => {
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

      window.cancelAnimationFrame(
        frameId
      );

      for (
        const timerId of timerIds
      ) {
        window.clearTimeout(
          timerId
        );
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
    input.source,
    listingIdsKey,
  ]);
}
