"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Users, Truck } from "lucide-react";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { formatTrDate } from "@/lib/time/istanbul";

/**
 * Eski kurye filo yönetimi rotası: yeni Ekip & Kurye Yönetimi ekranına (`/admin/ekip`)
 * güvenli köprü ve otomatik yönlendirme sağlar.
 */
export default function AdminCourierManagementBridgePage() {
  const router = useRouter();
  const today = useIstanbulToday();

  useEffect(() => {
    router.replace("/admin/ekip");
  }, [router]);

  return (
    <div className="min-h-[60vh] bg-[#F6EEDF] text-[#3B1E1A] rounded-3xl border border-[#E2D3BD] p-6 sm:p-10 flex items-center justify-center">
      <div className="max-w-lg w-full bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] flex items-center justify-center mx-auto text-[#B4532A]">
          <Users className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-wider text-[#6E5148]">
            {formatTrDate(today, "long")}
          </p>
          <h1 className="font-serif text-2xl font-bold text-[#3B1E1A]">
            Ekip &amp; Kurye Yönetimi Taşındı
          </h1>
          <p className="text-sm text-[#6E5148] leading-relaxed">
            Kurye kadrosu, vardiya kontrolü, gün sonu kasa mutabakatı ve ekip yetkilendirmeleri artık{" "}
            <strong className="text-[#3B1E1A]">Ekip Yönetimi</strong> ekranından yürütülüyor.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
          <Link
            href="/admin/ekip"
            className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4420] text-white text-sm font-semibold transition-colors"
          >
            <span>Ekip Yönetimine Geç</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/kurye"
            className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E9D6] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold transition-colors"
          >
            <Truck className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
            <span>Dağıtım Konsolu</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
