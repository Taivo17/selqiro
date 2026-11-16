"use client";
import { useEffect,useState } from "react";
/** Holds a single bounded server page. Back/next retain cursors, never the whole result set. */
export function useJobPage<Cursor,Page extends {has_more: boolean;next_cursor: Cursor | null}>(key: string,ready: boolean,read: (cursor: Cursor | null,signal: AbortSignal) => Promise<Page>) {
  const [history,setHistory] = useState<{key: string;values: (Cursor | null)[];index: number}>({key,values: [null],index: 0});
  const [revision,setRevision] = useState(0);
  const current = history.key === key ? history : {key,values: [null],index: 0};
  const cursor = current.values[current.index], queryKey = `${key}:${revision}:${JSON.stringify(cursor)}`;
  const [state,setState] = useState<{key: string;page: Page | null;loading: boolean;error: boolean}>({key: "",page: null,loading: true,error: false});
  useEffect(() => {
    if (!ready) return; const abort = new AbortController();
    setState({key: queryKey,page: null,loading: true,error: false});
    void read(cursor,abort.signal).then(page => {if (!abort.signal.aborted) setState({key: queryKey,page,loading: false,error: false});},
      () => {if (!abort.signal.aborted) setState({key: queryKey,page: null,loading: false,error: true});});
    return () => abort.abort();
  },[ready,read,cursor,queryKey]);
  const visible = ready && state.key === queryKey;
  const page = visible ? state.page : null, loading = !visible || state.loading;
  return {page,loading,error: visible && state.error,canPrevious: current.index > 0,
    previous: () => {if (!loading && current.index > 0) setHistory({...current,index: current.index - 1});},
    next: () => {if (!loading && page?.has_more && page.next_cursor) setHistory({key,values: [...current.values.slice(0,current.index + 1),page.next_cursor],index: current.index + 1});},
    reload: () => setRevision(value => value + 1),reset: () => {setHistory({key,values: [null],index: 0}); setRevision(value => value + 1);}};
}
