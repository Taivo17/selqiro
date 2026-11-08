"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {listServiceOwners, readServiceOwner, setServiceOwnerStatus} from "../../../entities/service/api/servicePublicationClient";
import type {ServiceOwnerSnapshot} from "../../../entities/service/model/servicePublication";
import {useConversationActor, type ConversationActorContext} from "../../listing-conversation/model/useConversationActor";

type State = {key: string; items: readonly ServiceOwnerSnapshot[]; total: string; next: number | null;
  loading: boolean; moreLoading: boolean; error: boolean; busyId: string | null; uncertainIds: readonly string[];
  notice: "statusChanged" | "statusError" | null};
const empty = (key: string): State => ({key, items: [], total: "0", next: null, loading: true,
  moreLoading: false, error: false, busyId: null, uncertainIds: [], notice: null});
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
    void listServiceOwners(actorOf(actor), abort.signal).then(page => {
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
      const page = await listServiceOwners(actorOf(actor), actor.signal, previous.next);
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
  const changeStatus = useCallback(async (row: ServiceOwnerSnapshot, status: "published" | "archived") => {
    if (!actor || !isCurrent(actor) || current.current.key !== key || busy.current
      || current.current.uncertainIds.includes(row.service.id) || !current.current.items.includes(row)
      || row.service.status === "draft" || row.service.status === status) return;
    const ownVersion = version.current, id = row.service.id; busy.current = id;
    setState(value => ({...value, busyId: id, notice: null}));
    try {
      try {await setServiceOwnerStatus(actorOf(actor), id, row.editRevision, row.service.status, status, actor.signal);} catch { /* The owner read resolves both a lost reply and a conflict. */ }
      if (ownVersion !== version.current || !isCurrent(actor)) return;
      const verified = await readServiceOwner(actorOf(actor), id, actor.signal);
      if (ownVersion !== version.current || !isCurrent(actor)) return;
      if (!verified) throw new Error("service_unavailable");
      setState(value => ({...value, items: value.items.map(item => item.service.id === id ? verified : item),
        busyId: null, notice: verified.service.status === status ? "statusChanged" : "statusError"}));
    } catch {
      if (ownVersion === version.current && isCurrent(actor)) setState(value => ({...value, busyId: null,
        uncertainIds: [...value.uncertainIds.filter(value => value !== id), id], notice: "statusError"}));
    } finally {if (ownVersion === version.current) busy.current = null;}
  }, [actor, key, isCurrent]);
  return {context, actor: actor ? actorOf(actor) : null, state: state.key === key ? state : empty(key), reload, loadMore, changeStatus};
}
