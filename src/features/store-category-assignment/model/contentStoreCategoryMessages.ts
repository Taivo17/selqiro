import { listingEditMessages } from "../../listing-edit/model/listingEditMessages";

/** Reuse selector and recovery language; only canonical-content wording differs. */
export const serviceStoreCategoryMessages = {
  en: {...listingEditMessages.en,
    storeSectionsSavedSeparately: "Store sections are saved separately from the service's details and photos.",
    storeAssignmentsRemoved: "Store section assignments removed from this service.",
    storeAssignmentOneSaved: "Saved 1 store section for this service.",
    storeAssignmentCountSaved: "Saved {count} store sections for this service.",
    storeAssignmentReadFailed: "Could not load this service's store sections.",
    storeAssignmentForbidden: "You do not have permission to change this service's sections.",
    storeAssignmentInvalid: "The service or section data is invalid.",
  },
  et: {...listingEditMessages.et,
    storeSectionsSavedSeparately: "Poe rubriigid salvestatakse teenuse andmetest ja fotodest eraldi.",
    storeAssignmentsRemoved: "Teenuse poe rubriikide seosed eemaldatud.",
    storeAssignmentOneSaved: "Teenusele salvestati 1 poe rubriik.",
    storeAssignmentCountSaved: "Teenusele salvestati {count} poe rubriiki.",
    storeAssignmentReadFailed: "Teenuse poe rubriike ei saanud laadida.",
    storeAssignmentForbidden: "Sul ei ole õigust selle teenuse rubriike muuta.",
    storeAssignmentInvalid: "Teenuse või rubriikide andmed ei ole korrektsed.",
  },
} as const;
