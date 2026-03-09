import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const SECTOR_TO_INDEX: Record<string, string> = {
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

const SECTOR_INDEX_CODES = [
  "COMPOSITE", "IDXBASIC", "IDXCYCLIC", "IDXNONCYC", "IDXENERGY",
  "IDXINFRA", "IDXHEALTH", "IDXFINANCE", "IDXINDUST", "IDXPROPERT",
  "IDXTECHNO", "IDXTRANS",
];

function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  if (data.length === 0) return result;
  const k = 2 / (period + 1);
  result.push(data[0]);
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

interface TrailPoint {
  date: string;
  rs: number;
  mom: number;
}

interface RRGEntry {
  code: string;
  trail: TrailPoint[];
}

function computeRRG(
  entityDates: string[],
  entityClose: number[],
  benchDates: string[],
  benchClose: number[],
  trailLength: number,
): TrailPoint[] | null {
  const RS_PERIOD = 10;
  const SMOOTH = 5;
  const minNeeded = RS_PERIOD + SMOOTH + trailLength + 2;

  const benchMap = new Map<string, number>();
  benchDates.forEach((d, i) => benchMap.set(d, i));

  const alignedRaw: number[] = [];
  const alignedDates: string[] = [];

  for (let i = 0; i < entityDates.length; i++) {
    const bi = benchMap.get(entityDates[i]);
    if (bi === undefined || benchClose[bi] <= 0 || entityClose[i] <= 0) continue;
    alignedRaw.push(entityClose[i] / benchClose[bi]);
    alignedDates.push(entityDates[i]);
  }

  if (alignedRaw.length < minNeeded) return null;

  const rsRatio: number[] = [];
  for (let i = RS_PERIOD - 1; i < alignedRaw.length; i++) {
    const start = alignedRaw[i - RS_PERIOD + 1];
    if (start <= 0) { rsRatio.push(100); continue; }
    rsRatio.push((alignedRaw[i] / start) * 100);
  }

  const smoothedRS = ema(rsRatio, SMOOTH);

  const rsMom: number[] = [];
  for (let i = 1; i < smoothedRS.length; i++) {
    if (smoothedRS[i - 1] <= 0) { rsMom.push(100); continue; }
    rsMom.push((smoothedRS[i] / smoothedRS[i - 1]) * 100);
  }

  const smoothedMom = ema(rsMom, SMOOTH);

  const trail: TrailPoint[] = [];
  const startIdx = Math.max(0, smoothedMom.length - trailLength);

  for (let i = startIdx; i < smoothedMom.length; i++) {
    const rsI = i + 1;
    const dateI = rsI + RS_PERIOD - 1;
    if (rsI >= smoothedRS.length || dateI >= alignedDates.length) break;
    trail.push({
      date: alignedDates[dateI],
      rs: Math.round(smoothedRS[rsI] * 100) / 100,
      mom: Math.round(smoothedMom[i] * 100) / 100,
    });
  }

  return trail.length >= 2 ? trail : null;
}

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const indexCode = searchParams.get("index") || "COMPOSITE";
  const trailLength = Math.min(parseInt(searchParams.get("trail") || "8") || 8, 20);

  const supabase = getSupabase();

  const isComposite = indexCode === "COMPOSITE";

  if (isComposite) {
    const { data: indexRows } = await supabase
      .from("idx_index_summary")
      .select("index_code, date, close")
      .in("index_code", SECTOR_INDEX_CODES)
      .order("date", { ascending: true });

    if (!indexRows?.length) {
      return NextResponse.json({ stocks: [], benchmark: "COMPOSITE", indexCode, lastDate: "" });
    }

    const byCode = new Map<string, { dates: string[]; closes: number[] }>();
    for (const row of indexRows) {
      const code = row.index_code as string;
      if (!byCode.has(code)) byCode.set(code, { dates: [], closes: [] });
      const entry = byCode.get(code)!;
      entry.dates.push(row.date as string);
      entry.closes.push(parseFloat(row.close as string) || 0);
    }

    const bench = byCode.get("COMPOSITE");
    if (!bench) {
      return NextResponse.json({ stocks: [], benchmark: "COMPOSITE", indexCode, lastDate: "" });
    }

    const lastDate = bench.dates[bench.dates.length - 1] || "";

    const results: RRGEntry[] = [];
    for (const [code, data] of byCode) {
      if (code === "COMPOSITE") continue;
      const trail = computeRRG(data.dates, data.closes, bench.dates, bench.closes, trailLength);
      if (trail) results.push({ code, trail });
    }

    return NextResponse.json({ stocks: results, benchmark: "COMPOSITE", indexCode, lastDate });
  }

  const { data: latestDateRow } = await supabase
    .from("idx_stock_summary")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .single();
  const latestDate = (latestDateRow?.date as string) || "";

  let stockCodes: string[] = [];

  const sectorName = Object.entries(SECTOR_TO_INDEX).find(([, v]) => v === indexCode)?.[0];
  if (sectorName) {
    const { data: companies } = await supabase
      .from("idx_companies")
      .select("kode_emiten")
      .eq("sektor", sectorName);
    stockCodes = (companies || []).map((c) => c.kode_emiten as string);
  } else {
    const { data: topStocks } = await supabase
      .from("idx_stock_summary")
      .select("stock_code, value")
      .eq("date", latestDate)
      .order("value", { ascending: false })
      .limit(100);
    stockCodes = (topStocks || []).map((s) => s.stock_code as string);
  }

  if (!stockCodes.length) {
    return NextResponse.json({ stocks: [], benchmark: "COMPOSITE", indexCode, lastDate: latestDate });
  }

  const { data: benchmarkData } = await supabase
    .from("idx_index_summary")
    .select("date, close")
    .eq("index_code", "COMPOSITE")
    .order("date", { ascending: true })
    .limit(120);

  if (!benchmarkData?.length) {
    return NextResponse.json({ stocks: [], benchmark: "COMPOSITE", indexCode, lastDate: latestDate });
  }

  const benchDates = benchmarkData.map((r) => r.date as string);
  const benchClose = benchmarkData.map((r) => parseFloat(r.close as string) || 0);

  const batchSize = 50;
  const allStockData: Record<string, { dates: string[]; closes: number[] }> = {};

  for (let i = 0; i < stockCodes.length; i += batchSize) {
    const batch = stockCodes.slice(i, i + batchSize);
    const { data: priceData } = await supabase
      .from("idx_stock_summary")
      .select("stock_code, date, close")
      .in("stock_code", batch)
      .in("date", benchDates)
      .order("date", { ascending: true });

    if (priceData) {
      for (const row of priceData) {
        const code = row.stock_code as string;
        if (!allStockData[code]) allStockData[code] = { dates: [], closes: [] };
        allStockData[code].dates.push(row.date as string);
        allStockData[code].closes.push(parseFloat(row.close as string) || 0);
      }
    }
  }

  const results: RRGEntry[] = [];

  for (const [code, data] of Object.entries(allStockData)) {
    const trail = computeRRG(data.dates, data.closes, benchDates, benchClose, trailLength);
    if (trail) results.push({ code, trail });
  }

  return NextResponse.json({
    stocks: results,
    benchmark: "COMPOSITE",
    indexCode,
    lastDate: latestDate,
  });
}
