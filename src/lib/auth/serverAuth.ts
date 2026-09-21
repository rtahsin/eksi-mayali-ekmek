import { adminAuth, adminDb } from "@/lib/firebase/admin";

export interface AuthenticatedAdmin {
  uid: string;
  email?: string;
  role: "superadmin" | "admin" | "editor" | "support";
}

const SUPER_ADMIN_EMAILS = [
  "tahsinreyhan@gmail.com",
  "ekmeklab@gmail.com",
];

/**
 * Verifies that the incoming request contains a valid Firebase ID token
 * belonging to an active administrator (superadmin or admin role).
 */
export async function verifyAdminRequest(req: Request): Promise<
  | { success: true; admin: AuthenticatedAdmin }
  | { success: false; status: number; error: string }
> {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        status: 401,
        error: "Yetkilendirme başlığı (Bearer token) eksik veya geçersiz.",
      };
    }

    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      return {
        success: false,
        status: 401,
        error: "Geçersiz kimlik doğrulama belirteci (token).",
      };
    }

    // 1. Verify token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email?.toLowerCase().trim();

    // 2. Check if superadmin by email
    const isSuperAdmin = Boolean(email && SUPER_ADMIN_EMAILS.includes(email));

    if (isSuperAdmin) {
      return {
        success: true,
        admin: {
          uid,
          email,
          role: "superadmin",
        },
      };
    }

    // 3. Check adminler/{uid} document in Firestore
    const adminDoc = await adminDb.collection("adminler").doc(uid).get();

    if (!adminDoc.exists) {
      return {
        success: false,
        status: 403,
        error: "Bu işlem için yönetici yetkisine sahip değilsiniz.",
      };
    }

    const adminData = adminDoc.data();
    if (adminData?.isActive === false) {
      return {
        success: false,
        status: 403,
        error: "Yönetici hesabınız pasife alınmıştır.",
      };
    }

    const role = (adminData?.role as AuthenticatedAdmin["role"]) || "admin";
    if (!["superadmin", "admin"].includes(role)) {
      return {
        success: false,
        status: 403,
        error: "Bu işlemi gerçekleştirmek için yeterli rol yetkiniz (admin) bulunmuyor.",
      };
    }

    return {
      success: true,
      admin: {
        uid,
        email,
        role,
      },
    };
  } catch (err: unknown) {
    console.error("Admin token verification error:", err);
    return {
      success: false,
      status: 401,
      error: "Oturum belirtecinin süresi dolmuş veya geçersiz.",
    };
  }
}
