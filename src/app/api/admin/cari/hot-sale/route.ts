import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/security/audit";
import { signSlipToken } from "@/lib/security/linkToken";
import { SITE_URL } from "@/lib/site";
import { istanbulToday, isIsoDate } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import type {
  B2BHotSaleAccountSummary,
  B2BHotSaleItem,
  B2BHotSalePaymentMethod,
  B2BHotSaleResult,
  B2BHotSaleTransactionSummary,
} from "@/types/admin";

const HotSaleLineInputSchema = z.object({
  productId: z.string().trim().min(1, "Ürün kimliği zorunludur."),
  quantity: z.coerce
    .number()
    .positive("Miktar 0'dan büyük olmalıdır.")
    .max(10000, "Tek kalemde en fazla 10.000 adet girilebilir.")
    .finite(),
});

const HotSaleRequestSchema = z.object({
  accountId: z.string().trim().min(1, "Cari hesap seçimi zorunludur."),
  items: z.array(HotSaleLineInputSchema).min(1, "En az 1 teslimat kalemi seçilmelidir."),
  returnItems: z.array(HotSaleLineInputSchema).optional().default([]),
  collectedAmount: z.coerce.number().min(0, "Tahsilat tutarı negatif olamaz.").finite().optional().default(0),
  paymentMethod: z.enum(["nakit", "kredi_karti", "havale"]).optional(),
  description: z.string().trim().max(300, "Açıklama en fazla 300 karakter olabilir.").optional(),
  date: z
    .string()
    .trim()
    .refine((val) => isIsoDate(val), { message: "Tarih YYYY-MM-DD formatında olmalıdır." })
    .optional(),
  allowOverLimit: z.boolean().optional().default(false),
});

interface AccountDbRow {
  id: string;
  name: string;
  company_title: string | null;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  neighborhood: string | null;
  tax_number: string | null;
  tax_office: string | null;
  credit_limit: number | string | null;
  share_token_version: number | null;
  custom_prices: unknown;
  balance: number | string | null;
  archived_at: string | null;
}

interface ProductDbRow {
  id: string;
  name: string;
  price: number | string | null;
  unit_label: string | null;
  weight: number | string | null;
  weight_unit: string | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseCustomPrices(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const map: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const num = typeof v === "number" ? v : Number(v);
    if (k && Number.isFinite(num) && num > 0) {
      map[k] = round2(num);
    }
  }
  return map;
}

function resolveUnit(prod: ProductDbRow): string {
  if (typeof prod.unit_label === "string" && prod.unit_label.trim()) {
    return prod.unit_label.trim();
  }
  const weightNum = Number(prod.weight);
  if (Number.isFinite(weightNum) && weightNum > 0 && typeof prod.weight_unit === "string" && prod.weight_unit.trim()) {
    return `${weightNum}${prod.weight_unit.trim()}`;
  }
  return "Adet";
}

function aggregateQuantities(lines: Array<{ productId: string; quantity: number }>): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of lines) {
    map.set(line.productId, round2((map.get(line.productId) ?? 0) + line.quantity));
  }
  return map;
}

function parseRpcTxSummary(raw: unknown): B2BHotSaleTransactionSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const transactionId = typeof obj.transaction_id === "string" ? obj.transaction_id : "";
  if (!transactionId) return null;
  return {
    transactionId,
    slipNumber: typeof obj.slip_number === "string" ? obj.slip_number : "",
    delta: round2(Number(obj.delta) || 0),
    balanceAfter: round2(Number(obj.balance_after) || 0),
  };
}

function mapPaymentMethodToDb(method: B2BHotSalePaymentMethod | undefined): string | null {
  if (!method) return null;
  if (method === "havale") return "banka_havale";
  return method;
}

/**
 * Araçtan B2B sıcak satış + bayat/fire iadesi + kapıda tahsilatı tek atomik RPC'de kaydeder.
 * Fiyatlar yalnızca sunucudaki products + current_accounts.custom_prices üzerinden hesaplanır.
 */
