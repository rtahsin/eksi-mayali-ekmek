import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

export async function POST(req: Request) {
  try {
    const { email, password, fullName, phone } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "E-posta ve şifre zorunludur." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Şifre en az 6 karakter olmalıdır." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (fullName || "").trim();
    const cleanPhone = (phone || "").trim();

    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Supabase yapılandırması bulunamadı." },
        { status: 500 }
      );
    }

    const adminAny = supabaseAdmin as any;

    // 1. Create user with auto-confirmed email so customer doesn't have to wait
    const { data: createdUser, error: createErr } = await adminAny.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        phone: cleanPhone,
      },
    });

    if (createErr) {
      // If user already registered, return friendly message
      if (createErr.message?.includes("already been registered") || createErr.code === "email_exists") {
        return NextResponse.json(
          { success: false, error: "Bu e-posta adresiyle zaten bir hesap var. Lütfen giriş yapın." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: createErr.message || "Kayıt işlemi tamamlanamadı." },
        { status: 400 }
      );
    }

    const userId = createdUser?.user?.id;

    // 2. Upsert profile in public.profiles table
    if (userId) {
      const isSuper =
        cleanEmail === "tahsinreyhan@gmail.com" || cleanEmail === "ekmeklab@gmail.com";

      await adminAny.from("profiles").upsert({
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        phone: cleanPhone,
        role: isSuper ? "superadmin" : "customer",
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      userId,
      user: createdUser?.user,
    });
  } catch (err: unknown) {
    console.error("Register API error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
