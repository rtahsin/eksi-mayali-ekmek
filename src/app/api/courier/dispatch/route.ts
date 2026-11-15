import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveCourierOrAdmin } from "@/lib/security/apiAuth";
import { istanbulToday, isIsoDate } from "@/lib/time/istanbul";
import { sortStops, type RoutableStop } from "@/lib/delivery/maps";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

const cents = (v: number) => Math.round(v * 100) / 100;
const UuidSchema = z.string().uuid();

const CLAIMABLE_STATUSES = ["hazirlaniyor", "firinda", "kuryede"] as const;

interface CourierRow {
  id: string;
  profile_id: string | null;
  display_name: string;
  phone: string;
  vehicle_type: string | null;
  is_active: boolean | null;
  is_on_shift: boolean | null;
}

interface OrderItemRow {
  order_id: string;
  product_id: string | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | string | null;
  total_price: number | string | null;
  weight: number | null;
}

interface OrderRow {
  id: string;
  order_number: string | null;
  status: string;
  customer_name: string | null;
  phone: string | null;
  delivery_address: string | null;
  neighborhood: string | null;
  district: string | null;
  delivery_method: string | null;
  delivery_date: string;
  delivery_time_window: string | null;
  order_notes: string | null;
  courier_notes: string | null;
  customer_lat: number | null;
  customer_lng: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  total_amount: number | string | null;
  payment_method: string | null;
  payment_status: string | null;
  cari_id: string | null;
  courier_id: string | null;
  stop_sequence: number | null;
  created_at: string;
}

interface LocationRow {
  order_id: string;
  lat: number;
  lng: number;
  created_at: string;
}

interface PaymentRow {
  order_id: string;
  amount: number | string | null;
  method: string;
  collected_by: string | null;
  courier_id: string | null;
}

interface SlipRow {
  order_id: string | null;
  slip_number: string | null;
  reverses_id: string | null;
  created_at: string;
}

interface AccountRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  neighborhood: string | null;
  balance: number | string | null;
  credit_limit: number | string | null;
  custom_prices: unknown;
  account_type: string | null;
  type: string | null;
  archived_at: string | null;
}

interface ProductRow {
  id: string;
  name: string;
  price: number | string | null;
  category: string | null;
  weight: number | null;
  weight_unit: string | null;
  is_available: boolean | null;
}

interface SettlementRow {
  id: string;
  courier_id: string;
  settlement_date: string;
  cash_expected: number | string;
  card_expected: number | string;
  cari_delivered_total: number | string;
  delivered_count: number;
  cash_handed_over: number | string;
  card_slip_total: number | string;
  note: string | null;
  settled_at: string;
}

export interface DispatchStopItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

export interface DispatchStop extends RoutableStop {
  id: string;
  orderNumber: string;
  slipNumber: string | null;
  status: string;
  customerName: string;
  customerPhone: string;
  address: string;
  neighborhood: string;
  district: string;
  deliveryNote: string;
  lat: number | null;
  lng: number | null;
  items: DispatchStopItem[];
  totalAmount: number;
  paidAmount: number;
  remainingDue: number;
  paymentMethod: string;
  paymentStatus: string;
  cariId: string | null;
  cariName: string | null;
  stopSequence: number | null;
  courierId: string | null;
  courierName: string | null;
}

function parseCustomPrices(raw: unknown): Record<string, number> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (Number.isFinite(n) && n >= 0) out[k] = cents(n);
  }
  return out;
}

function formatDeliveryNote(orderNotes: string | null, courierNotes: string | null): string {
  const parts = [orderNotes?.trim(), courierNotes?.trim()].filter(
    (p): p is string => Boolean(p && p.length > 0)
  );
  return Array.from(new Set(parts)).join(" · ");
}

/**
 * Hibrit Kurye Dağıtım Konsolu verisi:
 * - Kurye rolü yalnız kendi `courierDbId` duraklarını görür; `courierId` query paramı yalnız admin/superadmin içindir.
 * - `date` verilmezse İstanbul bugünü kullanılır.
 */
