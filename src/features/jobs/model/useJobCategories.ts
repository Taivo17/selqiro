"use client";
import { useEffect, useState } from "react";
import { getJobCategories } from "../../../entities/job/api/jobClient";
import type { JobCategory } from "../../../entities/job/model/types";
export function useJobCategories() {
  const [state,setState] = useState<{items: readonly JobCategory[]; loading: boolean; error: boolean}>({items: [],loading: true,error: false});
  const [revision,setRevision] = useState(0);
  useEffect(() => {const abort = new AbortController(); setState({items: [], loading: true,error: false});
    void getJobCategories(abort.signal).then(items => {if (!abort.signal.aborted) setState({items,loading: false,error: false});},
      () => {if (!abort.signal.aborted) setState({items: [],loading: false,error: true});});
    return () => abort.abort();
  },[revision]);
  return {...state,reload: () => setRevision(value => value + 1)};
}
