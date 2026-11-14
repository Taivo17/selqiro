"use client";
import {useViewerAccount} from "../../../shared/provider-controls/useViewerAccount";
import ProviderControlsBoundary from "./ProviderControlsBoundary";
import ProviderControlList from "./ProviderControlList";

export default function LegacyBlockedAccounts({userId, language}: {userId: string | null; language?: string | null}) {
  const account = useViewerAccount();
  if (!userId || account.actor?.userId !== userId) return null;
  return <ProviderControlsBoundary language={language}><ProviderControlList kind="blocked" /></ProviderControlsBoundary>;
}
