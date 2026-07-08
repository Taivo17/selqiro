"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../../lib/useAuth";
import { getActiveIdentity } from "../../../entities/identity/api/getActiveIdentity";
import type { IdentitySummary } from "../../../entities/identity/model/types";
import { getEditableListingById } from "../../../entities/listing/api/getEditableListingById";
import type { EditableListingAccessStatus } from "../../../entities/listing/model/editableTypes";
import type { ProductListingDetail } from "../../../entities/listing/model/types";

export type EditableListingState = {
  listing: ProductListingDetail | null;
  activeIdentity: IdentitySummary | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
  status: EditableListingAccessStatus | "loading";
};

export function useEditableListing(listingId: string): EditableListingState {
  const { user, loading: authLoading } = useAuth();

  const [state, setState] = useState<EditableListingState>({
    listing: null,
    activeIdentity: null,
    userId: null,
    loading: true,
    error: null,
    status: "loading",
  });

  useEffect(() => {
    let mounted = true;

    async function loadEditableListing() {
      if (authLoading) {
        return;
      }

      if (!user?.id) {
        setState({
          listing: null,
          activeIdentity: null,
          userId: null,
          loading: false,
          error: null,
          status: "not_authenticated",
        });
        return;
      }

      setState({
        listing: null,
        activeIdentity: null,
        userId: user.id,
        loading: true,
        error: null,
        status: "loading",
      });

      try {
        const activeIdentity = await getActiveIdentity({
          userId: user.id,
          userEmail: user.email,
        });

        const result = await getEditableListingById({
          listingId,
          userId: user.id,
          activeIdentityId: activeIdentity?.id || null,
        });

        if (!mounted) return;

        setState({
          listing: result.listing,
          activeIdentity,
          userId: user.id,
          loading: false,
          error: null,
          status: result.status,
        });
      } catch (error) {
        if (!mounted) return;

        setState({
          listing: null,
          activeIdentity: null,
          userId: user.id,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load editable listing",
          status: "loading",
        });
      }
    }

    loadEditableListing();

    return () => {
      mounted = false;
    };
  }, [authLoading, user?.id, user?.email, listingId]);

  return state;
}
