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

  const [{ data: clusters }, { data: correlations }, { data: brokerMeta }] =
    await Promise.all([
      supabase
        .from("mv_broker_clusters")
        .select("cluster_id, cluster_label, broker_code, cluster_size, avg_internal_correlation")
        .order("cluster_id")
        .order("broker_code"),
      supabase
        .from("mv_broker_correlation")
        .select("broker_a, broker_b, shared_symbols, correlation")
        .gte("correlation", 0.3)
        .order("correlation", { ascending: false })
        .limit(500),
      supabase
        .from("idx_brokers")
        .select("code, name, is_foreign")
        .limit(500),
    ]);

  const brokerNames: Record<string, { name: string; isForeign: boolean }> = {};
  if (brokerMeta) {
    for (const b of brokerMeta) {
      brokerNames[b.code] = { name: b.name, isForeign: !!b.is_foreign };
    }
  }

  return NextResponse.json({
    clusters: clusters || [],
    correlations: correlations || [],
    brokerNames,
  });
}
