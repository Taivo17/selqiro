"use client";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { useServiceStoreCategories } from "../model/useServiceStoreCategories";
import ContentStoreCategoryCard from "../../store-category-assignment/components/ContentStoreCategoryCard";

export default function ServiceStoreCategoryCard({actor, serviceId, blocked = false, onPendingChange}: {
  actor: PublicationActor; serviceId: string; blocked?: boolean; onPendingChange?: (pending: boolean) => void;
}) {
  const assignment = useServiceStoreCategories({actor, serviceId, blocked});
  return <ContentStoreCategoryCard assignment={assignment} kind="service" contentId={serviceId}
    blocked={blocked} onPendingChange={onPendingChange} />;
}
