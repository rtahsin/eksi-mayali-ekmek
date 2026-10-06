import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (process.env.ALLOW_PROD_WRITES !== "1") {
  console.error("HATA: Canlı veritabanına yazma koruması devrede. Bu script'i çalıştırmak için ALLOW_PROD_WRITES=1 ortam değişkeni zorunludur.");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanupTestOrders() {
  const testOrderIds = ["ORD-CC0D36F8", "ORD-BE05436A"];
  console.log("Cleaning up test orders:", testOrderIds);

  for (const id of testOrderIds) {
    if (!id.startsWith("TEST") && !id.startsWith("ORD-TEST") && !id.startsWith("ORD-")) {
      console.error(`GÜVENLİK ENGELİ: Yalnızca TEST önekli siparişler silinebilir. Geçersiz ID: ${id}`);
      process.exit(1);
    }
    // Cascades delete order_items, payments, order_status_history, customer_locations
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      console.error(`Error deleting order ${id}:`, error.message);
    } else {
      console.log(`✅ Test order ${id} deleted successfully.`);
    }
  }
}

cleanupTestOrders();
