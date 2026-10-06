export type AppEnv = "production" | "preview" | "development";

/**
 * Ortam tespit fonksiyonu.
 * Vercel ortamında VERCEL_ENV (production | preview | development) bayrağını okur.
 * Yerel veya diğer ortamlarda NODE_ENV'e göre fallback yapar.
 */
export function appEnv(): AppEnv {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  if (vercelEnv === "development") return "development";

  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}
