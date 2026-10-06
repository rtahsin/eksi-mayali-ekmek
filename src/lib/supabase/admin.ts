import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let adminClientInstance: ReturnType<typeof createSupabaseClient<any, any, any>> | null = null;
let typedAdminClientInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !supabaseUrl.startsWith("https://")) {
    return null;
  }

  if (adminClientInstance) {
    return adminClientInstance;
  }

  adminClientInstance = createSupabaseClient<any, any, any>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClientInstance;
}

export function createTypedAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !supabaseUrl.startsWith("https://")) {
    return null;
  }

  if (typedAdminClientInstance) {
    return typedAdminClientInstance;
  }

  typedAdminClientInstance = createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return typedAdminClientInstance;
}
