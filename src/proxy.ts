import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const STAFF_ALLOWED_ADMIN_PREFIXES = ["/admin/siparisler", "/admin/uretim", "/admin/baski"] as const;

function isStaffAllowedAdminPath(pathname: string): boolean {
  if (pathname === "/admin" || pathname === "/admin/") return true;
  return STAFF_ALLOWED_ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function proxy(request: NextRequest) {
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

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        hasValidUserSession = true;
        // Check role from profiles table — only admin/superadmin get full admin access
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

  // 2. Enforce protection on /api/admin/* (granüler yetki route handler'da requireAdmin/requireCapability ile doğrulanır)
  const hasAdminApiRole = isAuthenticatedAdmin || userRole === "staff" || userRole === "courier";
  if (pathname.startsWith("/api/admin/")) {
    if (!hasValidUserSession) {
      return NextResponse.json({ error: "Unauthorized API access" }, { status: 401 });
    }
    if (!hasAdminApiRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // 3. Protect /admin/* routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !pathname.startsWith("/api/")) {
    if (userRole === "courier") {
      return NextResponse.redirect(new URL("/kurye", request.url));
    }

    if (userRole === "staff") {
      if (!isStaffAllowedAdminPath(pathname)) {
        return NextResponse.redirect(new URL("/admin/uretim", request.url));
      }
    } else if (!isAuthenticatedAdmin) {
      const loginUrl = new URL(`/admin/login`, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Protect /kurye route (strictly restricted to courier, staff, or admin roles)
  const isCourierOrAdmin = isAuthenticatedAdmin || userRole === "courier" || userRole === "staff";
  if (pathname.startsWith("/kurye")) {
    if (!isCourierOrAdmin) {
      const loginUrl = new URL(`/admin/login`, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 5. Protect /hesabim/* routes (customer login required)
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
    "/admin/:path*",
    "/kurye/:path*",
    "/hesabim/:path*",
    "/api/admin/:path*",
  ],
};
