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

const CreateCariAccountSchema = CariProfileSchema.required({ businessName: true }).extend({
  district: z.string().trim().max(80, "İlçe adı en fazla 80 karakter olabilir.").optional(),
  companyTitle: z.string().trim().max(200, "Resmi unvan en fazla 200 karakter olabilir.").optional(),
  creditLimit: z.coerce.number().min(0, "Kredi limiti negatif olamaz.").finite().optional(),
  customPrices: PositivePriceRecordSchema.optional(),
  openingBalance: z.coerce.number().finite().optional(),
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

/** Tüm cari hesapları Faz 4 alanlarıyla (district, companyTitle, creditLimit, shareTokenVersion) döner. */
export async function GET(request: Request) {
  const guard = await requireCapability(request, "cari.read");
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const { data, error } = await supabase
      .from("current_accounts")
      .select(
        "id, name, contact_person, phone, address, district, neighborhood, company_title, tax_number, tax_office, credit_limit, share_token_version, custom_prices, balance, account_type, notes, archived_at, created_at, updated_at",
      )
      .order("name", { ascending: true });

    if (error) throw error;
    const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
    return NextResponse.json({ accounts: rows.map(mapAccountRow) });
  } catch (err: unknown) {
    logError("GET /api/admin/cari/accounts:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Cari listesi okunamadı" }, { status: 500 });
  }
}

/** Yeni cari hesap. Açılış bakiyesi varsa defterde tek "devir" satırı olarak yazılır (bakiye ona göre). */
export async function POST(request: Request) {
  const guard = await requireCapability(request, "cari.write");
  if (!guard.ok) return guard.response;

  const raw: unknown = await request.json().catch(() => null);
  const parsed = CreateCariAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }

  const { openingBalance, creditLimit, district, companyTitle, customPrices, ...baseProfile } = parsed.data;
  const opening = typeof openingBalance === "number" && Number.isFinite(openingBalance)
    ? Math.round(openingBalance * 100) / 100
    : 0;
  const safeCreditLimit = typeof creditLimit === "number" && Number.isFinite(creditLimit)
    ? Math.round(creditLimit * 100) / 100
    : 0;
  const safeDistrict = district?.trim() || "Beylikdüzü";
  const safeCompanyTitle = companyTitle?.trim() || null;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  const id = `cari_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from("current_accounts").insert({
      id,
      ...profileToRow({ ...baseProfile, customPrices }),
      custom_prices: customPrices ?? {},
      balance: 0,
      credit_limit: safeCreditLimit,
      district: safeDistrict,
      company_title: safeCompanyTitle,
      share_token_version: 1,
      status: "active",
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;

    if (opening !== 0) {
      const { error: txErr } = await supabase.rpc("record_cari_transaction_atomic", {
        p_account_id: id,
        p_type: "devir",
        p_amount: opening,
        p_description: "Açılış bakiyesi",
        p_created_by: guard.auth.userId,
      });
      if (txErr) {
        // Açılış yazılamadıysa yarım hesap bırakma
        await supabase.from("current_accounts").delete().eq("id", id);
        throw txErr;
      }
    }

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId ?? "",
      actorRole: guard.auth.role ?? "unknown",
      action: "cari.account.create",
      entityType: "current_account",
      entityId: id,
      summary: `Cari hesap açıldı: ${baseProfile.businessName}`,
      metadata: {
        district: safeDistrict,
        creditLimit: safeCreditLimit,
        companyTitle: safeCompanyTitle,
        openingBalance: opening,
        customPriceCount: customPrices ? Object.keys(customPrices).length : 0,
      },
    });

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    logError("POST /api/admin/cari/accounts:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Cari oluşturulamadı" }, { status: 500 });
  }
}
