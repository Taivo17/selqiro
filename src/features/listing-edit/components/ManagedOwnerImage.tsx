"use client";
import {useEffect, useRef, useState} from "react";
import {supabaseBrowserClient} from "../../../shared/supabase/browserClient";
import type {PublicationActor} from "../../../entities/listing/model/publicationJourney";
import {managedListingMedia} from "../../../entities/listing/model/listingMediaUrl";
import {ACTIVE_IDENTITY_CHANGED_EVENT} from "../../v2-shell/model/useV2IdentitySwitcher";
type Props = {source: string; actor: PublicationActor; className?: string; compact?: boolean};
type ImageState = {phase: "loading" | "ready" | "error" | "unavailable"; url: string | null};

export default function ManagedOwnerImage(props: Props) {
  // A new actor/source must never render the previous private object URL, even
  // during the render before the previous effect's cleanup runs.
  return <BoundOwnerImage key={JSON.stringify([props.actor.userId, props.actor.identityId, props.source])} {...props} />;
}

function BoundOwnerImage({source, actor, className = "", compact = false}: Props) {
  const [state, setState] = useState<ImageState>({phase: "loading", url: null});
  const [retry, setRetry] = useState(0);
  const imageEvents = useRef<{url: string; loaded: () => void; failed: () => void} | null>(null);
  useEffect(() => {
    let active = true, objectUrl: string | null = null;
    let deadline: ReturnType<typeof setTimeout> | null = null;
    const abort = new AbortController();
    const clearDeadline = () => { if (deadline !== null) clearTimeout(deadline); deadline = null; };
    const release = () => {
      active = false; abort.abort(); clearDeadline(); imageEvents.current = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    };
    const fail = () => { if (active) { release(); setState({phase: "error", url: null}); } };
    const drop = () => { release(); setState({phase: "unavailable", url: null}); };
    setState({phase: "loading", url: null});
    // Includes auth, the response body and browser image decoding. A failed
    // preview can be retried by its owner; it never starts an automatic loop.
    deadline = setTimeout(fail, 30_000);
    const subscription = supabaseBrowserClient.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT" || next?.user.id !== actor.userId) drop();
    }).data.subscription;
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, drop);
    void (async () => {
      try {
        const target = managedListingMedia(source); if (!target) { fail(); return; }
        const {data, error} = await supabaseBrowserClient.auth.getSession();
        if (!active) return;
        if (error) { fail(); return; }
        if (data.session?.user.id !== actor.userId) { drop(); return; }
        const r = await fetch(`/api/v2/listing-owner-media/${target.attemptId}/${target.ordinal}`, {headers: {
          authorization: "Bearer " + data.session.access_token, "x-selqiro-user": actor.userId, "x-selqiro-identity": actor.identityId},
          signal: abort.signal, cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer"});
        if (!active || r.status !== 200 || r.headers.get("content-type") !== "image/webp" || !r.body) {
          void r.body?.cancel().catch(() => {}); fail(); return;
        }
        const reader = r.body.getReader(), chunks: Uint8Array<ArrayBuffer>[] = []; let length = 0;
        try { while (true) { const value = await reader.read(); if (value.done) break;
          length += value.value.length; if (length > 4 * 1024 * 1024 || !active) throw new Error("image_bound"); chunks.push(new Uint8Array(value.value)); } }
        finally { void reader.cancel().catch(() => {}); }
        if (active) {
          objectUrl = URL.createObjectURL(new Blob(chunks, {type: "image/webp"}));
          const currentUrl = objectUrl;
          imageEvents.current = {url: currentUrl, failed: fail, loaded: () => {
            if (active && objectUrl === currentUrl) { clearDeadline(); setState({phase: "ready", url: currentUrl}); }
          }};
          setState({phase: "loading", url: currentUrl});
        }
      } catch { fail(); }
    })();
    return () => { release(); subscription.unsubscribe(); window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, drop); };
  }, [source, actor.userId, actor.identityId, retry]);
  return <div className={className + " relative overflow-hidden bg-neutral-100"} aria-busy={state.phase === "loading"}>
    {state.url ? <img src={state.url} alt="Kuulutuse avaldatud pilt"
      className={"h-full w-full object-contain" + (state.phase === "loading" ? " opacity-0" : "")}
      onLoad={event => { if (imageEvents.current?.url === event.currentTarget.src) imageEvents.current.loaded(); }}
      onError={event => { if (imageEvents.current?.url === event.currentTarget.src) imageEvents.current.failed(); }} /> : null}
    {state.phase !== "ready" ? <div className={"absolute inset-0 flex flex-col items-center justify-center text-center " + (compact ? "p-1 text-xs" : "gap-2 p-3 text-sm")}>
      <p role="status" className={compact && state.phase === "error" ? "sr-only" : undefined}>{state.phase === "loading" ? (compact ? "Laadin…" : "Laadin pilti…") : state.phase === "error"
        ? "Pildi eelvaadet ei saanud laadida." : (compact ? "Pilt pole saadaval" : "Pildi vaatamiseks kontrolli aktiivset kontot.")}</p>
      {state.phase === "error" ? <button type="button" onClick={() => setRetry(value => value + 1)}
        aria-label="Laadi kuulutuse pilt uuesti"
        className={"min-h-10 rounded-full border border-neutral-300 bg-white font-bold " + (compact ? "px-2" : "px-4")}>Proovi uuesti</button> : null}
    </div> : null}
  </div>;
}
