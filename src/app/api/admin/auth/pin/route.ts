import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createAdminClient } from "@/lib/supabase/admin";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-for-development-only-change-in-prod"
);

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();

    if (!pin) {
      return NextResponse.json({ success: false, error: "PIN is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase unconfigured" }, { status: 500 });
    }

    // Get real PIN from settings
    const { data } = await supabase
      .from("bakery_settings")
      .select("value")
      .eq("key", "security_settings")
      .single();
    
    const targetPin = data?.value?.quickPin || "1453";

    if (pin.trim() !== String(targetPin).trim()) {
      return NextResponse.json({ success: false, error: "Hatalı PIN kodu!" }, { status: 401 });
    }

    // Create a JWT token for "superadmin"
    const token = await new SignJWT({ role: "superadmin", uid: "tahsin_master_admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // 1 week validity
      .sign(JWT_SECRET);

    const response = NextResponse.json({ success: true });
    
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("PIN auth error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("admin_session");
  return response;
}
