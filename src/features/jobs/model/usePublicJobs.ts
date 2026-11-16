"use client";
import { useCallback } from "react";
import { getProfileJobs,searchPublicJobs } from "../../../entities/job/api/jobClient";
import type { JobSearch,PublicJobCursor,PublicJobPage } from "../../../entities/job/model/types";
import { useViewerReadScope } from "../../../shared/provider-controls/useViewerReadScope";
import { useJobPage } from "./useJobPage";
type Scope = {kind: "search";search: JobSearch} | {kind: "profile";slug: string;identityId: string};
export function usePublicJobs(scope: Scope,limit = 24) {
  const viewer = useViewerReadScope(scope.kind === "search" ? "discovery" : "visibility");
  const serialized = JSON.stringify(scope);
  const read = useCallback((cursor: PublicJobCursor | null,signal: AbortSignal): Promise<PublicJobPage> => {
    const selected = JSON.parse(serialized) as Scope;
    return selected.kind === "search" ? searchPublicJobs(selected.search,cursor,signal,limit) : getProfileJobs(selected.slug,selected.identityId,cursor,signal,limit);
  },[serialized,limit]);
  const result = useJobPage(`${viewer.key}:${serialized}:${limit}`,viewer.ready,read);
  return {...result,error: !!viewer.error || result.error,reload: () => {if (viewer.error) viewer.refresh(); else result.reload();}};
}
