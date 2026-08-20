import "server-only";

import {
  type User,
} from "@supabase/supabase-js";
import {
  getEnergyAdminClient,
} from "./adminClient";
import {
  EnergyMutationError,
} from "./model";

declare const verifiedEnergyActorBrand:
  unique symbol;

export type VerifiedEnergyActor = {
  readonly userId: string;
  readonly email: string | null;
  readonly [verifiedEnergyActorBrand]:
    true;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unauthorized(
  internalMessage: string,
  internalCause?: unknown
): EnergyMutationError {
  return new EnergyMutationError({
    message:
      "Energy toimingu kasutamiseks logi sisse.",
    status: 401,
    code: "unauthorized",
    retryable: false,
    internalMessage,
    internalCause,
  });
}

export function getBearerToken(
  request: Request
): string {
  const authorization =
    request.headers
      .get("authorization")
      ?.trim() || "";

  const match =
    /^Bearer\s+(.+)$/i.exec(
      authorization
    );

  const token =
    match?.[1]?.trim() || "";

  if (
    !token ||
    token.length > 8192
  ) {
    throw unauthorized(
      "Authorization Bearer token is missing or invalid."
    );
  }

  return token;
}

function actorFromUser(
  user: User
): VerifiedEnergyActor {
  if (
    !user.id ||
    !UUID_PATTERN.test(
      user.id
    )
  ) {
    throw unauthorized(
      "Supabase Auth returned an invalid user ID."
    );
  }

  return Object.freeze({
    userId: user.id,
    email:
      user.email || null,
  }) as VerifiedEnergyActor;
}

export async function
verifyEnergyActorFromAccessToken(
  accessToken: string
): Promise<VerifiedEnergyActor> {
  const token =
    accessToken.trim();

  if (
    !token ||
    token.length > 8192
  ) {
    throw unauthorized(
      "Access token is missing or invalid."
    );
  }

  const adminClient =
    getEnergyAdminClient();

  const {
    data: {
      user,
    },
    error,
  } =
    await adminClient
      .auth
      .getUser(token);

  if (
    error ||
    !user
  ) {
    throw unauthorized(
      error?.message ||
        "Supabase Auth did not return a user.",
      error
    );
  }

  return actorFromUser(user);
}

export async function
verifyEnergyActorFromRequest(
  request: Request
): Promise<VerifiedEnergyActor> {
  return verifyEnergyActorFromAccessToken(
    getBearerToken(request)
  );
}
