"use client";
import {useEffect, useRef, useState} from "react";
import {publicationJourneyRequest, putPublicationPart} from "../../../entities/listing/api/publicationJourneyClient";
import {readManagedListingImages} from "../../../entities/listing/api/managedListingImagesClient";
import type {ManagedListingImagesKey} from "../../../entities/listing/model/managedListingImages";
import {publicationUploadOrigin} from "../../../shared/config/v2Integration";
import {supabaseBrowserClient} from "../../../shared/supabase/browserClient";
import {ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT} from "../../v2-shell/model/identityEvents";
import {ManagedPhotoAdditionSession, type PhotoAdditionView, type RunPhotoAddition} from "./managedPhotoAdditionSession";

export function useManagedPhotoAddition(key: ManagedListingImagesKey, runOperation: RunPhotoAddition) {
  const runner = useRef(runOperation); runner.current = runOperation;
  const session = useRef<ManagedPhotoAdditionSession | null>(null);
  const [view, setView] = useState<PhotoAdditionView>({phase: "idle", message: ""});
  const [ready, setReady] = useState(false), [contextVersion, setContextVersion] = useState(0);
  const {userId, identityId, listingId, attemptId} = key;
  useEffect(() => {
    let active = true;
    const bound = Object.freeze({userId, identityId, listingId, attemptId});
    const journalKey = `selqiro:v2:listing-photo-addition:1:${userId}:${identityId}:${listingId}:${attemptId}`;
    const drop = () => { session.current?.invalidate(); session.current = null; if (active) setReady(false); };
    const resolved = () => { drop(); if (active) setContextVersion(value => value + 1); };
    const auth = supabaseBrowserClient.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT" || next && next.user.id !== userId) drop();
    }).data.subscription;
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, drop);
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, resolved);
    try {
      const controller = new ManagedPhotoAdditionSession({key: bound,
        projectOrigin: process.env.NEXT_PUBLIC_SUPABASE_URL!, storageOrigin: publicationUploadOrigin(),
        readJournal: () => { const value = localStorage.getItem(journalKey); return value ? JSON.parse(value) : null; },
        writeJournal: value => localStorage.setItem(journalKey, JSON.stringify(value)),
        clearJournal: () => localStorage.removeItem(journalKey),
        runOwnerOperation: (expected, work) => runner.current(expected, work),
        withLock: async work => {
          if (!navigator.locks) throw new Error("lock_unavailable");
          return navigator.locks.request(journalKey, {ifAvailable: true}, lock => {
            if (!lock) throw new Error("busy_elsewhere"); return work();
          });
        },
        request: (action, args, signal) => publicationJourneyRequest(bound, action, args, signal),
        readGallery: readManagedListingImages, putPart: putPublicationPart,
        uuid: () => crypto.randomUUID(),
        digest: async bytes => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await bytes.arrayBuffer())),
          byte => byte.toString(16).padStart(2, "0")).join(""),
      });
      session.current = controller;
      controller.subscribe(next => { if (active && session.current === controller) setView(next); });
      void controller.inspect().finally(() => { if (active && session.current === controller) setReady(true); });
    } catch { setView({phase: "unknown", message: "Foto lisamist ei saanud ette valmistada. Värskenda lehte ja proovi uuesti."}); }
    return () => {
      active = false; drop(); auth.unsubscribe();
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, drop);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, resolved);
    };
  }, [userId, identityId, listingId, attemptId, contextVersion]);
  return {session, view, ready};
}