export async function GET(req: Request) {
  const guard = await requireActiveCourierOrAdmin(req, { allowStaff: true });
  if (!guard.ok) return guard.response;

  try {
    const canManageDispatch = guard.auth.isAdmin || guard.auth.role === "staff";
    const url = new URL(req.url);
    const rawDate = url.searchParams.get("date");
    if (rawDate && !isIsoDate(rawDate)) {
      return NextResponse.json({ error: "Geçersiz tarih formatı (YYYY-AA-GG)." }, { status: 400 });
    }
    const targetDate = rawDate ?? istanbulToday();

    const rawCourierId = url.searchParams.get("courierId");
    let targetCourierId: string | null = guard.courierDbId;

    if (canManageDispatch) {
      if (rawCourierId === "all") {
        targetCourierId = null;
      } else if (rawCourierId) {
        const parsedUuid = UuidSchema.safeParse(rawCourierId);
        if (!parsedUuid.success) {
          return NextResponse.json({ error: "Geçersiz kurye kimliği." }, { status: 400 });
        }
        targetCourierId = parsedUuid.data;
      }
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
    }

    // Kurye profili ve admin/personel için aktif kurye listesi
    let selectedCourier: {
      id: string;
      displayName: string;
      isActive: boolean;
      isOnShift: boolean;
    } | null = null;
    let adminCouriers: {
      id: string;
      displayName: string;
      isActive: boolean;
      isOnShift: boolean;
    }[] = [];

    if (canManageDispatch) {
      const { data: courierRows, error: courErr } = await supabase
        .from("couriers")
        .select("id, profile_id, display_name, phone, vehicle_type, is_active, is_on_shift")
        .eq("is_active", true)
        .order("display_name", { ascending: true });
      if (courErr) throw courErr;

      adminCouriers = ((courierRows ?? []) as CourierRow[]).map((c) => ({
        id: c.id,
        displayName: c.display_name,
        isActive: c.is_active === true,
        isOnShift: c.is_on_shift === true,
      }));
      if (targetCourierId) {
        selectedCourier = adminCouriers.find((c) => c.id === targetCourierId) ?? null;
      }
    } else if (targetCourierId) {
      const { data: courierRow, error: courErr } = await supabase
        .from("couriers")
        .select("id, profile_id, display_name, phone, vehicle_type, is_active, is_on_shift")
        .eq("id", targetCourierId)
        .maybeSingle();
      if (courErr) throw courErr;
      if (courierRow) {
        const c = courierRow as CourierRow;
        selectedCourier = {
          id: c.id,
          displayName: c.display_name,
          isActive: c.is_active === true,
          isOnShift: c.is_on_shift === true,
        };
      }
    }

    // Siparişler, aktif cariler ve aktif ürünler paralel çekilir
    const orderColumns =
      "id, order_number, status, customer_name, phone, delivery_address, neighborhood, district, delivery_method, delivery_date, delivery_time_window, order_notes, courier_notes, customer_lat, customer_lng, delivery_lat, delivery_lng, total_amount, payment_method, payment_status, cari_id, courier_id, stop_sequence, created_at";

    let myOrdersQuery = supabase
      .from("orders")
      .select(orderColumns)
      .eq("delivery_date", targetDate)
      .eq("delivery_method", "courier")
      .in("status", ["hazirlaniyor", "firinda", "kuryede", "teslim_edildi"]);

    if (targetCourierId) {
      myOrdersQuery = myOrdersQuery.eq("courier_id", targetCourierId);
    } else if (canManageDispatch) {
      myOrdersQuery = myOrdersQuery.not("courier_id", "is", null);
    } else {
      // courierDbId olmayan kurye boş durak görür
      myOrdersQuery = myOrdersQuery.eq("courier_id", "00000000-0000-0000-0000-000000000000");
    }

    const benchQuery = supabase
      .from("orders")
      .select(orderColumns)
      .eq("delivery_date", targetDate)
      .eq("delivery_method", "courier")
      .is("courier_id", null)
      .in("status", [...CLAIMABLE_STATUSES])
      .order("created_at", { ascending: true });

    const settlementQuery = targetCourierId
      ? supabase
          .from("courier_settlements")
          .select(
            "id, courier_id, settlement_date, cash_expected, card_expected, cari_delivered_total, delivered_count, cash_handed_over, card_slip_total, note, settled_at"
          )
          .eq("courier_id", targetCourierId)
          .eq("settlement_date", targetDate)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [myOrdersRes, benchRes, accountsRes, productsRes, settlementRes] = await Promise.all([
      myOrdersQuery,
      benchQuery,
      supabase
        .from("current_accounts")
        .select("id, name, phone, address, neighborhood, balance, credit_limit, custom_prices, account_type, type, archived_at")
        .is("archived_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("products")
        .select("id, name, price, category, weight, weight_unit, is_available")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true }),
      settlementQuery,
    ]);

    if (myOrdersRes.error) throw myOrdersRes.error;
    if (benchRes.error) throw benchRes.error;
    if (accountsRes.error) throw accountsRes.error;
    if (productsRes.error) throw productsRes.error;
    if (settlementRes.error) throw settlementRes.error;

    const myOrderRows = (myOrdersRes.data ?? []) as OrderRow[];
    const benchOrderRows = (benchRes.data ?? []) as OrderRow[];
    const allOrderRows = [...myOrderRows, ...benchOrderRows];
    const allOrderIds = Array.from(new Set(allOrderRows.map((o) => o.id)));

    const productUnitMap = new Map<string, string>();
    const catalogProducts = ((productsRes.data ?? []) as ProductRow[]).map((p) => {
      const unit = p.weight && p.weight_unit ? `${p.weight}${p.weight_unit}` : "adet";
      productUnitMap.set(p.id, p.weight_unit || "adet");
      return {
        id: p.id,
        name: p.name,
        price: cents(Number(p.price) || 0),
        category: p.category ?? "ekmek",
        weight: p.weight ?? null,
        weightUnit: p.weight_unit ?? "adet",
        unitLabel: unit,
        isAvailable: p.is_available !== false,
      };
    });

    const cariNameMap = new Map<string, string>();
    const b2bAccounts = ((accountsRes.data ?? []) as AccountRow[])
      .filter((a) => (a.account_type ?? a.type) !== "gider")
      .map((a) => {
        cariNameMap.set(a.id, a.name);
        return {
          id: a.id,
          businessName: a.name,
          phone: a.phone ?? "",
          address: a.address ?? "",
          neighborhood: a.neighborhood ?? "",
          balance: cents(Number(a.balance) || 0),
          creditLimit: cents(Number(a.credit_limit) || 0),
          customPrices: parseCustomPrices(a.custom_prices),
        };
      });

    // Kalemler, GPS pinleri, ödemeler ve fiş numaraları tek turda yüklenir
    const itemsByOrder = new Map<string, DispatchStopItem[]>();
    const locationByOrder = new Map<string, { lat: number; lng: number }>();
    const paymentsByOrder = new Map<string, PaymentRow[]>();
    const slipByOrder = new Map<string, string>();

    if (allOrderIds.length > 0) {
      const [itemsRes, locRes, payRes, slipRes] = await Promise.all([
        supabase
          .from("order_items")
          .select("order_id, product_id, product_name, quantity, unit_price, total_price, weight")
          .in("order_id", allOrderIds),
        supabase
          .from("customer_locations")
          .select("order_id, lat, lng, created_at")
          .in("order_id", allOrderIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("order_id, amount, method, collected_by, courier_id")
          .in("order_id", allOrderIds)
          .eq("status", "completed"),
        supabase
          .from("account_transactions")
          .select("order_id, slip_number, reverses_id, created_at")
          .in("order_id", allOrderIds)
          .eq("type", "satis")
          .order("created_at", { ascending: false }),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (locRes.error) throw locRes.error;
      if (payRes.error) throw payRes.error;
      if (slipRes.error) throw slipRes.error;

      for (const it of (itemsRes.data ?? []) as OrderItemRow[]) {
        const list = itemsByOrder.get(it.order_id) ?? [];
        const prodUnit = it.product_id ? productUnitMap.get(it.product_id) : undefined;
        list.push({
          productId: it.product_id ?? "",
          productName: it.product_name ?? "Ürün",
          quantity: Number(it.quantity) || 1,
          unitPrice: cents(Number(it.unit_price) || 0),
          totalPrice: cents(Number(it.total_price) || 0),
          unit: prodUnit || "adet",
        });
        itemsByOrder.set(it.order_id, list);
      }

      for (const loc of (locRes.data ?? []) as LocationRow[]) {
        if (!locationByOrder.has(loc.order_id)) {
          locationByOrder.set(loc.order_id, { lat: loc.lat, lng: loc.lng });
        }
      }

      for (const p of (payRes.data ?? []) as PaymentRow[]) {
        const list = paymentsByOrder.get(p.order_id) ?? [];
        list.push(p);
        paymentsByOrder.set(p.order_id, list);
      }

      for (const s of (slipRes.data ?? []) as SlipRow[]) {
        if (s.order_id && s.slip_number && !s.reverses_id && !slipByOrder.has(s.order_id)) {
          slipByOrder.set(s.order_id, s.slip_number);
        }
      }
    }

    const missingCariIds = Array.from(
      new Set(
        allOrderRows
          .map((o) => o.cari_id)
          .filter((cid): cid is string => Boolean(cid) && !cariNameMap.has(cid!))
      )
    );
    if (missingCariIds.length > 0) {
      const { data: extraAccounts } = await supabase
        .from("current_accounts")
        .select("id, name")
        .in("id", missingCariIds);
      for (const a of (extraAccounts ?? []) as { id: string; name: string }[]) {
        cariNameMap.set(a.id, a.name);
      }
    }

    const courierNameMap = new Map<string, string>();
    for (const c of adminCouriers) {
      courierNameMap.set(c.id, c.displayName);
    }
    if (selectedCourier) {
      courierNameMap.set(selectedCourier.id, selectedCourier.displayName);
    }

    const toStop = (o: OrderRow): DispatchStop => {
      const totalAmount = cents(Number(o.total_amount) || 0);
      const orderPayments = paymentsByOrder.get(o.id) ?? [];
      const paidViaPayments = cents(
        orderPayments
          .filter((p) => p.method !== "cari")
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      );
      const paidAmount =
        o.payment_status === "paid" ? Math.max(paidViaPayments, totalAmount) : paidViaPayments;
      const remainingDue = Math.max(cents(totalAmount - paidAmount), 0);
      const pin = locationByOrder.get(o.id);
      const lat = pin?.lat ?? o.customer_lat ?? o.delivery_lat ?? null;
      const lng = pin?.lng ?? o.customer_lng ?? o.delivery_lng ?? null;

      return {
        id: o.id,
        orderNumber: o.order_number || o.id,
        slipNumber: slipByOrder.get(o.id) ?? null,
        status: o.status,
        customerName: o.customer_name || "İsimsiz Müşteri",
        customerPhone: o.phone || "",
        address: o.delivery_address || "",
        neighborhood: o.neighborhood || "Beylikdüzü",
        district: o.district || "Beylikdüzü",
        deliveryNote: formatDeliveryNote(o.order_notes, o.courier_notes),
        lat: typeof lat === "number" && Number.isFinite(lat) ? lat : null,
        lng: typeof lng === "number" && Number.isFinite(lng) ? lng : null,
        items: itemsByOrder.get(o.id) ?? [],
        totalAmount,
        paidAmount,
        remainingDue,
        paymentMethod: o.payment_method || "cash_on_delivery",
        paymentStatus: o.payment_status || "pending",
        cariId: o.cari_id ?? null,
        cariName: o.cari_id ? cariNameMap.get(o.cari_id) ?? null : null,
        stopSequence: typeof o.stop_sequence === "number" ? o.stop_sequence : null,
        deliveryTimeWindow: o.delivery_time_window,
        createdAt: o.created_at,
        courierId: o.courier_id ?? null,
        courierName: o.courier_id ? courierNameMap.get(o.courier_id) ?? null : null,
      };
    };

    const rawActiveStops = myOrderRows
      .filter((o) => o.status !== "teslim_edildi")
      .map(toStop);

    const manualOrderIds = rawActiveStops
      .filter((s) => s.stopSequence !== null)
      .sort((a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0))
      .map((s) => s.id);

    const myStops = sortStops(rawActiveStops, manualOrderIds);

    const deliveredRows = myOrderRows.filter((o) => o.status === "teslim_edildi");
    const deliveredStops = deliveredRows.map(toStop);

    // Kasa Özeti
    let cashExpected = 0;
    let cardExpected = 0;
    let cariDeliveredTotal = 0;

    for (const o of deliveredRows) {
      const orderTotal = cents(Number(o.total_amount) || 0);
      const orderPayments = paymentsByOrder.get(o.id) ?? [];

      let doorCash = 0;
      let doorCard = 0;
      for (const p of orderPayments) {
        const amt = cents(Number(p.amount) || 0);
        if (amt <= 0) continue;
        const collectedAtDoor =
          (o.courier_id && p.courier_id === o.courier_id) ||
          p.collected_by === "courier" ||
          (p.courier_id === null &&
            (o.payment_method === "cash_on_delivery" || o.payment_method === "pos_at_door"));
        if (!collectedAtDoor) continue;
        if (p.method === "cash") doorCash = cents(doorCash + amt);
        else if (p.method === "pos" || p.method === "pos_at_door") doorCard = cents(doorCard + amt);
      }

      if (orderPayments.length === 0 && o.payment_status === "paid" && !o.cari_id) {
        if (o.payment_method === "cash_on_delivery") doorCash = orderTotal;
        else if (o.payment_method === "pos_at_door") doorCard = orderTotal;
      }

      cashExpected = cents(cashExpected + doorCash);
      cardExpected = cents(cardExpected + doorCard);

      if (o.cari_id || o.payment_method === "cari") {
        const remainder = Math.max(cents(orderTotal - doorCash - doorCard), 0);
        cariDeliveredTotal = cents(cariDeliveredTotal + remainder);
      }
    }

    const sRow = (settlementRes.data as SettlementRow | null) ?? null;

    const claimableBench = benchOrderRows.map((o) => {
      const stop = toStop(o);
      return {
        id: stop.id,
        orderNumber: stop.orderNumber,
        status: stop.status,
        customerName: stop.customerName,
        customerPhone: stop.customerPhone,
        neighborhood: stop.neighborhood,
        district: stop.district,
        address: stop.address,
        deliveryNote: stop.deliveryNote,
        deliveryMethod: o.delivery_method || "courier",
        lat: stop.lat,
        lng: stop.lng,
        deliveryTimeWindow: stop.deliveryTimeWindow ?? null,
        items: stop.items,
        itemsSummary: stop.items.map((it) => `${it.quantity}× ${it.productName}`).join(", "),
        paymentMethod: stop.paymentMethod,
        paymentStatus: stop.paymentStatus,
        cariId: stop.cariId,
        cariName: stop.cariName,
        totalAmount: stop.totalAmount,
        remainingDue: stop.remainingDue,
        createdAt: stop.createdAt,
      };
    });

    return NextResponse.json({
      date: targetDate,
      isAdmin: guard.auth.isAdmin,
      canManageDispatch,
      isOnShift: selectedCourier?.isOnShift ?? guard.isOnShift,
      courier: selectedCourier,
      couriers: canManageDispatch ? adminCouriers : undefined,
      myStops,
      deliveredStops,
      claimableBench,
      kasaSummary: {
        deliveredCount: deliveredRows.length,
        cashExpected,
        cardExpected,
        cariDeliveredTotal,
        settlement: sRow
          ? {
              id: sRow.id,
              cashHandedOver: cents(Number(sRow.cash_handed_over) || 0),
              cardSlipTotal: cents(Number(sRow.card_slip_total) || 0),
              note: sRow.note,
              settledAt: sRow.settled_at,
            }
          : null,
      },
      b2bAccounts,
      catalogProducts,
    });
  } catch (err: unknown) {
    logError("GET /api/courier/dispatch:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Dağıtım listesi alınamadı." },
      { status: 500 }
    );
  }
}
