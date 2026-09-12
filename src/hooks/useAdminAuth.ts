"use client";

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { AdminRole, AdminUser } from "@/types/admin";

const SUPER_ADMIN_EMAILS = [
  "tahsinreyhan@gmail.com",
  "ekmeklab@gmail.com",
];

export function useAdminAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.email) {
        const emailLower = user.email.toLowerCase().trim();
        const isSuper = SUPER_ADMIN_EMAILS.includes(emailLower);

        try {
          // Check adminler/{uid} document
          const adminDocRef = doc(db, "adminler", user.uid);
          const adminDocSnap = await getDoc(adminDocRef);

          if (isSuper) {
            setAdminUser({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || "Fırın Yöneticisi",
              role: "superadmin",
              isActive: true,
            });
          } else if (adminDocSnap.exists()) {
            const data = adminDocSnap.data();
            const isActive = data.isActive !== false;
            const role = (data.role as AdminRole) || "admin";

            if (isActive) {
              setAdminUser({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split("@")[0],
                role,
                isActive,
              });
            } else {
              setAdminUser(null);
            }
          } else {
            // User is authenticated but NOT an administrator
            setAdminUser(null);
          }
        } catch {
          // Fallback if superadmin
          if (isSuper) {
            setAdminUser({
              uid: user.uid,
              email: user.email,
              displayName: "Fırın Yöneticisi",
              role: "superadmin",
              isActive: true,
            });
          } else {
            setAdminUser(null);
          }
        }
      } else {
        setAdminUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      return { success: true, user: cred.user };
    } catch (err: any) {
      let msg = "Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        msg = "E-posta adresi veya şifre hatalı.";
      } else if (err.code === "auth/user-not-found") {
        msg = "Bu e-posta adresine kayıtlı yönetici bulunamadı.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Çok fazla başarısız deneme yapıldı. Lütfen biraz bekleyin.";
      }
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      return { success: true, user: cred.user };
    } catch (err: any) {
      const msg = err.code === "auth/popup-closed-by-user"
        ? "Giriş penceresi kapatıldı."
        : "Google ile giriş başarısız oldu: " + err.message;
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err: any) {
      let msg = "Şifre sıfırlama bağlantısı gönderilemedi.";
      if (err.code === "auth/user-not-found") {
        msg = "Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.";
      }
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setAdminUser(null);
      setFirebaseUser(null);
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return {
    firebaseUser,
    adminUser,
    isAuthenticated: Boolean(adminUser && adminUser.isActive),
    isSuperAdmin: adminUser?.role === "superadmin",
    loading,
    authError,
    login,
    loginWithGoogle,
    resetPassword,
    logout,
  };
}
