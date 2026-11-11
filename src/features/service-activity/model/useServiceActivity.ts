"use client";
import {useEffect, useRef, useState} from "react";
import type {PublicationActor} from "../../../entities/listing/model/publicationJourney";
import type {ServiceActivitySnapshot} from "../../../entities/service/model/serviceActivity";
import {ACTIVE_IDENTITY_CHANGING_EVENT, ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_STORAGE_KEY} from "../../v2-shell/model/identityEvents";
import {ServiceActivitySession, type ServiceActivityView} from "./serviceActivitySession";

export type ServiceActivityControlOptions = {
  actor: PublicationActor; serviceId: string; scopeKey: string;
  refreshKey?: string;
  initial?: ServiceActivitySnapshot; enabled?: boolean; blocked?: boolean;
  canAct: () => boolean; onVerified?: (snapshot: ServiceActivitySnapshot) => void;
  onBusyChange?: (busy: boolean) => void; onCheckRequired?: (required: boolean) => void;
};
const empty: ServiceActivityView = {snapshot: null, phase: "loading", notice: null};

export function useServiceActivity(options: ServiceActivityControlOptions) {
  const latest = useRef(options); latest.current = options;
  const [state, setState] = useState<{key: string; view: ServiceActivityView}>({key: "", view: empty});
  const session = useRef<ServiceActivitySession | null>(null);
  const refreshed = useRef(options.refreshKey);
  const key = `${options.actor.userId}:${options.actor.identityId}:${options.serviceId}:${options.scopeKey}`;
  const enabled = options.enabled !== false;
  useEffect(() => {
    if (!enabled) return;
    const own: ServiceActivitySession = new ServiceActivitySession({actor: options.actor, serviceId: options.serviceId, initial: latest.current.initial,
      canAct: (): boolean => session.current === own && latest.current.enabled !== false && latest.current.canAct(),
      blocked: () => !!latest.current.blocked,
      onVerified: snapshot => latest.current.onVerified?.(snapshot)});
    session.current = own;
    const update = () => {
      if (session.current !== own) return;
      const view = own.getSnapshot(); setState({key, view});
      latest.current.onBusyChange?.(["renewing", "checking"].includes(view.phase));
      latest.current.onCheckRequired?.(view.phase === "blocked");
    };
    const unsubscribe = own.subscribe(update);
    const invalidate = () => own.retire();
    const storage = (event: StorageEvent) => {if (event.key === null || event.key === ACTIVE_IDENTITY_STORAGE_KEY || event.key?.startsWith("sb-")) invalidate();};
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, invalidate);
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, invalidate);
    window.addEventListener("storage", storage);
    update(); if (!latest.current.initial) void own.read();
    return () => {
      unsubscribe(); own.retire(); if (session.current === own) session.current = null;
      latest.current.onBusyChange?.(false); latest.current.onCheckRequired?.(false);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, invalidate);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, invalidate); window.removeEventListener("storage", storage);
    };
    // Actor objects may be recreated while rendering; scopeKey is the identity generation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  useEffect(() => {if (options.initial) session.current?.replace(options.initial);}, [options.initial]);
  useEffect(() => {if (refreshed.current !== options.refreshKey) {
    refreshed.current = options.refreshKey; session.current?.refresh();
  }}, [options.refreshKey]);
  return {view: enabled && state.key === key ? state.view : empty,
    open: () => session.current?.open(), cancel: () => session.current?.cancel(),
    confirm: () => void session.current?.confirm(), check: () => void session.current?.read(true)};
}
