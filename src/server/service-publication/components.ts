import "server-only";
import { after } from "next/server";
import { publicationRuntimeConfig } from "../listing-publication/journey/integrationRuntime";
import { createPublicationImageProcessor } from "../listing-publication/journey/components";
import { createServicePublicationRequestHandler } from "./createServicePublicationHandler";

export function servicePublicationHandler() {
  const config = publicationRuntimeConfig();
  return config ? createServicePublicationRequestHandler(config, createPublicationImageProcessor(config), fetch, after) : null;
}
