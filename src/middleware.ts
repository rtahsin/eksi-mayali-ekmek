import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  let isAuthenticatedAdmin = false;
  let hasValidUserSession = false;
  let userRole: string | null = null;

  // 1. Supabase Session Check
  if (url && anonKey && url.startsWith("https://")) {
    try {
      const supabase = createServerClient(url, anonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        hasValidUserSession = true;
        // Check role from profiles table — only admin/superadmin get admin access
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        userRole = profile?.role || null;
        if (userRole === "admin" || userRole === "superadmin") {
          isAuthenticatedAdmin = true;
        }
      }
    } catch {
      // Ignored
    }
  }

  // 2. PIN JWT Cookie Check
  const adminCookie = request.cookies.get("admin_session");
  if (adminCookie?.value) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "fallback-secret-for-development-only-change-in-prod"
      );
      await jwtVerify(adminCookie.value, secret);
      isAuthenticatedAdmin = true;
    } catch {
      // Invalid JWT
    }
  }

  // 3. Enforce protection on /api/admin/* (except login routes)
  if (pathname.startsWith("/api/admin/") && pathname !== "/api/admin/auth/pin") {
    if (!isAuthenticatedAdmin) {
      return NextResponse.json({ error: "Unauthorized API access" }, { status: 401 });
    }
  }

  // 4. Protect /admin/* routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !pathname.startsWith("/api/")) {
    if (!isAuthenticatedAdmin) {
      const loginUrl = new URL(`/admin/login`, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 5. Protect /kurye route (strictly restricted to courier, staff, or admin roles)
  const isCourierOrAdmin = isAuthenticatedAdmin || userRole === "courier" || userRole === "staff";
  if (pathname.startsWith("/kurye")) {
    if (!isCourierOrAdmin) {
      const loginUrl = new URL(`/admin/login`, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 6. Protect /hesabim/* routes (customer login required)
  if (pathname.startsWith("/hesabim")) {
    if (!hasValidUserSession && !isAuthenticatedAdmin) {
      const redirectUrl = new URL("/", request.url);
      redirectUrl.searchParams.set("auth", "login");
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
