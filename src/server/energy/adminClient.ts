import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  EnergyMutationError,
} from "./model";

let cachedAdminClient:
  SupabaseClient | null = null;

function requiredServerEnvironment(
  name:
    | "NEXT_PUBLIC_SUPABASE_URL"
    | "SUPABASE_SERVICE_ROLE_KEY"
): string {
  const value =
    process.env[name]
      ?.trim() || "";

  if (!value) {
    throw new EnergyMutationError({
      message:
        "Energy serveriseadistus puudub.",
      status: 500,
      code:
        "server_configuration",
      retryable: false,
      internalMessage:
        `Missing server environment variable: ${name}.`,
    });
  }

  return value;
}

export function
getEnergyAdminClient(): SupabaseClient {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const supabaseUrl =
    requiredServerEnvironment(
      "NEXT_PUBLIC_SUPABASE_URL"
    );

  const serviceRoleKey =
    requiredServerEnvironment(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

  cachedAdminClient =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

  return cachedAdminClient;
}
