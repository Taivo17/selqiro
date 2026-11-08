import "server-only";
import { after } from "next/server";
import { publicationRuntimeConfig } from "../listing-publication/journey/integrationRuntime";
import { createPublicationImageProcessor } from "../listing-publication/journey/components";
import { createHorsePublicationRequestHandler } from "./createHorsePublicationHandler";

export function horsePublicationHandler() {
  const config = publicationRuntimeConfig();
  return config ? createHorsePublicationRequestHandler(config, createPublicationImageProcessor(config), fetch, after) : null;
}
