"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { parsePublicSearch, publicSearchError, publicSearchUrl,
  type PublicSearchInput, type PublicSearchFields }
  from "../../../entities/listing/model/publicSearch";
import { clearListingReturnContext } from "../../listing-navigation/model/listingReturnContext";

type SearchState = ReturnType<typeof parsePublicSearch>;

export function usePublicSearchUrl() {
  const serialized = useSearchParams().toString();
  const [state, setState] = useState<SearchState>(() =>
    parsePublicSearch(new URLSearchParams(serialized)));
  // Ref composes successive changes in the same event; state controls the inputs.
  // Never overwrite either with a lagging router snapshot during render.
  const current = useRef(state.input);

  useEffect(() => {
    // A native history update may reach Next after a newer keystroke. Only accept
    // the router snapshot if it still describes the browser's current address.
    if (window.location.pathname !== "/v2/products") return;
    const live = new URLSearchParams(window.location.search).toString();
    if (serialized !== live) return;
    const next = parsePublicSearch(new URLSearchParams(serialized));
    current.current = next.input;
    setState(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, [serialized]);

  useEffect(() => {
    function readHistory() {
      if (window.location.pathname !== "/v2/products") return;
      const next = parsePublicSearch(new URLSearchParams(window.location.search));
      current.current = next.input;
      setState(next);
    }
    // Back/Forward must win even when the router snapshot has not caught up.
    window.addEventListener("popstate", readHistory);
    return () => window.removeEventListener("popstate", readHistory);
  }, []);

  function replace(next: PublicSearchInput) {
    const input = {...next};
    current.current = input;
    // Controlled values must update synchronously, independently of navigation.
    setState({input, error: publicSearchError(input)});
    const url = publicSearchUrl(input);
    if (url === window.location.pathname + window.location.search) return;
    try {
      clearListingReturnContext();
      // Next copies its own history metadata. Passing window.history.state here
      // forwards internal router markers and bypasses its URL notification.
      window.history.replaceState(null, "", url);
    } catch {
      setState({input, error: "Otsinguaadressi ei saanud uuendada. Proovi uuesti või värskenda lehte."});
    }
  }
  function change(fields: Partial<PublicSearchFields>) {
    replace({...current.current, ...fields, offset: 0});
  }
  return {...state, change, replace,
    goToOffset: (offset: number) => replace({...current.current, offset})};
}
