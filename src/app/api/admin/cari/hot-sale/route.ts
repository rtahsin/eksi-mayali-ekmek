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
import { parseCustomPrices } from "@/lib/cari/account";
import type {
  B2BHotSaleAccountSummary,
  B2BHotSaleItem,
  B2BHotSalePaymentMethod,
  B2BHotSaleResult,
  B2BHotSaleTransactionSummary,
} from "@/types/admin";

const HotSaleQuantitySchema = z.coerce
  .number()
  .int("Miktar tam sayı olmalıdır.")
  .min(1, "Miktar en az 1 olmalıdır.")
  .max(5000, "Tek kalemde en fazla 5.000 adet girilebilir.");

const CatalogHotSaleLineSchema = z.object({
  productId: z.string().trim().min(1, "Ürün kimliği zorunludur."),
  quantity: HotSaleQuantitySchema,
  unitPriceOverride: z.coerce
    .number()
    .min(0, "Birim fiyat negatif olamaz.")
    .max(1_000_000, "Birim fiyat çok yüksek.")
    .finite()
    .optional(),
});

const CustomHotSaleLineSchema = z.object({
  productId: z.string().trim().max(0).nullable().optional(),
  customName: z
    .string()
    .trim()
    .min(1, "Özel kalem adı zorunludur.")
    .max(120, "Özel kalem adı en fazla 120 karakter olabilir."),
  unitPrice: z.coerce
    .number()
    .min(0, "Birim fiyat negatif olamaz.")
    .max(1_000_000, "Birim fiyat çok yüksek.")
    .finite(),
  quantity: HotSaleQuantitySchema,
});

const HotSaleLineInputSchema = z.union([CatalogHotSaleLineSchema, CustomHotSaleLineSchema]);
type HotSaleLineInput = z.infer<typeof HotSaleLineInputSchema>;
type CatalogHotSaleLine = z.infer<typeof CatalogHotSaleLineSchema>;

function isCatalogLine(line: HotSaleLineInput): line is CatalogHotSaleLine {
  return typeof line.productId === "string" && line.productId.length > 0;
}

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
  tax_id: string | null;
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
  weight: number | string | null;
  weight_unit: string | null;
  is_active: boolean | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function resolveUnit(prod: ProductDbRow): string {
  const weightNum = Number(prod.weight);
  if (Number.isFinite(weightNum) && weightNum > 0 && typeof prod.weight_unit === "string" && prod.weight_unit.trim()) {
    return `${weightNum}${prod.weight_unit.trim()}`;
  }
  return "adet";
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
  if (method === "kredi_karti") return "pos";
  if (method === "havale") return "banka_havale";
  return "nakit";
}

/**
 * Araçtan B2B sıcak satış + bayat/fire iadesi + kapıda tahsilatı tek atomik RPC'de kaydeder.
 * Katalog fiyatlarında kurye override gönderse dahi sunucudaki custom_prices / catalog fiyatı zorlanır;
 * yalnızca admin/superadmin birim fiyat override'ı yapabilir.
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
        "id, name, company_title, contact_person, phone, address, district, neighborhood, tax_id, tax_office, credit_limit, share_token_version, custom_prices, balance, archived_at",
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

    const catalogProductIds = Array.from(
      new Set(
        [...input.items, ...input.returnItems]
          .filter(isCatalogLine)
          .map((line) => line.productId),
      ),
    );

    const productById = new Map<string, ProductDbRow>();
    if (catalogProductIds.length > 0) {
      const { data: productsData, error: productsErr } = await supabase
        .from("products")
        .select("id, name, price, weight, weight_unit, is_active")
        .in("id", catalogProductIds);

      if (productsErr) throw productsErr;

      const productRows = Array.isArray(productsData) ? (productsData as ProductDbRow[]) : [];
      for (const prod of productRows) {
        productById.set(prod.id, prod);
      }

      const missingProductId = catalogProductIds.find((pid) => !productById.has(pid));
      if (missingProductId) {
        return NextResponse.json(
          { error: `Seçilen ürün katalogda bulunamadı (${missingProductId}).` },
          { status: 400 },
        );
      }
    }

    const customPrices = parseCustomPrices(acc.custom_prices);
    let grossTotal = 0;
    let returnTotal = 0;
    let overrideUsed = false;
    let customItemCount = 0;

    const resolveLines = (lines: HotSaleLineInput[], isReturn: boolean): { items: B2BHotSaleItem[]; error?: string } => {
      const grouped = new Map<string, B2BHotSaleItem>();

      for (const line of lines) {
        let productId: string | null = null;
        let baseName = "";
        let unitPrice = 0;
        let unit = "adet";

        if (isCatalogLine(line)) {
          const prod = productById.get(line.productId)!;
          if (prod.is_active === false) {
            return { items: [], error: `${prod.name} şu anda aktif değil.` };
          }
          productId = prod.id;
          baseName = prod.name;
          unit = resolveUnit(prod);

          if (guard.auth.isAdmin && line.unitPriceOverride !== undefined) {
            unitPrice = round2(line.unitPriceOverride);
            overrideUsed = true;
          } else if (Object.prototype.hasOwnProperty.call(customPrices, prod.id)) {
            unitPrice = round2(customPrices[prod.id]);
          } else {
            const catalog = Number(prod.price);
            if (!Number.isFinite(catalog) || catalog <= 0) {
              return {
                items: [],
                error: `${prod.name} için geçerli ${isReturn ? "iade " : ""}birim fiyat tanımlı değil.`,
              };
            }
            unitPrice = round2(catalog);
          }
        } else {
          productId = null;
          baseName = line.customName;
          unitPrice = round2(line.unitPrice);
          unit = "adet";
          customItemCount += 1;
        }

        const key = `${productId ?? `custom:${baseName}`}::${unitPrice}`;
        const existing = grouped.get(key);
        const signedQty = isReturn ? -line.quantity : line.quantity;

        if (existing) {
          existing.quantity += signedQty;
          existing.lineTotal = round2(existing.quantity * unitPrice);
        } else {
          grouped.set(key, {
            productId,
            name: isReturn ? `${baseName} (İade)` : baseName,
            productName: baseName,
            quantity: signedQty,
            unitPrice,
            lineTotal: round2(signedQty * unitPrice),
            unit,
            isReturn,
          });
        }
      }

      return { items: Array.from(grouped.values()) };
    };

    const deliveredResolved = resolveLines(input.items, false);
    if (deliveredResolved.error) {
      return NextResponse.json({ error: deliveredResolved.error }, { status: 400 });
    }
    const returnResolved = resolveLines(input.returnItems, true);
    if (returnResolved.error) {
      return NextResponse.json({ error: returnResolved.error }, { status: 400 });
    }

    for (const item of deliveredResolved.items) {
      grossTotal = round2(grossTotal + item.lineTotal);
    }
    for (const item of returnResolved.items) {
      returnTotal = round2(returnTotal + Math.abs(item.lineTotal));
    }
    const resolvedItems: B2BHotSaleItem[] = [...deliveredResolved.items, ...returnResolved.items];

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
      taxNumber: acc.tax_id?.trim() || undefined,
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
        overrideUsed,
        customItemCount,
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