export async function POST(request: Request) {
  const guard = await requireCapability(request, "cari.hot_sale");
  if (!guard.ok) return guard.response;

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = HotSaleRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (input.allowOverLimit && !guard.auth.isAdmin) {
    return NextResponse.json(
      { error: "Kredi limitini aşan sıcak satış onayı yalnızca yönetici (admin) tarafından verilebilir." },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const { data: accountData, error: accountErr } = await supabase
      .from("current_accounts")
      .select(
        "id, name, company_title, contact_person, phone, address, district, neighborhood, tax_number, tax_office, credit_limit, share_token_version, custom_prices, balance, archived_at",
      )
      .eq("id", input.accountId)
      .maybeSingle();

    if (accountErr) throw accountErr;
    if (!accountData) {
      return NextResponse.json({ error: "Cari hesap bulunamadı." }, { status: 404 });
    }

    const acc = accountData as AccountDbRow;
    if (acc.archived_at) {
      return NextResponse.json(
        { error: "Arşivlenmiş cari hesaba sıcak satış yapılamaz.", code: "ARCHIVED_ACCOUNT" },
        { status: 400 },
      );
    }

    const deliveredMap = aggregateQuantities(input.items);
    const returnMap = aggregateQuantities(input.returnItems);
    const allProductIds = Array.from(new Set([...deliveredMap.keys(), ...returnMap.keys()]));

    const { data: productsData, error: productsErr } = await supabase
      .from("products")
      .select("id, name, price, unit_label, weight, weight_unit")
      .in("id", allProductIds);

    if (productsErr) throw productsErr;

    const productRows = Array.isArray(productsData) ? (productsData as ProductDbRow[]) : [];
    const productById = new Map<string, ProductDbRow>();
    for (const prod of productRows) {
      productById.set(prod.id, prod);
    }

    const missingProductId = allProductIds.find((pid) => !productById.has(pid));
    if (missingProductId) {
      return NextResponse.json(
        { error: `Seçilen ürün katalogda bulunamadı (${missingProductId}).` },
        { status: 400 },
      );
    }

    const customPrices = parseCustomPrices(acc.custom_prices);
    const resolvedItems: B2BHotSaleItem[] = [];
    let grossTotal = 0;
    let returnTotal = 0;

    const resolveUnitPrice = (prod: ProductDbRow): number => {
      const custom = customPrices[prod.id];
      if (typeof custom === "number" && Number.isFinite(custom) && custom > 0) {
        return round2(custom);
      }
      const catalog = Number(prod.price);
      return Number.isFinite(catalog) && catalog > 0 ? round2(catalog) : 0;
    };

    for (const [productId, quantity] of deliveredMap.entries()) {
      const prod = productById.get(productId)!;
      const unitPrice = resolveUnitPrice(prod);
      if (unitPrice <= 0) {
        return NextResponse.json(
          { error: `${prod.name} için geçerli birim fiyat tanımlı değil.` },
          { status: 400 },
        );
      }
      const lineTotal = round2(quantity * unitPrice);
      grossTotal = round2(grossTotal + lineTotal);
      resolvedItems.push({
        productId,
        name: prod.name,
        productName: prod.name,
        quantity,
        unitPrice,
        lineTotal,
        unit: resolveUnit(prod),
        isReturn: false,
      });
    }

    for (const [productId, quantity] of returnMap.entries()) {
      const prod = productById.get(productId)!;
      const unitPrice = resolveUnitPrice(prod);
      if (unitPrice <= 0) {
        return NextResponse.json(
          { error: `${prod.name} için geçerli iade birim fiyatı tanımlı değil.` },
          { status: 400 },
        );
      }
      const absLineTotal = round2(quantity * unitPrice);
      returnTotal = round2(returnTotal + absLineTotal);
      resolvedItems.push({
        productId,
        name: `${prod.name} (İade)`,
        productName: prod.name,
        quantity: -quantity,
        unitPrice,
        lineTotal: -absLineTotal,
        unit: resolveUnit(prod),
        isReturn: true,
      });
    }

    const netAmount = round2(grossTotal - returnTotal);
    if (netAmount <= 0) {
      return NextResponse.json(
        {
          error:
            "İade toplamı teslimat toplamını aşamaz; net satış tutarı 0'dan büyük olmalıdır. Tam iade için cari alacak / storno kullanın.",
        },
        { status: 400 },
      );
    }

    const collectedAmount = round2(input.collectedAmount);
    const saleDate = input.date ?? istanbulToday();
    const effectivePaymentMethod: B2BHotSalePaymentMethod | undefined =
      collectedAmount > 0 ? (input.paymentMethod ?? "nakit") : undefined;
    const description =
      input.description?.trim() ||
      (returnTotal > 0 ? "Araçtan sıcak satış + bayat/fire iade" : "Araçtan sıcak satış");

    const { data: rpcRaw, error: rpcErr } = await supabase.rpc("record_b2b_hot_sale_atomic", {
      p_account_id: acc.id,
      p_items: resolvedItems,
      p_amount: netAmount,
      p_collected_amount: collectedAmount,
      p_payment_method: mapPaymentMethodToDb(effectivePaymentMethod),
      p_description: description,
      p_date: saleDate,
      p_created_by: guard.auth.userId,
      p_allow_over_limit: Boolean(input.allowOverLimit && guard.auth.isAdmin),
    });

    if (rpcErr) {
      const msg = rpcErr.message || "";
      if (msg.includes("CREDIT_LIMIT_EXCEEDED")) {
        return NextResponse.json(
          {
            error: "Cari kredi limiti aşılıyor. Tahsilat alın veya yönetici onayı ile işlem yapın.",
            code: "CREDIT_LIMIT_EXCEEDED",
          },
          { status: 409 },
        );
      }
      if (msg.includes("ARCHIVED_ACCOUNT")) {
        return NextResponse.json(
          { error: "Arşivlenmiş cari hesaba sıcak satış yapılamaz.", code: "ARCHIVED_ACCOUNT" },
          { status: 400 },
        );
      }
      if (msg.includes("CARI_NOT_FOUND")) {
        return NextResponse.json({ error: "Cari hesap bulunamadı." }, { status: 404 });
      }
      if (msg.includes("INVALID_AMOUNT") || msg.includes("INVALID_COLLECTED_AMOUNT")) {
        return NextResponse.json({ error: "Geçersiz satış veya tahsilat tutarı." }, { status: 400 });
      }
      // Hard Fail: asla parçalı insert fallback'e düşülmez
      logError("POST /api/admin/cari/hot-sale RPC failed:", rpcErr);
      return NextResponse.json(
        { error: "Atomik sıcak satış kaydı başarısız oldu; işlem iptal edildi." },
        { status: 500 },
      );
    }

    const rpcObj =
      rpcRaw && typeof rpcRaw === "object" && !Array.isArray(rpcRaw)
        ? (rpcRaw as Record<string, unknown>)
        : null;
    const saleTransaction = parseRpcTxSummary(rpcObj?.sale_transaction);
    if (!saleTransaction) {
      logError("POST /api/admin/cari/hot-sale malformed RPC payload:", rpcRaw);
      return NextResponse.json({ error: "Sıcak satış fiş yanıtı doğrulanamadı." }, { status: 500 });
    }

    const paymentTransaction = parseRpcTxSummary(rpcObj?.payment_transaction);
    const rawBalanceAfter = Number(rpcObj?.balance_after);
    const balanceAfter = Number.isFinite(rawBalanceAfter)
      ? round2(rawBalanceAfter)
      : (paymentTransaction?.balanceAfter ?? saleTransaction.balanceAfter);
    const shareTokenVersion = Math.max(1, Math.trunc(Number(acc.share_token_version) || 1));
    const slipToken = signSlipToken(saleTransaction.transactionId, shareTokenVersion);
    if (!slipToken) {
      logError("POST /api/admin/cari/hot-sale missing HMAC secret for slip token", {
        txId: saleTransaction.transactionId,
      });
      return NextResponse.json({ error: "Fiş paylaşım anahtarı yapılandırılmamış." }, { status: 500 });
    }
    const signedSlipUrl = `${SITE_URL}/fis/${saleTransaction.transactionId}?t=${encodeURIComponent(slipToken)}`;

    const accountSummary: B2BHotSaleAccountSummary = {
      id: acc.id,
      businessName: acc.name,
      companyTitle: acc.company_title?.trim() || undefined,
      contactPerson: acc.contact_person ?? "",
      phone: acc.phone ?? "",
      address: acc.address ?? "",
      district: acc.district?.trim() || "Beylikdüzü",
      neighborhood: acc.neighborhood ?? "",
      taxNumber: acc.tax_number?.trim() || undefined,
      taxOffice: acc.tax_office?.trim() || undefined,
      creditLimit: round2(Number(acc.credit_limit) || 0),
      shareTokenVersion,
    };

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId ?? "",
      actorRole: guard.auth.role ?? "unknown",
      action: "cari.hot_sale",
      entityType: "account_transaction",
      entityId: saleTransaction.transactionId,
      summary: `B2B sıcak satış: ${acc.name} (${saleTransaction.slipNumber}) — Net ${netAmount.toFixed(2)} ₺, Tahsilat ${collectedAmount.toFixed(2)} ₺`,
      metadata: {
        accountId: acc.id,
        slipNumber: saleTransaction.slipNumber,
        paymentSlipNumber: paymentTransaction?.slipNumber ?? null,
        grossTotal,
        returnTotal,
        netAmount,
        collectedAmount,
        paymentMethod: effectivePaymentMethod ?? null,
        allowOverLimit: Boolean(input.allowOverLimit && guard.auth.isAdmin),
        balanceAfter,
        itemCount: resolvedItems.length,
      },
    });

    const responseBody: B2BHotSaleResult = {
      success: true,
      saleTransaction,
      paymentTransaction,
      balanceAfter,
      signedSlipUrl,
      account: accountSummary,
      items: resolvedItems,
      grossTotal,
      returnTotal,
      netAmount,
      collectedAmount,
      paymentMethod: effectivePaymentMethod,
      date: saleDate,
      description,
    };

    return NextResponse.json(responseBody);
  } catch (err: unknown) {
    logError("POST /api/admin/cari/hot-sale:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Sıcak satış işlenemedi." }, { status: 500 });
  }
}
