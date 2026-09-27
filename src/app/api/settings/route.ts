import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrderCutoffTime, isPastCutoff, DEFAULT_CUTOFF_TIME } from "@/lib/settings/cutoff";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({
        cutoffTime: DEFAULT_CUTOFF_TIME,
        isCutoffPassed: isPastCutoff(DEFAULT_CUTOFF_TIME),
      });
    }

    const cutoffTime = await getOrderCutoffTime(supabase);
    const cutoffPassed = isPastCutoff(cutoffTime);

    return NextResponse.json({
      cutoffTime,
      isCutoffPassed: cutoffPassed,
    });
  } catch (err: unknown) {
    console.error("Public settings GET error:", err);
    return NextResponse.json({
      cutoffTime: DEFAULT_CUTOFF_TIME,
      isCutoffPassed: isPastCutoff(DEFAULT_CUTOFF_TIME),
    });
  }
}
