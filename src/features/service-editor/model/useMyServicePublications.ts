"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {setServiceOwnerStatus} from "../../../entities/service/api/servicePublicationClient";
import {listServiceOwnerActivities, readServiceOwnerActivity} from "../../../entities/service/api/serviceActivityClient";
import type {ServiceActivitySnapshot, ServiceOwnerActivitySnapshot} from "../../../entities/service/model/serviceActivity";
import {useConversationActor, type ConversationActorContext} from "../../listing-conversation/model/useConversationActor";

type State = {key: string; items: readonly ServiceOwnerActivitySnapshot[]; total: string; next: number | null;
  loading: boolean; moreLoading: boolean; error: boolean; busyId: string | null; uncertainIds: readonly string[];
  activityCheckIds: readonly string[]; notice: "statusChanged" | "statusError" | null};
const empty = (key: string): State => ({key, items: [], total: "0", next: null, loading: true,
  moreLoading: false, error: false, busyId: null, uncertainIds: [], activityCheckIds: [], notice: null});
const actorOf = (actor: ConversationActorContext) => ({userId: actor.expectedUserId, identityId: actor.expectedIdentityId});

/** Every visible row belongs to the current identity generation. A status write
 * is followed by an owner read; an uncertain result never becomes optimistic UI. */
export function useMyServicePublications() {
  const context = useConversationActor(), {actor, isCurrent} = context;
  const key = actor ? `${actor.expectedUserId}:${actor.expectedIdentityId}:${actor.generation}` : "";
  const [state, setState] = useState<State>(() => empty("")), [refreshCount, setRefreshCount] = useState(0);
  const current = useRef(state); current.current = state;
  const version = useRef(0), busy = useRef<string | null>(null), paging = useRef(false);
  const invalidate = useCallback(() => {version.current += 1;}, []);
  const reload = useCallback(() => {setRefreshCount(value => value + 1);}, []);
  useEffect(() => {
    const ownVersion = ++version.current; busy.current = null; paging.current = false; setState(empty(key));
    if (!actor) return;
    const abort = new AbortController(), invalidated = () => abort.abort(); actor.signal.addEventListener("abort", invalidated, {once: true});
    void listServiceOwnerActivities(actorOf(actor), abort.signal).then(page => {
      if (version.current !== ownVersion || !isCurrent(actor) || abort.signal.aborted) return;
      setState({...empty(key), items: page.items, total: page.totalCount, next: page.nextOffset, loading: false});
    }).catch(() => {
      if (version.current === ownVersion && isCurrent(actor) && !abort.signal.aborted) setState({...empty(key), loading: false, error: true});
    });
    return () => {invalidate(); abort.abort(); actor.signal.removeEventListener("abort", invalidated);};
  }, [actor, key, refreshCount, isCurrent, invalidate]);
  const loadMore = useCallback(async () => {
    const previous = current.current;
    if (!actor || !isCurrent(actor) || previous.key !== key || previous.next === null || previous.loading || paging.current) return;
    const ownVersion = version.current; paging.current = true;
    setState(value => ({...value, moreLoading: true, error: false}));
    try {
      const page = await listServiceOwnerActivities(actorOf(actor), actor.signal, previous.next);
      if (ownVersion !== version.current || !isCurrent(actor)) return;
      setState(value => {
        if (value.key !== key) return value;
        // Offset pages may overlap after another tab creates or removes a row.
        const ids = new Set(value.items.map(item => item.service.id));
        return {...value, items: [...value.items, ...page.items.filter(item => !ids.has(item.service.id))], total: page.totalCount, next: page.nextOffset, moreLoading: false};
      });
    } catch {if (ownVersion === version.current && isCurrent(actor)) setState(value => ({...value, moreLoading: false, error: true}));}
    finally {if (ownVersion === version.current) paging.current = false;}
  }, [actor, key, isCurrent]);
  const changeStatus = useCallback(async (row: ServiceOwnerActivitySnapshot, status: "published" | "archived") => {
    if (!actor || !isCurrent(actor) || current.current.key !== key || busy.current
      || current.current.uncertainIds.includes(row.service.id) || current.current.activityCheckIds.includes(row.service.id) || !current.current.items.includes(row)
      || row.service.status === "draft" || row.service.status === status) return;
    const ownVersion = version.current, id = row.service.id; busy.current = id;
    setState(value => ({...value, busyId: id, notice: null}));
    try {
      try {await setServiceOwnerStatus(actorOf(actor), id, row.editRevision, row.service.status, status, actor.signal);} catch { /* The owner read resolves both a lost reply and a conflict. */ }
      if (ownVersion !== version.current || !isCurrent(actor)) return;
      const verified = await readServiceOwnerActivity(actorOf(actor), id, actor.signal);
      if (ownVersion !== version.current || !isCurrent(actor)) return;
      if (!verified) throw new Error("service_unavailable");
      setState(value => ({...value, items: value.items.map(item => item.service.id === id ? verified : item),
        busyId: null, notice: verified.service.status === status ? "statusChanged" : "statusError"}));
    } catch {
      if (ownVersion === version.current && isCurrent(actor)) setState(value => ({...value, busyId: null,
        uncertainIds: [...value.uncertainIds.filter(value => value !== id), id], notice: "statusError"}));
    } finally {if (ownVersion === version.current) busy.current = null;}
  }, [actor, key, isCurrent]);
  const canActService = useCallback((id: string) => !!actor && isCurrent(actor) && current.current.key === key
    && (!busy.current || busy.current === id) && !current.current.uncertainIds.includes(id), [actor, key, isCurrent]);
  const activityBusy = useCallback((id: string, value: boolean) => {
    if (!actor || !isCurrent(actor) || current.current.key !== key || busy.current && busy.current !== id) return;
    busy.current = value ? id : null;
    setState(state => state.key !== key || state.busyId === (value ? id : null) ? state : {...state, busyId: value ? id : null});
  }, [actor, key, isCurrent]);
  const activityCheckRequired = useCallback((id: string, required: boolean) => {
    if (!actor || !isCurrent(actor)) return;
    setState(state => state.key !== key || state.activityCheckIds.includes(id) === required ? state : {...state,
      activityCheckIds: required ? [...state.activityCheckIds, id] : state.activityCheckIds.filter(item => item !== id)});
  }, [actor, key, isCurrent]);
  const adoptActivity = useCallback((snapshot: ServiceActivitySnapshot) => {
    if (!actor || !isCurrent(actor) || snapshot.identityId !== actor.expectedIdentityId) return;
    setState(state => state.key !== key ? state : {...state, items: state.items.map(row => row.service.id === snapshot.serviceId
      ? {...row, service: {...row.service, status: snapshot.status}, activity: snapshot.activity} : row)});
  }, [actor, key, isCurrent]);
  return {context, actor: actor ? actorOf(actor) : null, scopeKey: key, state: state.key === key ? state : empty(key),
    reload, loadMore, changeStatus, canActService, activityBusy, activityCheckRequired, adoptActivity};
}
