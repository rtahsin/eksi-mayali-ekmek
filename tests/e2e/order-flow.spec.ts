import { test, expect, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

/**
 * ⚠️ Bu testler GERÇEK veritabanına sipariş yazar (Vercel önizleme/yerel ortam canlı Supabase'e bağlıdır).
 * Tüm test siparişleri "TEST" önekiyle oluşturulur ve afterAll'da bağlı kayıtlarıyla silinir.
 */
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const allowProdWrites = process.env.ALLOW_PROD_WRITES === "1";
const supabaseAdmin = supabaseUrl && serviceKey && allowProdWrites ? createClient(supabaseUrl, serviceKey) : null;

async function firstDeliveryDate(request: APIRequestContext): Promise<string> {
  const res = await request.get("/api/availability");
  expect(res.ok()).toBeTruthy();
  const body: { dates: { date: string }[] } = await res.json();
  expect(body.dates.length).toBeGreaterThan(0);
  return body.dates[0].date;
}

async function activeProduct(): Promise<{ id: string; price: number }> {
  if (!supabaseAdmin) throw new Error("Supabase env yok (.env.local)");
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, price")
    .eq("is_active", true)
    .eq("is_available", true)
    .gt("price", 0)
    .order("price")
    .limit(1)
    .single();
  if (error || !data) throw new Error("Aktif ürün bulunamadı");
  return { id: data.id, price: Number(data.price) };
}

const orderPayload = (opts: { productId: string; date: string; idx: number; key: string }) => ({
  customerInfo: {
    name: `TEST Playwright ${opts.idx}`,
    phone: `0555123450${opts.idx}`,
    neighborhood: "Barış",
    addressDetail: `TEST Sk. No: ${opts.idx + 5}`,
    deliveryDate: opts.date,
  },
  items: [{ productId: opts.productId, quantity: 1 }],
  deliveryMethod: "courier",
  paymentMethod: "cash_on_delivery",
  idempotencyKey: opts.key,
  termsAccepted: true,
});

test.describe("Order Flow & Concurrency E2E Tests", () => {
  const createdOrderIds: string[] = [];

  test.beforeEach(() => {
    test.skip(process.env.ALLOW_PROD_WRITES !== "1", "ALLOW_PROD_WRITES=1 olmadan canlıya yazan E2E testleri koşmaz.");
  });

  test.afterAll(async () => {
    if (!supabaseAdmin || createdOrderIds.length === 0) return;
    for (const table of ["order_items", "order_status_history", "payments"]) {
      await supabaseAdmin.from(table).delete().in("order_id", createdOrderIds);
    }
    await supabaseAdmin.from("orders").delete().in("id", createdOrderIds).like("customer_name", "TEST%");
  });

  test("1. Storefront homepage loads with artisan branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=EkmekLab").first()).toBeVisible();
    await expect(page).toHaveTitle(/EkmekLab/i);
  });

  test("2. Geçersiz istekler reddedilir (eski tarih metni, onaysız)", async ({ request }) => {
    const product = await activeProduct();
    const date = await firstDeliveryDate(request);

    const legacyDate = await request.post("/api/orders/create", {
      data: { ...orderPayload({ productId: product.id, date, idx: 0, key: `pw-legacy-${Date.now()}` }), customerInfo: { ...orderPayload({ productId: product.id, date, idx: 0, key: "x" }).customerInfo, deliveryDate: "today" } },
    });
    expect(legacyDate.status()).toBe(400);

    const noTerms = await request.post("/api/orders/create", {
      data: { ...orderPayload({ productId: product.id, date, idx: 0, key: `pw-noterms-${Date.now()}` }), termsAccepted: false },
    });
    expect(noTerms.status()).toBe(400);
  });

  test("3. Tek geçerli sipariş + idempotency", async ({ request }) => {
    const product = await activeProduct();
    const date = await firstDeliveryDate(request);
    const key = `pw-single-${Date.now()}`;

    const first = await request.post("/api/orders/create", { data: orderPayload({ productId: product.id, date, idx: 1, key }) });
    expect(first.status()).toBe(200);
    const body = await first.json();
    expect(body.success).toBe(true);
    expect(body.order.orderNumber).toMatch(/^SIP-\d{4}-\d{3,}$/);
    expect(body.order.deliveryDate).toBe(date);
    expect(body.order.subtotal).toBe(product.price);
    expect(typeof body.trackingToken).toBe("string");
    createdOrderIds.push(body.order.id);

    const again = await request.post("/api/orders/create", { data: orderPayload({ productId: product.id, date, idx: 1, key }) });
    const againBody = await again.json();
    expect(againBody.order.id).toBe(body.order.id);
  });

  test("4. 5 eşzamanlı sipariş benzersiz sipariş numarası alır", async ({ request }) => {
    const product = await activeProduct();
    const date = await firstDeliveryDate(request);
    const responses = await Promise.all(
      Array.from({ length: 5 }).map((_, idx) =>
        request.post("/api/orders/create", {
          data: orderPayload({ productId: product.id, date, idx: idx + 2, key: `pw-concurrent-${Date.now()}-${idx}` }),
        })
      )
    );

    const orderNumbers: string[] = [];
    for (const res of responses) {
      expect(res.status()).toBe(200);
      const json = await res.json();
      orderNumbers.push(json.order.orderNumber);
      createdOrderIds.push(json.order.id);
    }
    expect(new Set(orderNumbers).size).toBe(5);
  });
});
