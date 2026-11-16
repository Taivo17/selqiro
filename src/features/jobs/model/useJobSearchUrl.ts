"use client";
import { useMemo } from "react";
import { useRouter,useSearchParams } from "next/navigation";
import type { JobSearch } from "../../../entities/job/model/types";
import { jobSearchUrl,readJobSearch } from "./jobSearchUrl";
/** Browser Back restores the same public filters; Next owns route/history notifications. */
export function useJobSearchUrl() {
  const serialized = useSearchParams().toString(), router = useRouter();
  const search = useMemo(() => readJobSearch(serialized),[serialized]);
  return {search,change: (value: JobSearch) => router.push(jobSearchUrl(value),{scroll: false})};
}
