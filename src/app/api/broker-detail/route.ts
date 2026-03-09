import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const compare = searchParams.get("compare");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const supabase = getSupabase();

  const brokerCodes = [code];
  if (compare) brokerCodes.push(compare);

  const [{ data: topStocks }, { data: dailyFlow }, { data: brokerMeta }] = await Promise.all([
    supabase
      .from("idx_ba_daily_summary")
      .select("broker_code, symbol, net_value, b_val, s_val")
      .in("broker_code", brokerCodes)
      .eq("period", "1M")
      .eq("investor_type", "ALL")
      .eq("market_board", "REGULAR")
      .eq("date", (await supabase.from("idx_ba_daily_summary").select("date").eq("period", "1M").eq("investor_type", "ALL").order("date", { ascending: false }).limit(1).single()).data?.date || "")
      .order("net_value", { ascending: false })
      .limit(200),

    supabase
      .from("idx_ba_daily_summary")
      .select("broker_code, date, net_value")
      .in("broker_code", brokerCodes)
      .eq("period", "RANGE")
      .eq("investor_type", "ALL")
      .eq("market_board", "REGULAR")
      .order("date", { ascending: true })
      .limit(5000),

    supabase
      .from("idx_brokers")
      .select("code, name, is_foreign")
      .in("code", brokerCodes),
  ]);

  const metaMap: Record<string, { name: string; isForeign: boolean }> = {};
  if (brokerMeta) {
    for (const b of brokerMeta) {
      metaMap[b.code as string] = { name: b.name as string, isForeign: !!b.is_foreign };
    }
  }

  const stocksByBroker: Record<string, { symbol: string; netValue: number; buyVal: number; sellVal: number }[]> = {};
  if (topStocks) {
    for (const row of topStocks) {
      const bc = row.broker_code as string;
      if (!stocksByBroker[bc]) stocksByBroker[bc] = [];
      stocksByBroker[bc].push({
        symbol: row.symbol as string,
        netValue: parseFloat(row.net_value as string) || 0,
        buyVal: parseFloat(row.b_val as string) || 0,
        sellVal: parseFloat(row.s_val as string) || 0,
      });
    }
  }

  const flowByBroker: Record<string, { date: string; netValue: number }[]> = {};
  if (dailyFlow) {
    const dateAgg = new Map<string, Map<string, number>>();
    for (const row of dailyFlow) {
      const bc = row.broker_code as string;
      const dt = row.date as string;
      const nv = parseFloat(row.net_value as string) || 0;
      if (!dateAgg.has(bc)) dateAgg.set(bc, new Map());
      const m = dateAgg.get(bc)!;
      m.set(dt, (m.get(dt) || 0) + nv);
    }
    for (const [bc, dateMap] of dateAgg) {
      flowByBroker[bc] = [...dateMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, netValue]) => ({ date, netValue }));
    }
  }

  let pairComparison: { symbol: string; a: number; b: number }[] | null = null;
  if (compare && stocksByBroker[code] && stocksByBroker[compare]) {
    const aMap = new Map<string, number>();
    for (const s of stocksByBroker[code]) aMap.set(s.symbol, s.netValue);
    const bMap = new Map<string, number>();
    for (const s of stocksByBroker[compare]) bMap.set(s.symbol, s.netValue);

    const allSymbols = new Set([...aMap.keys(), ...bMap.keys()]);
    pairComparison = [...allSymbols]
      .map((sym) => ({ symbol: sym, a: aMap.get(sym) || 0, b: bMap.get(sym) || 0 }))
      .filter((p) => p.a !== 0 || p.b !== 0)
      .sort((x, y) => Math.abs(y.a) + Math.abs(y.b) - (Math.abs(x.a) + Math.abs(x.b)))
      .slice(0, 15);
  }

  return NextResponse.json({
    meta: metaMap,
    stocks: stocksByBroker,
    flow: flowByBroker,
    pairComparison,
  });
}
