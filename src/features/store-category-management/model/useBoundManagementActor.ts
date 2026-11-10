"use client";
import { useState } from "react";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";

/** Keep the same editor mounted during a read-only identity recheck. The caller
 * blocks actions while actor is null and keys a new editor on an actual change. */
export function useBoundManagementActor(actor: PublicationActor | null) {
  const [bound, setBound] = useState<PublicationActor | null>(actor);
  if (actor && (actor.userId !== bound?.userId || actor.identityId !== bound?.identityId)) {
    setBound(Object.freeze({ ...actor }));
  }
  return actor ?? bound;
}
