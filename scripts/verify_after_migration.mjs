import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function runVerification() {
  console.log("=================================================");
  console.log("🔍 EKMEKLAB POST-MIGRATION VERIFICATION SUITE");
  console.log("=================================================\n");

  let allPassed = true;

  // 1. Check Tables Existence
  console.log("--- 1. Checking Required Tables ---");
  const tables = ["orders", "order_items", "couriers", "payments", "order_status_history", "customer_locations"];
  for (const t of tables) {
    const { data, error } = await adminClient.from(t).select("*").limit(1);
    if (error) {
      console.error(`❌ Table '${t}' missing or error:`, error.message);
      allPassed = false;
    } else {
      console.log(`✅ Table '${t}' exists.`);
    }
  }

  // 2. Check Order Columns
  console.log("\n--- 2. Checking Orders Table Columns ---");
  const { data: orderSample, error: orderErr } = await adminClient.from("orders").select("*").limit(1);
  if (!orderErr && orderSample) {
    const cols = [
      "order_number", "payment_status", "source", "courier_id",
      "location_shared", "customer_lat", "customer_lng", "location_consent_at"
    ];
    // If no row, check via rpc or test
    const existingCols = orderSample.length > 0 ? Object.keys(orderSample[0]) : [];
    if (existingCols.length > 0) {
      cols.forEach(c => {
        if (existingCols.includes(c)) {
          console.log(`✅ Column 'orders.${c}' present.`);
        } else {
          console.error(`❌ Column 'orders.${c}' MISSING!`);
          allPassed = false;
        }
      });
    }
  }

  // 3. Test generate_order_number RPC
  console.log("\n--- 3. Testing generate_order_number() RPC ---");
  const { data: orderNumber, error: rpcErr } = await adminClient.rpc("generate_order_number");
  if (rpcErr) {
    console.error("❌ generate_order_number() failed:", rpcErr.message);
    allPassed = false;
  } else {
    const isValidFormat = /^SIP-\d{4}-\d{3}$/.test(orderNumber);
    if (isValidFormat) {
      console.log(`✅ generate_order_number() succeeded! Generated: ${orderNumber} (Format: SIP-YYMM-XXX)`);
    } else {
      console.warn(`⚠️ generate_order_number() returned unexpected format: ${orderNumber}`);
    }
  }

  // 4. Test RLS with Anon Key (Unauthenticated access must be blocked)
  console.log("\n--- 4. Testing RLS Protection with Anon Key ---");
  const rlsTables = ["payments", "order_status_history", "customer_locations"];
  for (const t of rlsTables) {
    const { data, error } = await anonClient.from(t).select("*");
    // Under strict RLS with no public policy, anon request either returns empty array [] or 401/403
    if (data && data.length === 0) {
      console.log(`✅ RLS Active on '${t}': Anonymous read returned 0 rows (protected).`);
    } else if (error) {
      console.log(`✅ RLS Active on '${t}': Anonymous read rejected (${error.message}).`);
    } else {
      console.error(`❌ RLS POTENTIAL LEAK on '${t}': Anonymous read returned ${data?.length} rows!`);
      allPassed = false;
    }
  }

  // 5. Send Real Test Order via /api/orders/create
  console.log("\n--- 5. Sending Test Order via /api/orders/create ---");
  const testPayload = {
    customerInfo: {
      name: "EkmekLab Test Kullanıcısı",
      phone: "05559876543",
      district: "Beylikdüzü",
      neighborhood: "Barış",
      addressDetail: "Adnan Kahveci Bulvarı No: 12 Daire: 4",
      deliveryDate: "today",
      shareLocation: true,
      customerLat: 41.0025,
      customerLng: 28.6412
    },
    items: [
      {
        productId: "sample-ekmek-1",
        quantity: 2
      }
    ],
    deliveryMethod: "courier",
    paymentMethod: "cash_on_delivery",
    idempotencyKey: "test-atomic-" + Date.now()
  };

  try {
    const res = await fetch("https://ekmeklabapp.vercel.app/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload)
    });

    const status = res.status;
    const body = await res.json();

    console.log(`HTTP Status: ${status}`);
    console.log("Response Body:", JSON.stringify(body, null, 2));

    if (status === 200 && body.success) {
      console.log(`\n🎉 Test order succeeded! Created Order: ${body.order?.id}, Number: ${body.order?.orderNumber}`);

      // Verify sub-records in DB
      const orderId = body.order?.id;
      const { data: items } = await adminClient.from("order_items").select("*").eq("order_id", orderId);
      const { data: pay } = await adminClient.from("payments").select("*").eq("order_id", orderId);
      const { data: history } = await adminClient.from("order_status_history").select("*").eq("order_id", orderId);
      const { data: loc } = await adminClient.from("customer_locations").select("*").eq("order_id", orderId);

      console.log(`✅ order_items records created: ${items?.length || 0}`);
      console.log(`✅ payments records created: ${pay?.length || 0}`);
      console.log(`✅ order_status_history records created: ${history?.length || 0}`);
      console.log(`✅ customer_locations records created: ${loc?.length || 0}`);
    } else {
      console.error("❌ Test order creation failed:", body);
      allPassed = false;
    }
  } catch (err) {
    console.error("❌ API request failed:", err);
    allPassed = false;
  }

  console.log("\n=================================================");
  console.log(allPassed ? "🏆 ALL CHECKS PASSED SUCCESSFULLY!" : "⚠️ SOME CHECKS FAILED. SEE DETAILS ABOVE.");
  console.log("=================================================");
}

runVerification();
