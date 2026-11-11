"use client";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { useHorseStoreCategories } from "../model/useHorseStoreCategories";
import ContentStoreCategoryCard from "../../store-category-assignment/components/ContentStoreCategoryCard";

export default function HorseStoreCategoryCard({actor, offerId, blocked = false, onPendingChange}: {
  actor: PublicationActor; offerId: string; blocked?: boolean; onPendingChange?: (pending: boolean) => void;
}) {
  const assignment = useHorseStoreCategories({actor, offerId, blocked});
  return <ContentStoreCategoryCard assignment={assignment} kind="horse" contentId={offerId}
    blocked={blocked} onPendingChange={onPendingChange} />;
}
