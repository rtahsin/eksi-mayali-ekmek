import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

test.describe("Order Flow & Concurrency E2E Tests", () => {
  const createdOrderIds: string[] = [];

  test.afterAll(async () => {
    // Clean up created test orders to avoid polluting production DB
    if (supabaseAdmin && createdOrderIds.length > 0) {
      console.log(`Cleaning up ${createdOrderIds.length} E2E test orders...`);
      for (const id of createdOrderIds) {
        await supabaseAdmin.from("orders").delete().eq("id", id);
      }
    }
  });

  test("1. Storefront homepage loads with artisan branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=EkmekLab").first()).toBeVisible();
    await expect(page).toHaveTitle(/EkmekLab/i);
  });

  test("2. /api/orders/create creates a single valid order with formatted order_number", async ({ request }) => {
    const payload = {
      customerInfo: {
        name: "Playwright Test User",
        phone: "05551234567",
        district: "Beylikdüzü",
        neighborhood: "Barış",
        addressDetail: "Test Sk. No: 5",
        deliveryDate: "today",
      },
      items: [
        {
          productId: "sample-ekmek-1",
          quantity: 1,
        },
      ],
      deliveryMethod: "courier",
      paymentMethod: "cash_on_delivery",
      idempotencyKey: `pw-single-${Date.now()}`,
    };

    const response = await request.post("/api/orders/create", {
      data: payload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.order).toBeDefined();
    expect(body.order.orderNumber).toMatch(/^SIP-\d{4}-\d{3}$/);
    expect(body.order.subtotal).toBe(150);
    expect(body.order.totalAmount).toBe(300); // 150 subtotal + 150 shipping

    createdOrderIds.push(body.order.id);
  });

  test("3. Concurrency test: 5 simultaneous orders produce unique, non-colliding order numbers", async ({ request }) => {
    const concurrentCount = 5;
    const promises = Array.from({ length: concurrentCount }).map((_, idx) => {
      const payload = {
        customerInfo: {
          name: `Playwright Concurrent ${idx + 1}`,
          phone: `0555123450${idx}`,
          district: "Beylikdüzü",
          neighborhood: "Cumhuriyet",
          addressDetail: `Adnan Kahveci Cad. No: ${idx + 10}`,
          deliveryDate: "today",
        },
        items: [
          {
            productId: "sample-ekmek-1",
            quantity: 1,
          },
        ],
        deliveryMethod: "courier",
        paymentMethod: "cash_on_delivery",
        idempotencyKey: `pw-concurrent-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      };

      return request.post("/api/orders/create", { data: payload });
    });

    const responses = await Promise.all(promises);

    const orderNumbers: string[] = [];

    for (const res of responses) {
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.orderNumber).toMatch(/^SIP-\d{4}-\d{3}$/);
      orderNumbers.push(json.order.orderNumber);
      createdOrderIds.push(json.order.id);
    }

    // Assert that every generated order number is unique (NO COLLISIONS!)
    const uniqueNumbers = new Set(orderNumbers);
    expect(uniqueNumbers.size).toBe(concurrentCount);
    console.log("Successfully generated concurrent order numbers:", orderNumbers);
  });
});
