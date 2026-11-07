import type { PublicationTimingSink } from "./publicationTiming";

/** The image implementation owns validation of these commands; the router passes JSON. */
export type MultipartPublicationImages = Readonly<{
  prepare: (token: string, input: unknown, signal?: AbortSignal, timing?: PublicationTimingSink) => Promise<unknown>;
  verify: (token: string, input: unknown, signal?: AbortSignal, timing?: PublicationTimingSink) => Promise<unknown>;
  settle: (token: string, input: unknown, signal?: AbortSignal) => Promise<unknown>;
}>;
