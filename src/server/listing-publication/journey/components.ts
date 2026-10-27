import "server-only";
import * as nodeModule from "node:module";
import path from "node:path";
import { localIntegrationConfig } from "./localIntegration";
import { publicationRuntimeConfig, isHostedPublicationRuntime, type PublicationRuntimeConfig } from "./integrationRuntime";
import { createJourneyRequestHandler } from "./createJourneyHandler";
import { createMultipartPublicationImages, createHostedMultipartPublicationImages,
  type MultipartSettlementCommand } from "../multipart/multipartPublicationImages";
import { copyWebCommand } from "../web/webImageContract";
import type { sanitizeListingImage as Sanitize } from "../images/sanitize.cjs";

function journeyHandler(c: PublicationRuntimeConfig) {
  // Run the reviewed native worker as a real isolated child, with its original byte
  // protocol. Do not bundle it into the route or replace native decoding with a mock.
  // Resolve Node's own loader at runtime. A direct createRequire(cwd) call is
  // statically rewritten by the route bundler, losing this native file boundary.
  const createNativeRequire = Reflect.get(nodeModule, "createRequire") as typeof nodeModule.createRequire;
  const nativeRequire = createNativeRequire(path.join(process.cwd(), "package.json"));
  const {sanitizeListingImage} = nativeRequire("./src/server/listing-publication/images/sanitize.cjs") as {sanitizeListingImage: typeof Sanitize};
  const images = isHostedPublicationRuntime(c)
    ? createHostedMultipartPublicationImages(c, sanitizeListingImage)
    : createMultipartPublicationImages({...c, integrationScope: "disposable-v2"}, sanitizeListingImage);
  return createJourneyRequestHandler(c, {
    prepare: (token, input, signal) => images.prepare(token, copyWebCommand(input), signal),
    verify: (token, input, signal) => images.verify(token, copyWebCommand(input), signal),
    settle: (token, input, signal) => images.settle(token, input as MultipartSettlementCommand, signal),
  });
}

export function localJourneyHandler() {
  const c = localIntegrationConfig();
  return c ? journeyHandler(c) : null;
}

export function publicationJourneyHandler() {
  const c = publicationRuntimeConfig();
  return c ? journeyHandler(c) : null;
}
