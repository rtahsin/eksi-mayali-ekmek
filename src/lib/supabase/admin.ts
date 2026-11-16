import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let adminClientInstance: ReturnType<typeof createSupabaseClient<any, any, any>> | null = null;
let typedAdminClientInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Supabase ağ geçidinin anahtar dönüşümü/JWT sınırı kaynaklı tekil `401 PGRST303`
 * veya geçici `502-504` yanıtlarında güvenli istekleri 1 kez yeniden dener.
 */
const adminFetchWithRetry: typeof fetch = async (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const isIdempotent = method === "GET" || method === "HEAD";
  const firstInput = input instanceof Request ? input.clone() : input;

  const res = await fetch(firstInput, init);
  const proxyStatus = res.headers.get("proxy-status") ?? "";
  const isPgrst303 = res.status === 401 && proxyStatus.includes("PGRST303");
  const isTransientStatus =
    res.status === 401 || res.status === 502 || res.status === 503 || res.status === 504;

  if (isPgrst303 || (isIdempotent && isTransientStatus)) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return fetch(input, init);
  }

  return res;
};

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
    global: {
      fetch: adminFetchWithRetry,
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
    global: {
      fetch: adminFetchWithRetry,
    },
  });

  return typedAdminClientInstance;
}
