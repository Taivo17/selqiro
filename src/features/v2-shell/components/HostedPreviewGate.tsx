"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { shellUiMessages } from "@/lib/i18n/catalogs/shellUi";

import { useEffect, useState, type ReactNode } from "react";
import { installHostedPreviewCapability } from "../../../shared/config/v2Integration";
import type { HostedPreviewCapability } from "../../../shared/config/hostedPreviewProtocol";

/** Wait before mounting children so their first data request selects the proven
 * release. Missing readiness uses the existing read path; it cannot flip RPCs. */
export default function HostedPreviewGate({capability, children}: {
  capability: HostedPreviewCapability | null; children: ReactNode;
}) {
  const { t } = useV2Translation(shellUiMessages);

  const [state, setState] = useState<"waiting" | "ready" | "existing">("waiting");
  useEffect(() => {
    setState(installHostedPreviewCapability(capability) ? "ready" : "existing");
    return () => { installHostedPreviewCapability(null); };
  }, [capability]);
  if (state === "waiting") return <p role="status" className="mx-auto max-w-7xl px-4 py-8 text-sm text-neutral-600">{t("preparing_the_page")}</p>;
  return <>
    {state === "existing" ? <p role="status" className="mx-auto max-w-7xl px-4 pt-4 text-sm text-neutral-600">
      {t("listing_publication_is_currently_unavailable_you_can_browse_existing_listin")} </p> : null}
    {children}
  </>;
}
