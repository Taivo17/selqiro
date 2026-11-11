"use client";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { serviceStoreCategoryApi } from "../../../entities/service/api/serviceStoreCategoriesClient";
import { useContentStoreCategories } from "../../store-category-assignment/model/useContentStoreCategories";

export function useServiceStoreCategories({actor, serviceId, blocked = false}: {
  actor: PublicationActor; serviceId: string; blocked?: boolean;
}) {
  return useContentStoreCategories({actor, contentId: serviceId, blocked, api: serviceStoreCategoryApi});
}
