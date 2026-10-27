import { connection } from "next/server";
import type { ReactNode } from "react";
import HostedPreviewGate from "../../src/features/v2-shell/components/HostedPreviewGate";
import { hostedPublicationRequested } from "../../src/shared/config/v2Integration";
import { hostedPreviewConfig } from "../../src/server/listing-publication/journey/hostedPreviewConfig";
import { hostedPreviewCapability } from "../../src/server/listing-publication/journey/hostedPreviewReadiness";
import type { HostedPreviewCapability } from "../../src/shared/config/hostedPreviewProtocol";

export default async function V2Layout({children}: {children: ReactNode}) {
  if (!hostedPublicationRequested()) return children;
  // No live backend read during build. Only a real hosted request asks its DB.
  await connection();
  const config = hostedPreviewConfig();
  let capability: HostedPreviewCapability | null = null;
  if (config) {
    try { capability = await hostedPreviewCapability(config); }
    catch { /* Preserve the existing read surface while this release is closed. */ }
  }
  return <HostedPreviewGate key={capability?.instanceId ?? "existing"} capability={capability}>{children}</HostedPreviewGate>;
}
