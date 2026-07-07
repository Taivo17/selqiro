import { supabase } from "../../../lib/supabase";

/**
 * Temporary V2 browser Supabase export.
 *
 * For now, this reuses the existing Supabase client so we do not duplicate
 * environment setup.
 *
 * Future option:
 * Replace this with a dedicated typed V2 Supabase client.
 */
export const supabaseBrowserClient = supabase;
