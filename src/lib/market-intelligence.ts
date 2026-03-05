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

  const bandarmologyCodes = [...stocks]
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
    .map((s) => s.code);

  const [priceHistory, corpActionsRes, bandarmologySignals] = await Promise.all([
    fetchMultiDayHistory(supabase, topCodes),
    supabase
      .from("idx_corporate_actions")
      .select("code, issuer_name, action_type, action_type_raw, start_date")
      .gte("start_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
      .order("start_date", { ascending: false })
      .limit(20),
    fetchBandarmologyData(supabase, bandarmologyCodes),
  ]);

  const recentCorporateActions = (corpActionsRes.data || []).map(
    (ca: Record<string, string>) => ({
      code: ca.code,
      issuerName: ca.issuer_name,
      type: ca.action_type,
      detail: ca.action_type_raw,
      startDate: ca.start_date,
    })
  );

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
    "gainers": [{ "code": "TICKER", "name": "Company Name", "close": number, "change": number, "changePct": number, "volume": number, "reason": "brief reason for move" }],
    "losers": [same shape],
    "mostActive": [same shape]
  },
  "foreignFlow": {
    "netFlow": number,
    "netFlowLabel": "human-readable net flow like Rp 1.2T",
    "sentiment": "inflow" | "outflow" | "neutral",
    "summary": "1-2 sentence analysis",
    "topBought": [{ "code": "TICKER", "name": "Company Name", "netBuy": number }],
    "topSold": [{ "code": "TICKER", "name": "Company Name", "netSell": number }]
  },
  "technicalAnalysis": {
    "marketTrend": "uptrend" | "downtrend" | "sideways",
    "marketTrendNotes": "2-3 sentence analysis of overall market trend based on price action, volume, and breadth",
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
        "notes": "brief technical observation"
      }
    ],
    "volumeAnalysis": "1-2 sentence analysis of overall volume trends and what they indicate"
  },
  "commodityAnalysis": {
    "summary": "2-3 sentence overview of how global commodity prices affect IDX",
    "commodities": [
      {
        "commodity": "Crude Oil" | "Gold" | "Coal" | "Palm Oil (CPO)" | "Nickel" | "Tin" | "Copper" | "Natural Gas",
        "sentiment": "bullish" | "bearish" | "neutral",
        "priceDirection": "up" | "down" | "flat",
        "impact": "1-2 sentence explanation of how this commodity's movement impacts Indonesian market",
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
      "rationale": "2-3 sentence rationale combining technical, fundamental, and flow analysis"
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
      "rationale": "2-3 sentence rationale",
      "targetPrice": number (optional)
    }
  ],
  "bandarmology": {
    "summary": "2-3 sentence overview of smart money flow patterns across the market -- are institutions accumulating or distributing?",
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
        "interpretation": "2-3 sentence institutional-quality analysis of the broker flow pattern, cross-referencing price action, volume, foreign flow, and news"
      }
    ],
    "alertStocks": ["TICKER1", "TICKER2"] (stocks showing strongest accumulation/distribution signals -- top priority watchlist)
  },
  "marketOutlook": {
    "sentiment": "bullish" | "bearish" | "neutral" | "cautious",
    "summary": "2-3 sentence overall outlook",
    "keyRisks": ["risk1", "risk2", ...],
    "keyCatalysts": ["catalyst1", "catalyst2", ...],
    "shortTermForecast": "1-2 sentence short-term forecast"
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

  const systemPrompt = `You are a senior Indonesian stock market analyst and technical chartist providing an institutional-grade daily market intelligence report. You have deep expertise in the Indonesia Stock Exchange (BEI/IDX), technical analysis, market microstructure, and macroeconomic factors affecting Indonesian equities.

You MUST respond with ONLY valid JSON matching this exact schema (no markdown, no code fences, no explanation text outside the JSON):

${REPORT_SCHEMA}

RULES:
1. Return ONLY the JSON object, nothing else. No markdown formatting, no code blocks.
2. All number values must be actual numbers, not strings.
3. For topMovers, include the top 8 gainers, 8 losers, and 8 most active stocks. The "reason" field should be deeply insightful -- cross-reference sector trends, foreign flow, commodity impacts, news catalysts, and technical patterns.
4. For sectorPerformance, include all sectors present in the data, filtering out "Unknown".
5. For stockPicks, select 5-8 stocks you find most compelling -- mix of buy, hold, watch recommendations. Be specific about entry/exit levels.
6. For newsSentiment, preserve the original URL for each news item in the "url" field exactly as provided.
7. For technicalAnalysis: analyze price action patterns, support/resistance levels, volume trends, and estimate RSI. Identify 5-8 stocks showing notable technical patterns. Include key market index levels.
8. For commodityAnalysis: analyze at least 4-6 key commodities (Oil, Gold, Coal, Palm Oil/CPO, Nickel, Tin). Map each to affected IDX companies (e.g. oil affects MEDC, ELSA; coal affects ADRO, PTBA, ITMG; CPO affects AALI, LSIP, SIMP; nickel affects ANTM, INCO, MBMA; gold affects ANTM, MDKA).
9. For corporateEvents: identify any acquisitions, mergers, cooperations, IPOs, restructurings, or market rumors from the news. Include ticker codes of involved companies. Preserve source URLs when available.
10. For pricePredictions: provide price predictions for 5-8 key stocks with short-term targets (1-2 weeks), mid-term targets (1-3 months), and stop-loss levels. Use the provided price history data to inform your predictions. State confidence level honestly.
11. For chartData: include ALL provided data points -- do NOT summarize or reduce them. For priceHistoryCharts, include every date-price pair from the multi-day price history for at least 6 top stocks. For foreignFlowChart, include every date from the multi-day foreign flow data provided. For sectorPerformanceChart, populate from sector data. The charts need enough data points for smooth, meaningful visualizations.
12. For bandarmology: this is the core of Indonesian market analysis (Bandarmology = tracking the "Bandar"/market makers). Analyze broker summary concentration patterns to detect the 4 phases: Accumulation (concentrated buying, fragmented selling -- stealth phase), Mark-Up (broker self-crossing, rising prices), Distribution (concentrated selling to fragmented retail buyers -- the trap), Mark-Down (price collapse after distribution). Flag stocks with the strongest signals. Cross-reference broker types (foreign/institutional vs retail) with price action. Include at least 8-12 stocks in signals, prioritizing those with clearest phase patterns.
13. Write all analysis in English with institutional-level depth.
14. Do not use any emojis anywhere in the response.
15. Think deeply about inter-market correlations, commodity-equity linkages, sector rotation patterns, and smart money flow. Cross-reference bandarmology signals with technical analysis and foreign flow data.`;

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

RECENT CORPORATE ACTIONS (from IDX database, last 30 days):
${marketData.recentCorporateActions.length > 0 ? marketData.recentCorporateActions.map((ca) => `${ca.code} (${ca.issuerName}): ${ca.type} - ${ca.detail} [${ca.startDate}]`).join("\n") : "No recent corporate actions."}

RECENT MARKET NEWS (with source URLs -- preserve these URLs in your output):
${newsHeadlines.length > 0 ? newsHeadlines.map((h) => `- ${h.title} (${h.source}) [${h.date}] URL: ${h.url}`).join("\n") : "No recent news available."}

COMMODITY & MACRO NEWS:
${commodityNews.length > 0 ? commodityNews.map((h) => `- ${h.title} (${h.source}) [${h.date}] URL: ${h.url}`).join("\n") : "No commodity news available."}

CORPORATE / M&A / COOPERATION NEWS:
${corporateNews.length > 0 ? corporateNews.map((h) => `- ${h.title} (${h.source}) [${h.date}] URL: ${h.url}`).join("\n") : "No corporate event news available."}

BANDARMOLOGY / BROKER SUMMARY ANALYSIS (1-month broker concentration data for top stocks):
${marketData.bandarmologySignals.length > 0 ? marketData.bandarmologySignals.map((s) => {
  const buyersList = s.topBuyers.map((b) => `${b.broker}(${b.name}${b.isForeign ? ",F" : ""},Rp${(b.netValue / 1e9).toFixed(2)}B)`).join(", ");
  const sellersList = s.topSellers.map((b) => `${b.broker}(${b.name}${b.isForeign ? ",F" : ""},Rp${(b.netValue / 1e9).toFixed(2)}B)`).join(", ");
  return `${s.code} (${s.name}): Phase=${s.phase} | BuyConc=${s.topBuyerConcentration.toFixed(1)}% | SellConc=${s.topSellerConcentration.toFixed(1)}% | Buyers=${s.buyerCount} | Sellers=${s.sellerCount}
  Top Buyers: ${buyersList || "none"}
  Top Sellers: ${sellersList || "none"}
  Signal: ${s.rationale}`;
}).join("\n\n") : "No bandarmology data available."}

Generate a comprehensive daily market intelligence report including: deep technical analysis, commodity impact analysis, corporate events, price predictions with targets and stop-losses, bandarmology/smart-money analysis, and chart data using the real historical prices provided. Cross-reference all data points -- commodity prices with related IDX stocks, news with affected tickers, foreign flow with price action, broker concentration with accumulation/distribution phases -- to produce the most insightful institutional-quality analysis possible.`;

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16384,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

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

  const response = await anthropic.messages.create({
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

  const textBlock = response.content.find((b) => b.type === "text");
  const translatedText = textBlock?.type === "text" ? textBlock.text : "";

  const cleanedTranslation = translatedText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleanedTranslation);
}
