import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { buildCsvContent } from "@/lib/security/csv";
import { istanbulToday } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

export const runtime = "nodejs";

const QuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  segment: z.enum(["all", "vip", "new", "inactive_14d"]).default("all"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  format: z.enum(["json", "csv"]).default("json"),
});

const CustomerItemSchema = z.object({
  customer_key: z.string(),
  user_id: z.string().nullable().optional().default(null),
  name: z.string(),
  phone: z.string().default(""),
  email: z.string().nullable().optional().default(null),
  neighborhood: z.string().default(""),
  address: z.string().default(""),
  has_account: z.boolean().default(false),
  order_count: z.coerce.number().int().nonnegative().default(0),
  total_spent: z.coerce.number().nonnegative().default(0),
  last_order_date: z.string().nullable().optional().default(null),
  last_order_at: z.string().nullable().optional().default(null),
  segment: z.string().default("regular"),
});

const RpcCustomersSchema = z.object({
  total: z.coerce.number().int().nonnegative(),
  items: z.array(CustomerItemSchema),
});

export type AdminCustomerRow = z.infer<typeof CustomerItemSchema>;

const CSV_PAGE_SIZE = 200;
const CSV_MAX_ROWS = 5000;

interface PostgrestErrorShape {
  code?: string;
  message?: string;
}

function asPostgrestError(err: unknown): PostgrestErrorShape {
  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    return {
      code: typeof rec.code === "string" ? rec.code : undefined,
      message: typeof rec.message === "string" ? rec.message : undefined,
    };
  }
  return {};
}

function isMissingCustomersRpc(err: unknown): boolean {
  const { code, message } = asPostgrestError(err);
  if (code === "42883" || code === "PGRST202") return true;
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("list_admin_customers_paginated") &&
    (lower.includes("could not find") || lower.includes("does not exist"))
  );
}

function segmentCsvLabel(segment: string): string {
  switch (segment) {
    case "vip":
      return "VIP (3+ Sipariş)";
    case "new":
      return "Yeni";
    case "inactive_14d":
      return "14+ Gündür Pasif";
    case "lead":
      return "Kayıtlı (Sipariş Yok)";
    default:
      return "Düzenli";
  }
}

async function fetchCustomersPage(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  params: { search: string; segment: string; limit: number; offset: number }
): Promise<z.infer<typeof RpcCustomersSchema>> {
  const { data, error } = await supabase.rpc("list_admin_customers_paginated", {
    p_search: params.search,
    p_segment: params.segment,
    p_limit: params.limit,
    p_offset: params.offset,
  });

  if (error) {
    throw error;
  }

  const parsed = RpcCustomersSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Müşteri CRM verisi beklenen formatta değil.");
  }

  return parsed.data;
}

export async function GET(req: Request) {
  const guard = await requireCapability(req, "customers.read");
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const rawParams = {
    search: url.searchParams.get("search") ?? undefined,
    segment: url.searchParams.get("segment") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
    format: url.searchParams.get("format") ?? undefined,
  };

  const parsedQuery = QuerySchema.safeParse(rawParams);
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues.map((i) => i.message).join(", ") || "Geçersiz sorgu parametreleri." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
  }

  const { search, segment, limit, offset, format } = parsedQuery.data;

  try {
    if (format === "csv") {
      const allItems: AdminCustomerRow[] = [];
      let total = 0;
      let pageOffset = 0;

      while (pageOffset < CSV_MAX_ROWS) {
        const page = await fetchCustomersPage(supabase, {
          search,
          segment,
          limit: CSV_PAGE_SIZE,
          offset: pageOffset,
        });
        total = page.total;
        allItems.push(...page.items);
        if (page.items.length < CSV_PAGE_SIZE || allItems.length >= total) {
          break;
        }
        pageOffset += CSV_PAGE_SIZE;
      }

      const headers = [
        "Müşteri Adı",
        "Telefon",
        "E-posta",
        "Segment",
        "Üye Hesabı",
        "Mahalle",
        "Adres",
        "Sipariş Sayısı",
        "Toplam Harcama (TL)",
        "Son Sipariş Tarihi",
      ];

      const rows = allItems.map((c) => [
        c.name,
        c.phone,
        c.email ?? "",
        segmentCsvLabel(c.segment),
        c.has_account ? "Evet" : "Hayır",
        c.neighborhood,
        c.address,
        c.order_count,
        c.total_spent,
        c.last_order_date ?? "",
      ]);

      const csv = buildCsvContent(headers, rows);

      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole: guard.auth.role ?? "admin",
        action: "customers.csv_export",
        entityType: "customer",
        summary: `Müşteri listesi CSV dışa aktarıldı (${allItems.length} kayıt, segment: ${segment}).`,
        metadata: {
          search: search || null,
          segment,
          exportedCount: allItems.length,
          totalMatching: total,
        },
      });

      const filename = `ekmeklab_musteriler_${istanbulToday()}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const result = await fetchCustomersPage(supabase, {
      search,
      segment,
      limit,
      offset,
    });

    return NextResponse.json(
      {
        total: result.total,
        limit,
        offset,
        items: result.items,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    if (isMissingCustomersRpc(err)) {
      return NextResponse.json(
        {
          error:
            "Müşteri CRM veritabanı fonksiyonu (list_admin_customers_paginated) henüz kurulmamış. Lütfen 031 numaralı migration'ı uygulayın.",
        },
        { status: 503 }
      );
    }

    logError("GET /api/admin/customers:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Müşteriler listelenemedi." },
      { status: 500 }
    );
  }
}
