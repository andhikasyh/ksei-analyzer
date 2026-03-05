import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface NewsHeadline {
  title: string;
  source: string;
  url: string;
  date: string;
}

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseRssItems(xml: string, maxItems: number): NewsHeadline[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const results: NewsHeadline[] = [];
  for (const item of items.slice(0, maxItems)) {
    const rawTitle = item.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const title = decodeEntities(rawTitle);
    const source = decodeEntities(
      item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || ""
    );
    const link = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || "";
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    const dateStr = pubDate
      ? new Date(pubDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";
    if (title) results.push({ title, source, url: link, date: dateStr });
  }
  return results;
}

async function fetchRssFeed(query: string, maxItems: number): Promise<NewsHeadline[]> {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`;
    const res = await fetch(rssUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml, maxItems);
  } catch {
    return [];
  }
}

function deduplicateHeadlines(all: NewsHeadline[], limit: number): NewsHeadline[] {
  const seen = new Set<string>();
  return all.filter((h) => {
    if (seen.has(h.title)) return false;
    seen.add(h.title);
    return true;
  }).slice(0, limit);
}

async function fetchMarketNews(): Promise<NewsHeadline[]> {
  const queries = [
    "IHSG saham hari ini",
    "IDX market bursa efek Indonesia",
    "saham Indonesia terbaru",
    "ekonomi Indonesia pasar modal",
  ];
  const results = await Promise.all(queries.map((q) => fetchRssFeed(q, 8)));
  return deduplicateHeadlines(results.flat(), 25);
}

async function fetchCommodityNews(): Promise<NewsHeadline[]> {
  const queries = [
    "harga minyak crude oil hari ini",
    "harga emas gold hari ini",
    "harga batubara coal Indonesia",
    "harga CPO kelapa sawit",
    "harga nikel nickel Indonesia",
    "harga timah tin Indonesia",
  ];
  const results = await Promise.all(queries.map((q) => fetchRssFeed(q, 4)));
  return deduplicateHeadlines(results.flat(), 15);
}

async function fetchCorporateNews(): Promise<NewsHeadline[]> {
  const queries = [
    "akuisisi perusahaan Indonesia IDX",
    "merger saham Indonesia",
    "kerjasama bisnis emiten IDX",
    "IPO saham baru Indonesia",
    "rumor akuisisi saham Indonesia",
  ];
  const results = await Promise.all(queries.map((q) => fetchRssFeed(q, 4)));
  return deduplicateHeadlines(results.flat(), 10);
}

interface BrokerRankingRow {
  code: string;
  brokerCode: string;
  brokerName: string;
  netValue: number;
  bVal: number;
  sVal: number;
  netVolume: number;
  bLot: number;
  sLot: number;
  valueShare: number;
  rank: number;
}

interface BandarmologySignal {
  code: string;
  name: string;
  phase: "accumulation" | "distribution" | "markup" | "markdown" | "neutral";
  topBuyerConcentration: number;
  topSellerConcentration: number;
  topBuyers: { broker: string; name: string; netValue: number; isForeign: boolean }[];
  topSellers: { broker: string; name: string; netValue: number; isForeign: boolean }[];
  buyerCount: number;
  sellerCount: number;
  rationale: string;
}

async function fetchBandarmologyData(
  supabase: ReturnType<typeof getSupabase>,
  topCodes: string[]
): Promise<BandarmologySignal[]> {
  if (topCodes.length === 0) return [];

  const [{ data: brokerList }, { data: stockNames }, { data: rankings }] = await Promise.all([
    supabase
      .from("idx_brokers")
      .select("code, name, is_foreign")
      .limit(500),
    supabase
      .from("idx_stock_summary")
      .select("stock_code, stock_name")
      .in("stock_code", topCodes)
      .order("date", { ascending: false })
      .limit(topCodes.length),
    supabase
      .from("idx_ba_stock_ranking")
      .select("symbol, date, broker_code, net_value, b_val, s_val, net_volume, b_lot, s_lot, value_share, rank")
      .in("symbol", topCodes)
      .eq("period", "1M")
      .eq("investor_type", "ALL")
      .order("date", { ascending: false })
      .order("rank")
      .limit(topCodes.length * 50),
  ]);

  const brokerMeta = new Map<string, { name: string; isForeign: boolean }>();
  if (brokerList) {
    for (const b of brokerList) {
      brokerMeta.set(b.code, { name: b.name, isForeign: !!b.is_foreign });
    }
  }

  const nameMap = new Map<string, string>();
  if (stockNames) {
    for (const s of stockNames) {
      if (!nameMap.has(s.stock_code)) nameMap.set(s.stock_code, s.stock_name);
    }
  }

  if (!rankings || rankings.length === 0) return [];

  const byStock = new Map<string, typeof rankings>();
  for (const r of rankings) {
    const sym = r.symbol as string;
    if (!byStock.has(sym)) byStock.set(sym, []);
    byStock.get(sym)!.push(r);
  }

  const signals: BandarmologySignal[] = [];

  for (const [sym, rows] of byStock.entries()) {
    const latestDate = (rows[0] as Record<string, string>).date;
    const latest = rows.filter((r: Record<string, string>) => r.date === latestDate);

    const buyers: BrokerRankingRow[] = [];
    const sellers: BrokerRankingRow[] = [];
    let totalAbsValue = 0;

    for (const r of latest) {
      const netVal = parseFloat(r.net_value as string) || 0;
      const bVal = parseFloat(r.b_val as string) || 0;
      const sVal = parseFloat(r.s_val as string) || 0;
      totalAbsValue += Math.abs(netVal);

      const entry: BrokerRankingRow = {
        code: sym,
        brokerCode: r.broker_code as string,
        brokerName: brokerMeta.get(r.broker_code as string)?.name || r.broker_code as string,
        netValue: netVal,
        bVal,
        sVal,
        netVolume: parseFloat(r.net_volume as string) || 0,
        bLot: parseFloat(r.b_lot as string) || 0,
        sLot: parseFloat(r.s_lot as string) || 0,
        valueShare: parseFloat(r.value_share as string) || 0,
        rank: r.rank as number,
      };

      if (netVal > 0) buyers.push(entry);
      else if (netVal < 0) sellers.push(entry);
    }

    buyers.sort((a, b) => b.netValue - a.netValue);
    sellers.sort((a, b) => a.netValue - b.netValue);

    const top3BuyVal = buyers.slice(0, 3).reduce((s, b) => s + b.netValue, 0);
    const top3SellVal = Math.abs(sellers.slice(0, 3).reduce((s, b) => s + b.netValue, 0));
    const buyConcentration = totalAbsValue > 0 ? (top3BuyVal / totalAbsValue) * 100 : 0;
    const sellConcentration = totalAbsValue > 0 ? (top3SellVal / totalAbsValue) * 100 : 0;

    let phase: BandarmologySignal["phase"] = "neutral";
    let rationale = "";

    if (buyConcentration > 40 && buyers.length <= sellers.length * 0.5) {
      phase = "accumulation";
      rationale = `Top 3 buyers hold ${buyConcentration.toFixed(1)}% of value with only ${buyers.length} buyers vs ${sellers.length} fragmented sellers -- classic stealth accumulation pattern.`;
    } else if (sellConcentration > 40 && sellers.length <= buyers.length * 0.5) {
      phase = "distribution";
      rationale = `Top 3 sellers hold ${sellConcentration.toFixed(1)}% of value with only ${sellers.length} sellers vs ${buyers.length} fragmented buyers -- institutional distribution detected.`;
    } else if (buyConcentration > 30 && top3BuyVal > top3SellVal * 1.5) {
      phase = "markup";
      rationale = `Strong concentrated buying (${buyConcentration.toFixed(1)}%) with buy-side dominance suggests markup phase.`;
    } else if (sellConcentration > 30 && top3SellVal > top3BuyVal * 1.5) {
      phase = "markdown";
      rationale = `Strong concentrated selling (${sellConcentration.toFixed(1)}%) with sell-side dominance suggests markdown phase.`;
    } else {
      rationale = `No clear concentration bias detected. Buy concentration: ${buyConcentration.toFixed(1)}%, Sell concentration: ${sellConcentration.toFixed(1)}%.`;
    }

    signals.push({
      code: sym,
      name: nameMap.get(sym) || sym,
      phase,
      topBuyerConcentration: buyConcentration,
      topSellerConcentration: sellConcentration,
      topBuyers: buyers.slice(0, 5).map((b) => ({
        broker: b.brokerCode,
        name: b.brokerName,
        netValue: b.netValue,
        isForeign: brokerMeta.get(b.brokerCode)?.isForeign || false,
      })),
      topSellers: sellers.slice(0, 5).map((b) => ({
        broker: b.brokerCode,
        name: b.brokerName,
        netValue: Math.abs(b.netValue),
        isForeign: brokerMeta.get(b.brokerCode)?.isForeign || false,
      })),
      buyerCount: buyers.length,
      sellerCount: sellers.length,
      rationale,
    });
  }

  signals.sort((a, b) => {
    const phaseOrder = { accumulation: 0, distribution: 1, markup: 2, markdown: 3, neutral: 4 };
    return phaseOrder[a.phase] - phaseOrder[b.phase];
  });

  return signals;
}

interface PriceHistoryRow {
  code: string;
  name: string;
  date: string;
  close: number;
  volume: number;
  foreignBuy: number;
  foreignSell: number;
}

async function fetchMultiDayHistory(
  supabase: ReturnType<typeof getSupabase>,
  topCodes: string[]
): Promise<Map<string, PriceHistoryRow[]>> {
  const result = new Map<string, PriceHistoryRow[]>();
  if (topCodes.length === 0) return result;

  const cutoffDate = new Date(Date.now() - 45 * 86400000).toISOString().split("T")[0];

  const { data } = await supabase
    .from("idx_stock_summary")
    .select("stock_code, stock_name, date, close, volume, foreign_buy, foreign_sell")
    .in("stock_code", topCodes)
    .gte("date", cutoffDate)
    .order("date", { ascending: true })
    .limit(topCodes.length * 25);

  if (!data) return result;

  for (const r of data) {
    const code = r.stock_code as string;
    if (!result.has(code)) result.set(code, []);
    result.get(code)!.push({
      code,
      name: r.stock_name as string,
      date: r.date as string,
      close: parseFloat(r.close as string) || 0,
      volume: parseFloat(r.volume as string) || 0,
      foreignBuy: parseFloat(r.foreign_buy as string) || 0,
      foreignSell: parseFloat(r.foreign_sell as string) || 0,
    });
  }

  return result;
}

interface StockRow {
  code: string;
  name: string;
  close: number;
  change: number;
  changePct: number;
  volume: number;
  value: number;
  foreignBuy: number;
  foreignSell: number;
  sector?: string;
}

interface FundamentalRatio {
  code: string;
  stockName: string;
  sector: string;
  subSector: string;
  per: number;
  pbv: number;
  roe: number;
  roa: number;
  npm: number;
  deRatio: number;
  eps: number;
  bookValue: number;
  assets: number;
  liabilities: number;
  equity: number;
  sales: number;
  fsDate: string;
}

interface AggregatedMarketData {
  tradingDate: string;
  totalStocks: number;
  totalVolume: number;
  totalValue: number;
  advancingCount: number;
  decliningCount: number;
  unchangedCount: number;
  gainers: StockRow[];
  losers: StockRow[];
  mostActive: StockRow[];
  sectorBreakdown: Record<
    string,
    { stocks: number; totalChange: number; topStock: string; topChange: number }
  >;
  foreignFlow: {
    totalBuy: number;
    totalSell: number;
    net: number;
    topBought: { code: string; name: string; netBuy: number }[];
    topSold: { code: string; name: string; netSell: number }[];
  };
  priceHistory: Map<string, PriceHistoryRow[]>;
  recentCorporateActions: { code: string; issuerName: string; type: string; detail: string; startDate: string }[];
  bandarmologySignals: BandarmologySignal[];
  fundamentals: Map<string, FundamentalRatio>;
  discoveryData: {
    volumeAnomalies: { code: string; name: string; close: number; changePct: number; volume: number; avgVolume: number; volumeRatio: number; foreignNet: number; sector?: string }[];
    foreignFlowOutliers: { code: string; name: string; close: number; changePct: number; value: number; foreignNet: number; foreignIntensity: number; sector?: string }[];
    undervaluedFundamentals: FundamentalRatio[];
    stealthAccumulation: BandarmologySignal[];
  };
}

async function aggregateMarketData(
  supabase: ReturnType<typeof getSupabase>
): Promise<AggregatedMarketData | null> {
  const { data: latestDateRow } = await supabase
    .from("idx_stock_summary")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  if (!latestDateRow?.length) return null;

  const latestDate = latestDateRow[0].date;

  const [{ data: summaryData }, { data: financialData }] = await Promise.all([
    supabase
      .from("idx_stock_summary")
      .select("stock_code, stock_name, date, close, previous, change, volume, value, foreign_buy, foreign_sell")
      .eq("date", latestDate)
      .limit(1500),
    supabase
      .from("idx_financial_ratios")
      .select("code, sector")
      .order("fs_date", { ascending: false })
      .limit(2000),
  ]);

  if (!summaryData?.length) return null;

  const todayStocks = summaryData;

  const sectorMap = new Map<string, string>();
  if (financialData) {
    for (const f of financialData) {
      if (!sectorMap.has(f.code)) {
        sectorMap.set(f.code, f.sector || "Unknown");
      }
    }
  }

  let totalVolume = 0;
  let totalValue = 0;
  let advancingCount = 0;
  let decliningCount = 0;
  let unchangedCount = 0;

  const stocks: StockRow[] = todayStocks.map(
    (r: Record<string, string | number>) => {
      const close = parseFloat(r.close as string) || 0;
      const prev = parseFloat(r.previous as string) || 0;
      const change = parseFloat(r.change as string) || 0;
      const volume = parseFloat(r.volume as string) || 0;
      const value = parseFloat(r.value as string) || 0;
      const foreignBuy = parseFloat(r.foreign_buy as string) || 0;
      const foreignSell = parseFloat(r.foreign_sell as string) || 0;
      const changePct = prev > 0 ? (change / prev) * 100 : 0;

      totalVolume += volume;
      totalValue += value;
      if (change > 0) advancingCount++;
      else if (change < 0) decliningCount++;
      else unchangedCount++;

      return {
        code: r.stock_code as string,
        name: r.stock_name as string,
        close,
        change,
        changePct,
        volume,
        value,
        foreignBuy,
        foreignSell,
        sector: sectorMap.get(r.stock_code as string),
      };
    }
  );

  const sectorBreakdown: AggregatedMarketData["sectorBreakdown"] = {};
  for (const s of stocks) {
    const sector = s.sector || "Unknown";
    if (!sectorBreakdown[sector]) {
      sectorBreakdown[sector] = {
        stocks: 0,
        totalChange: 0,
        topStock: s.code,
        topChange: s.changePct,
      };
    }
    sectorBreakdown[sector].stocks++;
    sectorBreakdown[sector].totalChange += s.changePct;
    if (s.changePct > sectorBreakdown[sector].topChange) {
      sectorBreakdown[sector].topStock = s.code;
      sectorBreakdown[sector].topChange = s.changePct;
    }
  }

  let totalForeignBuy = 0;
  let totalForeignSell = 0;
  const foreignNetMap: { code: string; name: string; net: number }[] = [];

  for (const s of stocks) {
    totalForeignBuy += s.foreignBuy;
    totalForeignSell += s.foreignSell;
    foreignNetMap.push({
      code: s.code,
      name: s.name,
      net: s.foreignBuy - s.foreignSell,
    });
  }

  foreignNetMap.sort((a, b) => b.net - a.net);

  const topCodes = [...stocks]
    .sort((a, b) => b.value - a.value)
    .slice(0, 12)
    .map((s) => s.code);

  const topCodesSet = new Set(topCodes);
  const MIN_DISCOVERY_VALUE = 500_000_000;

  const discoveryPool = stocks
    .filter(s => !topCodesSet.has(s.code) && s.value >= MIN_DISCOVERY_VALUE && s.close > 0)
    .map(s => {
      const foreignNet = s.foreignBuy - s.foreignSell;
      const foreignIntensity = s.value > 0 ? Math.abs(foreignNet) / s.value : 0;
      return { ...s, foreignNet, foreignIntensity };
    })
    .sort((a, b) => {
      const aScore = a.foreignIntensity * 40 + Math.abs(a.changePct) * 30 + Math.log10(Math.max(a.value, 1)) * 3;
      const bScore = b.foreignIntensity * 40 + Math.abs(b.changePct) * 30 + Math.log10(Math.max(b.value, 1)) * 3;
      return bScore - aScore;
    });

  const discoveryCodes = discoveryPool.slice(0, 20).map(s => s.code);
  const volumeCheckCodes = discoveryPool.slice(0, 50).map(s => s.code);

  const allHistoryCodes = [...new Set([...topCodes, ...discoveryCodes.slice(0, 8)])];
  const bandarmologyCodes = [...new Set([
    ...[...stocks].sort((a, b) => b.value - a.value).slice(0, 20).map(s => s.code),
    ...discoveryCodes.slice(0, 10),
  ])];
  const fundamentalCodes = [...new Set([
    ...topCodes,
    ...bandarmologyCodes.slice(0, 15),
    ...discoveryCodes,
  ])];

  const volumeCutoff = new Date(Date.now() - 15 * 86400000).toISOString().split("T")[0];

  const [priceHistory, corpActionsRes, bandarmologySignals, { data: fundamentalRows }, { data: volumeHistoryData }] = await Promise.all([
    fetchMultiDayHistory(supabase, allHistoryCodes),
    supabase
      .from("idx_corporate_actions")
      .select("code, issuer_name, action_type, action_type_raw, start_date")
      .gte("start_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
      .order("start_date", { ascending: false })
      .limit(20),
    fetchBandarmologyData(supabase, bandarmologyCodes),
    supabase
      .from("idx_financial_ratios")
      .select("code, stock_name, sector, sub_sector, per, price_bv, roe, roa, npm, de_ratio, eps, book_value, assets, liabilities, equity, sales, fs_date")
      .in("code", fundamentalCodes)
      .order("fs_date", { ascending: false })
      .limit(fundamentalCodes.length * 2),
    supabase
      .from("idx_stock_summary")
      .select("stock_code, date, volume")
      .in("stock_code", volumeCheckCodes)
      .gte("date", volumeCutoff)
      .lt("date", latestDate)
      .order("date", { ascending: false })
      .limit(volumeCheckCodes.length * 10),
  ]);

  const fundamentals = new Map<string, FundamentalRatio>();
  if (fundamentalRows) {
    for (const f of fundamentalRows) {
      if (!fundamentals.has(f.code as string)) {
        fundamentals.set(f.code as string, {
          code: f.code as string,
          stockName: f.stock_name as string,
          sector: f.sector as string,
          subSector: f.sub_sector as string,
          per: parseFloat(f.per as string) || 0,
          pbv: parseFloat(f.price_bv as string) || 0,
          roe: parseFloat(f.roe as string) || 0,
          roa: parseFloat(f.roa as string) || 0,
          npm: parseFloat(f.npm as string) || 0,
          deRatio: parseFloat(f.de_ratio as string) || 0,
          eps: parseFloat(f.eps as string) || 0,
          bookValue: parseFloat(f.book_value as string) || 0,
          assets: parseFloat(f.assets as string) || 0,
          liabilities: parseFloat(f.liabilities as string) || 0,
          equity: parseFloat(f.equity as string) || 0,
          sales: parseFloat(f.sales as string) || 0,
          fsDate: f.fs_date as string,
        });
      }
    }
  }

  const recentCorporateActions = (corpActionsRes.data || []).map(
    (ca: Record<string, string>) => ({
      code: ca.code,
      issuerName: ca.issuer_name,
      type: ca.action_type,
      detail: ca.action_type_raw,
      startDate: ca.start_date,
    })
  );

  const avgVolumeMap = new Map<string, number>();
  if (volumeHistoryData) {
    const volByStock = new Map<string, number[]>();
    for (const r of volumeHistoryData) {
      const code = r.stock_code as string;
      if (!volByStock.has(code)) volByStock.set(code, []);
      volByStock.get(code)!.push(parseFloat(r.volume as string) || 0);
    }
    for (const [code, vols] of volByStock) {
      if (vols.length >= 3) {
        avgVolumeMap.set(code, vols.reduce((a, b) => a + b, 0) / vols.length);
      }
    }
  }

  const volumeAnomalies = discoveryPool
    .filter(s => {
      const avg = avgVolumeMap.get(s.code);
      return avg && avg > 0 && s.volume / avg >= 2;
    })
    .map(s => ({
      code: s.code,
      name: s.name,
      close: s.close,
      changePct: s.changePct,
      volume: s.volume,
      avgVolume: avgVolumeMap.get(s.code)!,
      volumeRatio: s.volume / avgVolumeMap.get(s.code)!,
      foreignNet: s.foreignNet,
      sector: s.sector,
    }))
    .sort((a, b) => b.volumeRatio - a.volumeRatio)
    .slice(0, 8);

  const foreignFlowOutliers = discoveryPool
    .filter(s => s.foreignIntensity > 0.15 && Math.abs(s.foreignNet) > 1e9)
    .sort((a, b) => b.foreignIntensity - a.foreignIntensity)
    .slice(0, 8)
    .map(s => ({
      code: s.code,
      name: s.name,
      close: s.close,
      changePct: s.changePct,
      value: s.value,
      foreignNet: s.foreignNet,
      foreignIntensity: s.foreignIntensity,
      sector: s.sector,
    }));

  const undervaluedFundamentals: FundamentalRatio[] = [];
  for (const code of discoveryCodes) {
    const f = fundamentals.get(code);
    if (f && f.per > 0 && f.per < 15 && f.roe > 10 && f.deRatio < 1.5) {
      undervaluedFundamentals.push(f);
    }
  }
  undervaluedFundamentals.sort((a, b) => b.roe - a.roe);

  const stealthAccumulation = bandarmologySignals
    .filter(s => !topCodesSet.has(s.code) && (s.phase === "accumulation" || s.phase === "markup"))
    .slice(0, 5);

  return {
    tradingDate: latestDate,
    totalStocks: stocks.length,
    totalVolume,
    totalValue,
    advancingCount,
    decliningCount,
    unchangedCount,
    gainers: [...stocks]
      .filter((s) => s.changePct > 0)
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 15),
    losers: [...stocks]
      .filter((s) => s.changePct < 0)
      .sort((a, b) => a.changePct - b.changePct)
      .slice(0, 15),
    mostActive: [...stocks].sort((a, b) => b.value - a.value).slice(0, 15),
    sectorBreakdown,
    foreignFlow: {
      totalBuy: totalForeignBuy,
      totalSell: totalForeignSell,
      net: totalForeignBuy - totalForeignSell,
      topBought: foreignNetMap
        .filter((f) => f.net > 0)
        .slice(0, 10)
        .map((f) => ({ code: f.code, name: f.name, netBuy: f.net })),
      topSold: foreignNetMap
        .filter((f) => f.net < 0)
        .slice(-10)
        .reverse()
        .map((f) => ({
          code: f.code,
          name: f.name,
          netSell: Math.abs(f.net),
        })),
    },
    priceHistory,
    recentCorporateActions,
    bandarmologySignals,
    fundamentals,
    discoveryData: {
      volumeAnomalies,
      foreignFlowOutliers,
      undervaluedFundamentals,
      stealthAccumulation,
    },
  };
}

function generateCoverImageUrl(date: string, sentiment: string): string {
  const hash = Array.from(date + sentiment).reduce((a, c) => a + c.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${date}-${hash}/1200/600`;
}

const REPORT_SCHEMA = `{
  "title": "A compelling article title summarizing the day (e.g. Markets Rally on Banking Sector Strength)",
  "marketOverview": {
    "tradingDate": "YYYY-MM-DD",
    "totalVolume": number,
    "totalValue": number,
    "advancingCount": number,
    "decliningCount": number,
    "unchangedCount": number,
    "summary": "2-3 sentence market summary"
  },
  "sectorPerformance": [
    {
      "sector": "sector name",
      "change": number (average % change),
      "topStock": "TICKER",
      "topStockChange": number,
      "sentiment": "bullish" | "bearish" | "neutral"
    }
  ],
  "topMovers": {
    "gainers": [{ "code": "TICKER", "name": "Company Name", "close": number, "change": number, "changePct": number, "volume": number,     "reason": "3-5 sentence in-depth analysis: explain the WHY behind this move by cross-referencing sector rotation, foreign flow direction, commodity prices, technical breakout/breakdown patterns, broker activity, recent news catalysts, and fundamental valuation. Connect the dots." }],
    "losers": [same shape],
    "mostActive": [same shape]
  },
  "foreignFlow": {
    "netFlow": number,
    "netFlowLabel": "human-readable net flow like Rp 1.2T",
    "sentiment": "inflow" | "outflow" | "neutral",
    "summary": "3-5 sentence analysis explaining foreign flow patterns, what sectors/stocks are being targeted, and what this flow direction signals about institutional sentiment",
    "topBought": [{ "code": "TICKER", "name": "Company Name", "netBuy": number }],
    "topSold": [{ "code": "TICKER", "name": "Company Name", "netSell": number }]
  },
  "technicalAnalysis": {
    "marketTrend": "uptrend" | "downtrend" | "sideways",
    "marketTrendNotes": "4-6 sentence deep analysis of overall market trend based on multi-day price action patterns, volume dynamics, market breadth (advance-decline), and inter-day momentum shifts",
    "keyLevels": [
      { "label": "level description (e.g. IHSG Support 1)", "value": "price level as string", "significance": "why this level matters" }
    ],
    "signals": [
      {
        "code": "TICKER",
        "name": "Company Name",
        "signal": "bullish" | "bearish" | "neutral",
        "pattern": "pattern name (e.g. Golden Cross, Breakout, Oversold Bounce)",
        "support": number (nearest support price),
        "resistance": number (nearest resistance price),
        "rsi": number (estimated RSI 0-100 based on recent price action),
        "notes": "3-5 sentence technical observation: describe the chart pattern setup, what price action tells us, volume confirmation, and actionable trade setup with entry/exit zones"
      }
    ],
    "volumeAnalysis": "3-4 sentence analysis of overall volume trends, unusual volume spikes, volume-price divergences, and what these indicate about conviction behind the current trend"
  },
  "commodityAnalysis": {
    "summary": "4-6 sentence overview analyzing how global commodity price movements are affecting IDX stocks, export-oriented sectors, and Indonesia's trade balance. Include macro context like USD/IDR, global demand outlook, and supply chain dynamics",
    "commodities": [
      {
        "commodity": "Crude Oil" | "Gold" | "Coal" | "Palm Oil (CPO)" | "Nickel" | "Tin" | "Copper" | "Natural Gas",
        "sentiment": "bullish" | "bearish" | "neutral",
        "priceDirection": "up" | "down" | "flat",
        "impact": "3-5 sentence explanation of how this commodity price movement impacts Indonesian producers, export revenues, government royalties, and which specific IDX stocks benefit or suffer. Include global supply-demand context.",
        "affectedStocks": [{ "code": "TICKER", "name": "Company Name", "correlation": "positive" | "negative" }]
      }
    ]
  },
  "corporateEvents": [
    {
      "type": "acquisition" | "cooperation" | "merger" | "divestment" | "rumor" | "ipo" | "restructuring" | "other",
      "headline": "brief headline",
      "companies": ["TICKER1", "TICKER2"],
      "impact": "1-2 sentence market impact",
      "sentiment": "bullish" | "bearish" | "neutral",
      "source": "source name if from news",
      "url": "URL if available"
    }
  ],
  "pricePredictions": [
    {
      "code": "TICKER",
      "name": "Company Name",
      "currentPrice": number,
      "targetShortTerm": number (1-2 week target),
      "targetMidTerm": number (1-3 month target),
      "stopLoss": number (recommended stop loss),
      "confidence": "high" | "medium" | "low",
      "timeframe": "e.g. 1-2 weeks",
      "rationale": "5-8 sentence deep rationale: combine technical setup (pattern, support/resistance, RSI), fundamental valuation (PER vs sector avg, PBV, ROE quality, earnings trajectory), foreign flow direction, bandarmology phase, and risk factors. Justify why this specific price target makes sense."
    }
  ],
  "chartData": {
    "sectorPerformanceChart": [{ "sector": "name", "change": number }],
    "foreignFlowChart": [{ "date": "YYYY-MM-DD", "value": number (net foreign flow) }],
    "priceHistoryCharts": [
      {
        "code": "TICKER",
        "name": "Company Name",
        "data": [{ "date": "YYYY-MM-DD", "value": number (close price) }]
      }
    ],
    "marketBreadthChart": [{ "date": "YYYY-MM-DD", "value": number (advance-decline ratio as percentage of advances) }]
  },
  "newsSentiment": [
    {
      "headline": "headline text",
      "source": "source name",
      "url": "article URL",
      "sentiment": "bullish" | "bearish" | "neutral",
      "impact": "brief impact description"
    }
  ],
  "stockPicks": [
    {
      "code": "TICKER",
      "name": "Company Name",
      "action": "BUY" | "HOLD" | "SELL" | "WATCH",
      "currentPrice": number,
      "rationale": "6-10 sentence comprehensive rationale: MUST cover (1) fundamental thesis -- valuation metrics vs sector/historical averages, earnings quality, balance sheet health, (2) technical setup -- chart pattern, trend, support/resistance, volume, (3) flow analysis -- foreign flow direction, bandarmology phase, broker concentration, (4) catalysts -- upcoming events, sector tailwinds, macro factors. This is an investment thesis, not a summary.",
      "targetPrice": number (optional),
      "fundamentals": {
        "per": number (Price-to-Earnings ratio),
        "pbv": number (Price-to-Book Value),
        "roe": number (Return on Equity %),
        "deRatio": number (Debt-to-Equity ratio),
        "eps": number (Earnings Per Share)
      },
      "technicalSetup": "2-3 sentence technical chart setup description",
      "riskAssessment": "2-3 sentence risk factors specific to this stock",
      "catalysts": ["catalyst1", "catalyst2", ...]
    }
  ],
  "bandarmology": {
    "summary": "4-6 sentence deep overview of smart money flow patterns across the market: identify whether institutions are in accumulation, distribution, or transitional mode. Analyze which brokers dominate the buy/sell side, whether foreign institutions are rotating, and what this means for the next 1-4 weeks.",
    "signals": [
      {
        "code": "TICKER",
        "name": "Company Name",
        "phase": "accumulation" | "distribution" | "markup" | "markdown" | "neutral",
        "confidence": "high" | "medium" | "low",
        "topBuyers": [{ "broker": "XX", "name": "Broker Name", "netValue": number, "isForeign": boolean }],
        "topSellers": [{ "broker": "XX", "name": "Broker Name", "netValue": number, "isForeign": boolean }],
        "buyerConcentration": number (% of total value held by top 3 buyers),
        "sellerConcentration": number (% of total value held by top 3 sellers),
        "buyerCount": number,
        "sellerCount": number,
        "interpretation": "4-6 sentence institutional-quality analysis: describe WHO is buying/selling (institutional vs retail, foreign vs domestic), WHY (cross-reference with price trend, volume pattern, news catalysts, fundamental value), and WHAT it means for the stock's near-term direction. Include specific broker behavior patterns."
      }
    ],
    "alertStocks": ["TICKER1", "TICKER2"] (stocks showing strongest accumulation/distribution signals -- top priority watchlist)
  },
  "aiDiscovery": {
    "summary": "3-4 sentence overview of the non-obvious patterns you identified across the broader market beyond headline stocks. What is the hidden narrative?",
    "hiddenGems": [
      {
        "code": "TICKER",
        "name": "Company Name",
        "discoveryType": "volume_anomaly" | "foreign_flow_outlier" | "undervalued_fundamental" | "stealth_accumulation" | "sector_rotation_early",
        "currentPrice": number,
        "thesis": "5-8 sentence deep thesis: WHY is this stock interesting? What non-obvious angle did you find? Connect the discovery signal to fundamental value, technical setup, or institutional behavior. This should read like a hedge fund note -- insight a reader cannot get elsewhere.",
        "signals": ["specific quantitative signal 1", "signal 2"],
        "riskLevel": "high" | "medium" | "low",
        "conviction": "high" | "medium" | "low",
        "targetPrice": number (optional, only if data supports it),
        "fundamentals": { "per": number, "pbv": number, "roe": number, "deRatio": number } (if available),
        "dataHighlight": "Single most compelling data point as a punchy one-liner (e.g. 'Volume 4.7x above 5-day average while price barely moved')"
      }
    ]
  },
  "marketOutlook": {
    "sentiment": "bullish" | "bearish" | "neutral" | "cautious",
    "summary": "4-6 sentence market outlook synthesizing all data dimensions into a cohesive thesis.",
    "keyRisks": ["risk description 1-2 sentences each", ...],
    "keyCatalysts": ["catalyst description 1-2 sentences each", ...],
    "shortTermForecast": "3-4 sentence actionable forecast: direction, key levels, sectors to overweight/underweight"
  }
}`;

export interface GenerateReportResult {
  report: Record<string, unknown>;
  reportDate: string;
  title: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export async function generateMarketIntelligenceReport(): Promise<GenerateReportResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const supabase = getSupabase();

  const [marketData, newsHeadlines, commodityNews, corporateNews] = await Promise.all([
    aggregateMarketData(supabase),
    fetchMarketNews(),
    fetchCommodityNews(),
    fetchCorporateNews(),
  ]);

  if (!marketData) {
    throw new Error("No market data available");
  }

  const systemPrompt = `You are a CFA-level senior Indonesian stock market analyst producing an institutional-grade daily market intelligence report. You have deep expertise in BEI/IDX, technical analysis, fundamental valuation, market microstructure, and macroeconomics.

Your PRIMARY MISSION is to surface NON-OBVIOUS insights and HIDDEN OPPORTUNITIES -- not to repeat the same blue-chip names in every section. You are given both top-traded stock data AND a special "AI Discovery" dataset of mid-cap stocks showing unusual signals. Use this discovery data to find what human analysts miss.

You MUST respond with ONLY valid JSON matching this exact schema (no markdown, no code fences, no explanation):

${REPORT_SCHEMA}

CRITICAL RULES -- BREADTH OVER VERBOSITY:
- STOCK DIVERSITY: Do NOT repeat the same ticker in more than 3 sections. Each section must surface DIFFERENT stocks. The reader wants to discover new opportunities, not read about BBCA/BBRI/TLKM in 8 sections.
- INSIGHT DENSITY: One sentence with a non-obvious connection between two data points beats a paragraph of obvious observations. Be concise and punchy. Avoid filler.
- DISCOVERY IS KING: The "aiDiscovery" section is the CROWN JEWEL. Surface 4-8 hidden gems from the discovery data -- stocks a human would miss. This is your analytical alpha.
- For EVERY stock you mention, ask: "Would a reader know this from a stock screener?" If yes, add something they would NOT know.
- Prioritize CAUSAL MECHANISMS over descriptions. Not "stock rose on positive sentiment" but "stock rose because X drove Y which means Z for the stock."

SECTION RULES:
1. Return ONLY valid JSON. All numbers must be actual numbers, not strings.
2. topMovers: top 8 gainers, 8 losers, 8 most active. "reason" field: 2-3 sentences, cross-reference at least 2 data dimensions. Be specific with numbers.
3. sectorPerformance: all sectors present (filter "Unknown").
4. stockPicks: 5-8 stocks. MUST include at least 2-3 picks that are NOT in the top movers or most active (use discovery data). Each pick needs: fundamentals object, technicalSetup, riskAssessment, catalysts, targetPrice. "rationale" should be substantive but dense (4-6 sentences, not padded). Be RESPONSIBLE about risks.
5. newsSentiment: preserve original URLs exactly.
6. technicalAnalysis: multi-day patterns, support/resistance from price history, RSI estimates. Include 5-8 stocks (mix blue-chip and mid-cap). "notes": 2-3 sentences per signal.
7. commodityAnalysis: 4-6 commodities (Oil, Gold, Coal, CPO, Nickel, Tin). Name specific IDX tickers affected and the transmission mechanism.
8. corporateEvents: from news data. Include ticker codes and URLs.
9. pricePredictions: 5-8 stocks. Include at least 2 non-blue-chip stocks. Be honest about confidence.
10. chartData: include ALL data points from price history (do NOT truncate). Price history for at least 6 stocks. Foreign flow chart, sector chart, breadth chart.
11. bandarmology: detect Wyckoff phases. "interpretation": 3-4 sentences connecting broker behavior to price/volume/fundamentals. Include non-blue-chip stocks from the expanded bandarmology data.
12. aiDiscovery: THIS IS MANDATORY. Analyze the discovery data (volume anomalies, foreign flow outliers, undervalued fundamentals, stealth accumulation) to find 4-8 hidden gems. Each thesis should be a genuine insight that the reader cannot get from surface-level analysis. Use SPECIFIC data points.
13. marketOutlook: synthesize everything into a cohesive thesis. Be actionable.
14. Write all analysis in English.
15. Do not use any emojis.
16. Connect seemingly unrelated data points. The hallmark of great analysis is finding the hidden thread.`;

  const userMessage = `Here is today's market data for the Indonesia Stock Exchange (${marketData.tradingDate}):

MARKET SUMMARY:
- Total stocks traded: ${marketData.totalStocks}
- Advancing: ${marketData.advancingCount}, Declining: ${marketData.decliningCount}, Unchanged: ${marketData.unchangedCount}
- Total Volume: ${marketData.totalVolume.toLocaleString()}
- Total Value: Rp ${(marketData.totalValue / 1e12).toFixed(2)} Trillion

TOP GAINERS:
${marketData.gainers.map((s) => `${s.code} (${s.name}): ${s.close} | Change: ${s.changePct.toFixed(2)}% | Vol: ${s.volume.toLocaleString()} | Sector: ${s.sector || "N/A"}`).join("\n")}

TOP LOSERS:
${marketData.losers.map((s) => `${s.code} (${s.name}): ${s.close} | Change: ${s.changePct.toFixed(2)}% | Vol: ${s.volume.toLocaleString()} | Sector: ${s.sector || "N/A"}`).join("\n")}

MOST ACTIVE BY VALUE:
${marketData.mostActive.map((s) => `${s.code} (${s.name}): ${s.close} | Change: ${s.changePct.toFixed(2)}% | Value: Rp ${(s.value / 1e9).toFixed(2)}B | Sector: ${s.sector || "N/A"}`).join("\n")}

SECTOR BREAKDOWN:
${Object.entries(marketData.sectorBreakdown)
  .filter(([k]) => k !== "Unknown")
  .map(([sector, data]) => `${sector}: ${data.stocks} stocks, Avg Change: ${(data.totalChange / data.stocks).toFixed(2)}%, Top: ${data.topStock} (${data.topChange.toFixed(2)}%)`)
  .join("\n")}

FOREIGN FLOW:
- Total Foreign Buy: Rp ${(marketData.foreignFlow.totalBuy / 1e9).toFixed(2)}B
- Total Foreign Sell: Rp ${(marketData.foreignFlow.totalSell / 1e9).toFixed(2)}B
- Net Foreign Flow: Rp ${(marketData.foreignFlow.net / 1e9).toFixed(2)}B
- Top Foreign Bought: ${marketData.foreignFlow.topBought.map((f) => `${f.code} (Rp ${(f.netBuy / 1e9).toFixed(2)}B)`).join(", ")}
- Top Foreign Sold: ${marketData.foreignFlow.topSold.map((f) => `${f.code} (Rp ${(f.netSell / 1e9).toFixed(2)}B)`).join(", ")}

MULTI-DAY PRICE HISTORY (last ~20 trading days for top stocks):
${Array.from(marketData.priceHistory.entries()).map(([code, rows]) => {
  return `${code}: ${rows.map((r) => `${r.date}=${r.close}`).join(", ")}`;
}).join("\n") || "No multi-day history available."}

MULTI-DAY FOREIGN FLOW (daily net foreign flow aggregated from top stocks):
${(() => {
  const dailyFlow = new Map<string, number>();
  for (const [, rows] of marketData.priceHistory.entries()) {
    for (const r of rows) {
      dailyFlow.set(r.date, (dailyFlow.get(r.date) || 0) + (r.foreignBuy - r.foreignSell));
    }
  }
  const sorted = [...dailyFlow.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.length > 0
    ? sorted.map(([date, net]) => `${date}=${(net / 1e9).toFixed(2)}B`).join(", ")
    : "No multi-day foreign flow data available.";
})()}

FUNDAMENTAL DATA (latest available financial ratios for key stocks):
${(() => {
  const entries = Array.from(marketData.fundamentals.entries());
  if (entries.length === 0) return "No fundamental data available.";
  return entries.map(([code, f]) => {
    return `${code} (${f.stockName}) | Sector: ${f.sector}/${f.subSector} | PER: ${f.per.toFixed(2)} | PBV: ${f.pbv.toFixed(2)} | ROE: ${f.roe.toFixed(2)}% | ROA: ${f.roa.toFixed(2)}% | NPM: ${f.npm.toFixed(2)}% | D/E: ${f.deRatio.toFixed(2)} | EPS: ${f.eps.toFixed(0)} | BV: ${f.bookValue.toFixed(0)} | Assets: Rp ${(f.assets / 1e9).toFixed(1)}B | Equity: Rp ${(f.equity / 1e9).toFixed(1)}B | Sales: Rp ${(f.sales / 1e9).toFixed(1)}B | FS Date: ${f.fsDate}`;
  }).join("\n");
})()}

RECENT CORPORATE ACTIONS (from IDX database, last 30 days):
${marketData.recentCorporateActions.length > 0 ? marketData.recentCorporateActions.map((ca) => `${ca.code} (${ca.issuerName}): ${ca.type} - ${ca.detail} [${ca.startDate}]`).join("\n") : "No recent corporate actions."}

RECENT MARKET NEWS (with source URLs -- preserve these URLs in your output):
${newsHeadlines.length > 0 ? newsHeadlines.map((h) => `- ${h.title} (${h.source}) [${h.date}] URL: ${h.url}`).join("\n") : "No recent news available."}

COMMODITY & MACRO NEWS:
${commodityNews.length > 0 ? commodityNews.map((h) => `- ${h.title} (${h.source}) [${h.date}] URL: ${h.url}`).join("\n") : "No commodity news available."}

CORPORATE / M&A / COOPERATION NEWS:
${corporateNews.length > 0 ? corporateNews.map((h) => `- ${h.title} (${h.source}) [${h.date}] URL: ${h.url}`).join("\n") : "No corporate event news available."}

BANDARMOLOGY / BROKER SUMMARY ANALYSIS (1-month broker concentration data -- includes both blue-chip and mid-cap stocks):
${marketData.bandarmologySignals.length > 0 ? marketData.bandarmologySignals.map((s) => {
  const buyersList = s.topBuyers.map((b) => `${b.broker}(${b.name}${b.isForeign ? ",F" : ""},Rp${(b.netValue / 1e9).toFixed(2)}B)`).join(", ");
  const sellersList = s.topSellers.map((b) => `${b.broker}(${b.name}${b.isForeign ? ",F" : ""},Rp${(b.netValue / 1e9).toFixed(2)}B)`).join(", ");
  return `${s.code} (${s.name}): Phase=${s.phase} | BuyConc=${s.topBuyerConcentration.toFixed(1)}% | SellConc=${s.topSellerConcentration.toFixed(1)}% | Buyers=${s.buyerCount} | Sellers=${s.sellerCount}
  Top Buyers: ${buyersList || "none"}
  Top Sellers: ${sellersList || "none"}
  Signal: ${s.rationale}`;
}).join("\n\n") : "No bandarmology data available."}

===== AI DISCOVERY DATA -- NON-OBVIOUS SIGNALS (stocks outside the top-20 by value) =====
Use this data to populate the "aiDiscovery" section. These are mid-cap stocks showing unusual patterns that warrant deeper analysis.

VOLUME ANOMALY CANDIDATES (today's volume vs trailing average -- something is happening):
${marketData.discoveryData.volumeAnomalies.length > 0 ? marketData.discoveryData.volumeAnomalies.map((s) => `${s.code} (${s.name}): Vol Today=${(s.volume / 1e6).toFixed(1)}M | 5d Avg=${(s.avgVolume / 1e6).toFixed(1)}M | Ratio=${s.volumeRatio.toFixed(1)}x | Close=${s.close} | Change=${s.changePct.toFixed(2)}% | Foreign Net=Rp ${(s.foreignNet / 1e9).toFixed(2)}B | Sector: ${s.sector || "N/A"}`).join("\n") : "No volume anomalies detected."}

FOREIGN FLOW OUTLIERS (disproportionate foreign activity in mid-cap stocks):
${marketData.discoveryData.foreignFlowOutliers.length > 0 ? marketData.discoveryData.foreignFlowOutliers.map((s) => `${s.code} (${s.name}): Foreign Net=Rp ${(s.foreignNet / 1e9).toFixed(2)}B | Daily Value=Rp ${(s.value / 1e9).toFixed(2)}B | Flow/Value=${(s.foreignIntensity * 100).toFixed(1)}% | Close=${s.close} | Change=${s.changePct.toFixed(2)}% | Sector: ${s.sector || "N/A"}`).join("\n") : "No foreign flow outliers detected."}

UNDERVALUED FUNDAMENTALS SCREEN (strong fundamentals outside top-20, PER<15, ROE>10%, D/E<1.5):
${marketData.discoveryData.undervaluedFundamentals.length > 0 ? marketData.discoveryData.undervaluedFundamentals.map((f) => `${f.code} (${f.stockName}): PER=${f.per.toFixed(2)} | PBV=${f.pbv.toFixed(2)} | ROE=${f.roe.toFixed(1)}% | D/E=${f.deRatio.toFixed(2)} | EPS=${f.eps.toFixed(0)} | Sector: ${f.sector}/${f.subSector} | FS: ${f.fsDate}`).join("\n") : "No undervalued candidates found."}

STEALTH ACCUMULATION (non-blue-chip stocks showing accumulation/markup broker patterns):
${marketData.discoveryData.stealthAccumulation.length > 0 ? marketData.discoveryData.stealthAccumulation.map((s) => {
  const buyersList = s.topBuyers.map((b) => `${b.broker}(${b.isForeign ? "F" : "D"},Rp${(b.netValue / 1e9).toFixed(2)}B)`).join(", ");
  return `${s.code} (${s.name}): Phase=${s.phase} | BuyConc=${s.topBuyerConcentration.toFixed(1)}% | Buyers=${s.buyerCount} vs Sellers=${s.sellerCount} | Top Buyers: ${buyersList}`;
}).join("\n") : "No stealth accumulation detected."}

Generate the market intelligence report. KEY REQUIREMENTS:
1. DIVERSIFY stock coverage across sections. Do not repeat the same ticker in more than 3 sections.
2. Use discovery data to find 4-8 hidden gems for aiDiscovery. These should be genuine non-obvious insights.
3. Include at least 2-3 non-blue-chip stocks in stockPicks and pricePredictions.
4. Cross-reference data points: connect price + volume + flow + fundamentals. Cite specific numbers.
5. Preserve ALL chart data points (do not truncate price history).
6. Be CONCISE -- insight density matters more than word count. No filler paragraphs.
7. Be responsible with picks: flag risks honestly, high-conviction only when multiple dimensions align.`;

  const anthropic = new Anthropic({ apiKey });

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 32000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const response = await stream.finalMessage();

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock?.type === "text" ? textBlock.text : "";

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const report = JSON.parse(cleaned);

  const sentiment = report.marketOutlook?.sentiment || "neutral";
  const imageUrl = generateCoverImageUrl(marketData.tradingDate, sentiment);
  const title = report.title || null;

  let indonesianReport: Record<string, unknown> | null = null;
  try {
    indonesianReport = await translateReportToIndonesian(anthropic, report);
  } catch (err) {
    console.error("Indonesian translation failed:", err);
  }

  const reportWithTranslation = indonesianReport
    ? { ...report, _indonesian: indonesianReport }
    : report;

  const { error: upsertError } = await supabase
    .from("market_intelligence")
    .upsert(
      {
        report_date: marketData.tradingDate,
        report: reportWithTranslation,
        title,
        image_url: imageUrl,
      },
      { onConflict: "report_date" }
    );

  if (upsertError) {
    console.error("Failed to store report:", upsertError);
  }

  return {
    report: reportWithTranslation,
    reportDate: marketData.tradingDate,
    title,
    imageUrl,
    createdAt: new Date().toISOString(),
  };
}

async function translateReportToIndonesian(
  anthropic: Anthropic,
  englishReport: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const reportJson = JSON.stringify(englishReport);

  const translationStream = anthropic.messages.stream({
    model: "claude-3-5-haiku-latest",
    max_tokens: 16384,
    system: `You are a professional financial translator specializing in Indonesian capital markets (BEI/IDX). Translate the given market intelligence report JSON from English to Bahasa Indonesia.

RULES:
1. Return ONLY valid JSON -- no markdown, no code fences, no explanation text.
2. The output JSON must have the EXACT same structure and keys as the input.
3. Translate ALL human-readable text strings to natural, professional Bahasa Indonesia.
4. DO NOT translate: ticker codes (e.g. BBCA, TLKM), broker codes, company names, URLs, date strings, enum values (bullish/bearish/neutral/inflow/outflow/up/down/flat/BUY/SELL/HOLD/WATCH/high/medium/low/accumulation/distribution/markup/markdown), field keys.
5. Keep all numbers exactly as they are.
6. Use proper Indonesian financial terminology: "saham" for stock, "emiten" for issuer, "asing" for foreign, "domestik" for domestic, "aliran dana" for flow, "dukungan" for support, "resistensi" for resistance, etc.
7. Keep the translation professional and suitable for institutional-grade reports.
8. Do not use any emojis.`,
    messages: [{ role: "user", content: reportJson }],
  });

  const translationResponse = await translationStream.finalMessage();
  const textBlock = translationResponse.content.find((b) => b.type === "text");
  const translatedText = textBlock?.type === "text" ? textBlock.text : "";

  const cleanedTranslation = translatedText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleanedTranslation);
}
