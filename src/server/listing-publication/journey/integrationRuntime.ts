import "server-only";
import { localIntegrationConfig, assertDisposableDatabase, type LocalIntegrationConfig } from "./localIntegration";
import { hostedPreviewConfig, type HostedPreviewConfig } from "./hostedPreviewConfig";
import { assertHostedPreviewActor, assertHostedPreviewReady, assertHostedPreviewReadContract } from "./hostedPreviewReadiness";
import type { UploadFetch } from "../../../entities/listing/api/privateUploadHttp";

export type PublicationRuntimeConfig = LocalIntegrationConfig | HostedPreviewConfig;

export function publicationRuntimeConfig(): PublicationRuntimeConfig | null {
  return localIntegrationConfig() ?? hostedPreviewConfig();
}

/** Select the branch by its declared kind; the hosted assertion also verifies the
 * private config marker. A forged hosted object cannot fall back to local checks. */
export function isHostedPublicationRuntime(c: PublicationRuntimeConfig): c is HostedPreviewConfig {
  return "integrationScope" in c;
}

export async function assertPublicationEnvironment(c: PublicationRuntimeConfig, signal?: AbortSignal,
    fetcher: UploadFetch = fetch): Promise<void> {
  if (isHostedPublicationRuntime(c)) await assertHostedPreviewReady(c, null, signal, fetcher);
  else await assertDisposableDatabase(c, signal, fetcher);
}

/** Only the public media route uses this installed-contract check. Pausing new
 * publication does not revoke an active listing's separately verified images. */
export async function assertPublicationReadEnvironment(c: PublicationRuntimeConfig, signal?: AbortSignal,
    fetcher: UploadFetch = fetch): Promise<void> {
  if (isHostedPublicationRuntime(c)) await assertHostedPreviewReadContract(c, signal, fetcher);
  else await assertDisposableDatabase(c, signal, fetcher);
}

export async function assertPublicationActor(c: PublicationRuntimeConfig, token: string, expectedUserId: unknown,
    signal?: AbortSignal, fetcher: UploadFetch = fetch): Promise<void> {
  if (isHostedPublicationRuntime(c)) await assertHostedPreviewActor(c, token, expectedUserId, signal, fetcher);
  else await assertDisposableDatabase(c, signal, fetcher);
}
