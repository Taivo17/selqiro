"use client";
import Link from "next/link";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages } from "../model/listingEditMessages";
import {useEffect, useRef, useState} from "react";
import {supabaseBrowserClient} from "../../../shared/supabase/browserClient";
import type {PublicationActor} from "../../../entities/listing/model/publicationJourney";
import { ownerMediaRequestPath } from "../../../entities/marketplace-item/model/ownerMediaUrl";
import { ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_STORAGE_KEY,
  identityChangePending } from "../../v2-shell/model/identityEvents";
type Props = {source: string; actor: PublicationActor; className?: string; compact?: boolean;
  contentType?: "listing" | "horse_offer"; href?: string; linkLabel?: string};
type ImageState = {phase: "loading" | "ready" | "error" | "unavailable"; url: string | null};

export default function ManagedOwnerImage(props: Props) {
  // A new actor/source must never render the previous private object URL, even
  // during the render before the previous effect's cleanup runs.
  return <BoundOwnerImage key={JSON.stringify([props.actor.userId, props.actor.identityId, props.contentType ?? "listing", props.source])} {...props} />;
}

function BoundOwnerImage({source, actor, className = "", compact = false, contentType = "listing", href, linkLabel}: Props) {
  const { t } = useV2Translation(listingEditMessages);

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
    const storage = (event: StorageEvent) => { if (event.key === ACTIVE_IDENTITY_STORAGE_KEY || event.key?.startsWith("sb-")) drop(); };
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, drop);
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, drop);
    window.addEventListener("storage", storage);
    void (async () => {
      try {
        const path = ownerMediaRequestPath(source, contentType); if (!path) { fail(); return; }
        if (identityChangePending(actor.userId)) { drop(); return; }
        const {data, error} = await supabaseBrowserClient.auth.getSession();
        if (!active) return;
        if (error) { fail(); return; }
        if (data.session?.user.id !== actor.userId || identityChangePending(actor.userId)) { drop(); return; }
        const r = await fetch(path, {headers: {
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
    return () => { release(); subscription.unsubscribe(); window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, drop);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, drop); window.removeEventListener("storage", storage); };
  }, [source, actor.userId, actor.identityId, contentType, retry]);
  return <div className={className + " relative overflow-hidden bg-neutral-100"} aria-busy={state.phase === "loading"}>
    {state.url ? <img src={state.url} alt={t("publishedListingImage")}
      className={"h-full w-full object-contain" + (state.phase === "loading" ? " opacity-0" : "")}
      onLoad={event => { if (imageEvents.current?.url === event.currentTarget.src) imageEvents.current.loaded(); }}
      onError={event => { if (imageEvents.current?.url === event.currentTarget.src) imageEvents.current.failed(); }} /> : null}
    {href ? <Link href={href} aria-label={linkLabel ?? t("publishedListingImage")}
      className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600" /> : null}
    {state.phase !== "ready" ? <div className={"pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center " + (compact ? "p-1 text-xs" : "gap-2 p-3 text-sm")}>
      <p role="status" className={compact && state.phase === "error" ? "sr-only" : undefined}>{state.phase === "loading" ? (compact ? t("loading") : t("loadingImage")) : state.phase === "error"
        ? t("imagePreviewFailed") : (compact ? t("imageUnavailable") : t("checkAccountForPhoto"))}</p>
      {state.phase === "error" ? <button type="button" onClick={() => setRetry(value => value + 1)}
        aria-label={t("reloadListingPhoto")}
        className={"pointer-events-auto relative z-20 min-h-10 rounded-full border border-neutral-300 bg-white font-bold " + (compact ? "px-2" : "px-4")}>{t("tryAgain")}</button> : null}
    </div> : null}
  </div>;
}
