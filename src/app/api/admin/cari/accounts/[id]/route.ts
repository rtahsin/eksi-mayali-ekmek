import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/security/audit";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { CariProfileSchema, profileToRow } from "@/lib/cari/account";
import type { CariAccount } from "@/types/admin";

const PositivePriceRecordSchema = z.record(
  z.string().min(1, "Geçersiz ürün anahtarı"),
  z.coerce.number().positive("Özel fiyat 0'dan büyük olmalıdır.").finite(),
);

const PatchSchema = CariProfileSchema.extend({
  archived: z.boolean().optional(),
  district: z.string().trim().max(80, "İlçe adı en fazla 80 karakter olabilir.").optional(),
  companyTitle: z.string().trim().max(200, "Resmi unvan en fazla 200 karakter olabilir.").optional(),
  creditLimit: z.coerce.number().min(0, "Kredi limiti negatif olamaz.").finite().optional(),
  customPrices: PositivePriceRecordSchema.optional(),
});

function parseCustomPrices(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = typeof v === "number" ? v : Number(v);
    if (k && Number.isFinite(n) && n > 0) {
      result[k] = Math.round(n * 100) / 100;
    }
  }
  return result;
}

function mapAccountRow(row: Record<string, unknown>): CariAccount {
  return {
    id: String(row.id ?? ""),
    businessName: String(row.name ?? ""),
    contactPerson: String(row.contact_person ?? ""),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    district: typeof row.district === "string" && row.district.trim() ? row.district.trim() : "Beylikdüzü",
    neighborhood: String(row.neighborhood ?? "Cumhuriyet"),
    companyTitle: typeof row.company_title === "string" && row.company_title.trim() ? row.company_title.trim() : undefined,
    taxNumber: typeof row.tax_number === "string" && row.tax_number.trim() ? row.tax_number.trim() : undefined,
    taxOffice: typeof row.tax_office === "string" && row.tax_office.trim() ? row.tax_office.trim() : undefined,
    creditLimit: Math.round((Number(row.credit_limit) || 0) * 100) / 100,
    shareTokenVersion: Math.max(1, Math.trunc(Number(row.share_token_version) || 1)),
    customPrices: parseCustomPrices(row.custom_prices),
    balance: Math.round((Number(row.balance) || 0) * 100) / 100,
    accountType: row.account_type === "gider" ? "gider" : "musteri",
    notes: typeof row.notes === "string" && row.notes.trim() ? row.notes : undefined,
    archivedAt: typeof row.archived_at === "string" ? row.archived_at : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

/** Tek cari hesabını Faz 4 alanlarıyla birlikte okur. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCapability(request, "cari.read");
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const { data, error } = await supabase
      .from("current_accounts")
      .select(
        "id, name, contact_person, phone, address, district, neighborhood, company_title, tax_number, tax_office, credit_limit, share_token_version, custom_prices, balance, account_type, notes, archived_at, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Cari hesap bulunamadı." }, { status: 404 });

    return NextResponse.json({ account: mapAccountRow(data as Record<string, unknown>) });
  } catch (err: unknown) {
    logError("GET /api/admin/cari/accounts/[id]:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Cari okunamadı" }, { status: 500 });
  }
}

/** Cari kartı güncelle / arşivle. Silme yok: geçmiş defter kayıtları korunur. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCapability(request, "cari.write");
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }
  const { archived, district, companyTitle, creditLimit, customPrices, ...profile } = parsed.data;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const { data: acc, error: readErr } = await supabase
      .from("current_accounts")
      .select("id, name, balance")
      .eq("id", id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!acc) return NextResponse.json({ error: "Cari hesap bulunamadı." }, { status: 404 });

    const update: Record<string, unknown> = {
      ...profileToRow({ ...profile, ...(customPrices !== undefined ? { customPrices } : {}) }),
      updated_at: new Date().toISOString(),
    };
    if (customPrices !== undefined) {
      update.custom_prices = customPrices;
    }
    if (creditLimit !== undefined) {
      update.credit_limit = Math.round(creditLimit * 100) / 100;
    }
    if (district !== undefined) {
      update.district = district.trim() || "Beylikdüzü";
    }
    if (companyTitle !== undefined) {
      update.company_title = companyTitle.trim() || null;
    }

    if (archived === true) {
      const balance = Number((acc as { balance: number | string | null }).balance) || 0;
      if (balance !== 0) {
        return NextResponse.json(
          { error: `Bakiyesi ${balance.toLocaleString("tr-TR")} ₺ olan cari arşivlenemez. Önce bakiyeyi kapatın.` },
          { status: 409 },
        );
      }
      update.archived_at = new Date().toISOString();
    } else if (archived === false) {
      update.archived_at = null;
    }

    // Arşivde bakiye = 0 koşulu UPDATE'in kendisinde: kontrol ile yazım arasında fiş gelirse 0 satır → 409
    let query = supabase.from("current_accounts").update(update).eq("id", id);
    if (archived === true) query = query.eq("balance", 0);
    const { data: updated, error } = await query.select("id");
    if (error) throw error;
    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: "Bakiye bu arada değişti; cari arşivlenmedi. Sayfayı yenileyip tekrar deneyin." },
        { status: 409 },
      );
    }

    const accountName = profile.businessName || String((acc as { name?: string }).name ?? id);
    await writeAuditLog(supabase, {
      actorId: guard.auth.userId ?? "",
      actorRole: guard.auth.role ?? "unknown",
      action: archived === true ? "cari.account.archive" : archived === false ? "cari.account.unarchive" : "cari.account.update",
      entityType: "current_account",
      entityId: id,
      summary: `Cari güncellendi: ${accountName}`,
      metadata: {
        archived: archived ?? null,
        district: district ?? undefined,
        creditLimit: creditLimit ?? undefined,
        companyTitle: companyTitle ?? undefined,
        customPriceCount: customPrices !== undefined ? Object.keys(customPrices).length : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logError("PATCH /api/admin/cari/accounts/[id]:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Cari güncellenemedi" }, { status: 500 });
  }
}

/** Deneme carisini kalıcı sil: yalnız her hareketi iptal edilmişse (gerçek geçmiş yoksa). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCapability(request, "cari.write");
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  const { error } = await supabase.rpc("delete_cari_account", { p_account_id: id });
  if (!error) {
    await writeAuditLog(supabase, {
      actorId: guard.auth.userId ?? "",
      actorRole: guard.auth.role ?? "unknown",
      action: "cari.account.delete",
      entityType: "current_account",
      entityId: id,
      summary: `Deneme cari hesabı kalıcı silindi (${id})`,
    });
    return NextResponse.json({ success: true });
  }
  if (error.message.includes("CARI_HAS_HISTORY")) {
    return NextResponse.json(
      { error: "Bu caride iptal edilmemiş hareketler var; kalıcı silinemez. Gerçek hesapsa arşivleyin, denemeyse önce hareketleri iptal edin." },
      { status: 409 },
    );
  }
  if (error.message.includes("CARI_NOT_FOUND")) return NextResponse.json({ error: "Cari hesap bulunamadı." }, { status: 404 });
  logError("DELETE /api/admin/cari/accounts/[id]:", error);
  return NextResponse.json({ error: getErrorMessage(error) || "Cari silinemedi" }, { status: 500 });
}
