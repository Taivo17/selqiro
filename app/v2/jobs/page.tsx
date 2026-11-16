import V2Shell from "../../../components/v2/layout/V2Shell";
import JobDiscoveryPage from "../../../src/features/jobs/components/JobDiscoveryPage";
import { Suspense } from "react";
export default function JobsRoute() {return <V2Shell><Suspense fallback={<div className="min-h-64 animate-pulse rounded-3xl bg-white"/>}><JobDiscoveryPage/></Suspense></V2Shell>;}
