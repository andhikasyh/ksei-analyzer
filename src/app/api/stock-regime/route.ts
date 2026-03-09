import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("mv_stock_regime")
    .select("symbol, regime, confidence_score, log_return, volume_ratio, volatility, foreign_flow_dir, accum_ratio")
    .order("confidence_score", { ascending: false })
    .limit(1000);

  return NextResponse.json({ regimes: data || [] });
}
