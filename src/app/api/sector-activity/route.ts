import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const SECTOR_MAP: Record<string, string> = {
  "Barang Baku": "IDXBASIC",
  "Barang Konsumen Non-Primer": "IDXCYCLIC",
  "Barang Konsumen Primer": "IDXNONCYC",
  "Energi": "IDXENERGY",
  "Infrastruktur": "IDXINFRA",
  "Kesehatan": "IDXHEALTH",
  "Keuangan": "IDXFINANCE",
  "Perindustrian": "IDXINDUST",
  "Properti & Real Estat": "IDXPROPERT",
  "Teknologi": "IDXTECHNO",
  "Transportasi & Logistik": "IDXTRANS",
};

const SECTOR_CODES = Object.values(SECTOR_MAP);

export const maxDuration = 30;

export async function GET() {
  const supabase = getSupabase();

  const [{ data: companies }, { data: summaries }] = await Promise.all([
    supabase.from("idx_companies").select("kode_emiten, sektor"),
    supabase
      .from("idx_stock_summary")
      .select("stock_code, date, value")
      .gt("value", 0)
      .order("date", { ascending: true })
      .limit(250000),
  ]);

  if (!companies?.length || !summaries?.length) {
    return NextResponse.json({ dates: [], series: [] });
  }

  const stockSector = new Map<string, string>();
  for (const c of companies) {
    const idx = SECTOR_MAP[c.sektor as string];
    if (idx) stockSector.set(c.kode_emiten as string, idx);
  }

  const dateOrder: string[] = [];
  const dateSet = new Set<string>();
  const dateMap = new Map<string, Map<string, number>>();
  const dateTotals = new Map<string, number>();

  for (const row of summaries) {
    const dt = row.date as string;
    const code = row.stock_code as string;
    const val = parseFloat(row.value as string) || 0;

    if (!dateSet.has(dt)) {
      dateSet.add(dt);
      dateOrder.push(dt);
    }

    dateTotals.set(dt, (dateTotals.get(dt) || 0) + val);

    const sec = stockSector.get(code);
    if (!sec) continue;

    if (!dateMap.has(dt)) dateMap.set(dt, new Map());
    const sMap = dateMap.get(dt)!;
    sMap.set(sec, (sMap.get(sec) || 0) + val);
  }

  const series: Record<string, { code: string; data: number[] }> = {};
  for (const sc of SECTOR_CODES) {
    series[sc] = { code: sc, data: [] };
  }

  for (const dt of dateOrder) {
    const total = dateTotals.get(dt) || 1;
    const sVals = dateMap.get(dt);
    for (const sc of SECTOR_CODES) {
      const val = sVals?.get(sc) || 0;
      series[sc].data.push(Math.round((val / total) * 10000) / 10000);
    }
  }

  return NextResponse.json({
    dates: dateOrder,
    series: Object.values(series),
    lastDate: dateOrder[dateOrder.length - 1] || "",
  });
}
