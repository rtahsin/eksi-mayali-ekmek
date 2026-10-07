// Test fixture: Bu dosya mimari kurallarını (R1, R2, R4) kasıtlı olarak ihlal eden örnekleri içerir.
// arch.test.ts bu dosyayı ayrıştırarak ihlalleri yakalayabildiğini test eder.

// İhlal 1 (R4): Firebase doğrudan içe aktarılamaz
// @ts-expect-error Kasıtlı test fixture importu
import { firebaseConfig } from "@/lib/firebase/config";

// İhlal 2 (R2): Eğitim modülünden ticaret modülüne doğrudan import yasaktır
import { getCatalog } from "@/lib/products/server";

// İhlal 3 (R1): Knowledge modülü ticaret modülünü import edemez
import { reservationKey } from "@/lib/ordering/availability";

export const dummy = {
  firebaseConfig,
  getCatalog,
  reservationKey,
};
