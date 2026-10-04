import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  // Prevent open redirect vulnerabilities ("//evil.com" is protocol-relative)
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    next = "/";
  }

  // Support Vercel / reverse proxy host headers
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocalEnv = process.env.NODE_ENV === "development";
  const redirectOrigin = isLocalEnv || !forwardedHost ? origin : `${forwardedProto}://${forwardedHost}`;

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.user) {
        const user = data.user;
        const email = (user.email || "").toLowerCase();
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          email.split("@")[0] ||
          "";
        const avatarUrl =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          "";

        // Ensure user profile exists in public.profiles table.
        // Rol ASLA buradan yazılmaz: yeni profil veritabanı varsayılanını (customer) alır,
        // mevcut profil hiç değiştirilmez (ignoreDuplicates).
        const adminClient = createAdminClient();
        if (adminClient) {
          try {
            await adminClient.from("profiles").upsert(
              {
                id: user.id,
                email: email,
                full_name: fullName,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id", ignoreDuplicates: true }
            );
          } catch (e) {
            console.warn("OAuth profile sync notice:", e);
          }
        }

        return NextResponse.redirect(`${redirectOrigin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${redirectOrigin}/`);
}

