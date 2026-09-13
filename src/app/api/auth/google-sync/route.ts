import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { email, fullName, avatarUrl, phone } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    let supabaseUserId: string | null = null;

    if (supabaseAdmin) {
      const adminAny = supabaseAdmin as any;

      try {
        // 1. Check if user already exists in Supabase auth
        const { data: usersData } = await adminAny.auth.admin.listUsers();
        const existing = usersData?.users?.find(
          (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (existing) {
          supabaseUserId = existing.id;
        } else {
          // Create user in Supabase auth so foreign keys work
          const { data: createdUser, error: createErr } = await adminAny.auth.admin.createUser({
            email: email.toLowerCase(),
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              avatar_url: avatarUrl,
              phone: phone || "",
            },
          });
          if (!createErr && createdUser?.user) {
            supabaseUserId = createdUser.user.id;
          }
        }

        // 2. Ensure profile exists in public.profiles table
        if (supabaseUserId) {
          await adminAny.from("profiles").upsert({
            id: supabaseUserId,
            email: email.toLowerCase(),
            full_name: fullName,
            avatar_url: avatarUrl,
            phone: phone || "",
            role:
              email === "tahsinreyhan@gmail.com" || email === "ekmeklab@gmail.com"
                ? "superadmin"
                : "customer",
            updated_at: new Date().toISOString(),
          });
        }
      } catch (e: any) {
        console.warn("Supabase user sync notice:", e?.message);
      }
    }

    return NextResponse.json({
      success: true,
      supabaseUserId,
      profile: {
        id: supabaseUserId,
        email,
        fullName,
        avatarUrl,
        phone,
      },
    });
  } catch (err: any) {
    console.error("Google sync API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
