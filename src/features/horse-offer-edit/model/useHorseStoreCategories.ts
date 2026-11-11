"use client";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { horseContentCategoryApi } from "../../../entities/horse-offer/api/horseStoreCategoriesClient";
import { useContentStoreCategories } from "../../store-category-assignment/model/useContentStoreCategories";

export function useHorseStoreCategories({actor, offerId, blocked = false}: {
  actor: PublicationActor; offerId: string; blocked?: boolean;
}) {
  return useContentStoreCategories({actor, contentId: offerId, blocked, api: horseContentCategoryApi});
}
