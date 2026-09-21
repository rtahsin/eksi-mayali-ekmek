import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let adminClientInstance: ReturnType<typeof createSupabaseClient<any, any, any>> | null = null;

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
