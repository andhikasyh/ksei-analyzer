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

  const fundamentalCodes = [...new Set([
    ...topCodes,
    ...bandarmologyCodes.slice(0, 15),
  ])];

  const [priceHistory, corpActionsRes, bandarmologySignals, { data: fundamentalRows }] = await Promise.all([
    fetchMultiDayHistory(supabase, topCodes),
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
  "marketOutlook": {
    "sentiment": "bullish" | "bearish" | "neutral" | "cautious",
    "summary": "5-8 sentence comprehensive market outlook: synthesize all data points (technical trend, foreign flow direction, commodity impact, bandarmology signals, news sentiment, sector rotation) into a cohesive market thesis. What is the weight of evidence suggesting?",
    "keyRisks": ["detailed risk description 2-3 sentences each", ...],
    "keyCatalysts": ["detailed catalyst description 2-3 sentences each", ...],
    "shortTermForecast": "4-6 sentence actionable short-term forecast: specify expected direction, key levels to watch, which sectors to overweight/underweight, and what signals would invalidate this view"
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

  const systemPrompt = `You are a CFA-level senior Indonesian stock market analyst, technical chartist, and fundamental researcher producing an institutional-grade daily market intelligence report for professional portfolio managers. You have deep expertise in the Indonesia Stock Exchange (BEI/IDX), technical analysis, fundamental valuation, market microstructure, and macroeconomic factors affecting Indonesian equities.

Your analysis must demonstrate the depth of a paid research report -- NOT a surface-level summary. Every insight should connect multiple data points and explain the "so what" implication for portfolio positioning.

You MUST respond with ONLY valid JSON matching this exact schema (no markdown, no code fences, no explanation text outside the JSON):

${REPORT_SCHEMA}

ANALYSIS DEPTH REQUIREMENTS:
- Every "reason", "rationale", "interpretation", "notes", "summary", and "impact" field must be substantive multi-sentence analysis, NOT brief one-liners
- Cross-reference AT LEAST 2-3 data dimensions for every insight (e.g. price + volume + flow, or fundamental + technical + news)
- Name specific numbers, percentages, and comparisons -- avoid vague qualitative statements
- For each stock mentioned, explain the causal mechanism, not just the correlation

RULES:
1. Return ONLY the JSON object, nothing else. No markdown formatting, no code blocks.
2. All number values must be actual numbers, not strings.
3. For topMovers, include the top 8 gainers, 8 losers, and 8 most active stocks. The "reason" field MUST be 3-5 sentences minimum: cross-reference sector trends, foreign flow, commodity impacts, news catalysts, technical patterns, fundamental valuation, AND broker activity. Explain the narrative behind each move.
4. For sectorPerformance, include all sectors present in the data, filtering out "Unknown".
5. For stockPicks, this is the MOST IMPORTANT section -- you are making a research recommendation that people may act on:
   - Select 5-8 stocks with a mix of BUY, HOLD, SELL, WATCH recommendations
   - EVERY pick MUST be justified with: (a) fundamental valuation analysis using the provided PER, PBV, ROE, D/E data and how they compare to sector averages, (b) technical setup with specific chart patterns and key price levels, (c) flow analysis -- what are foreign investors and brokers doing with this stock, (d) specific near-term catalysts or risk factors
   - The "rationale" must be 6-10 sentences -- a full investment thesis
   - Include the "fundamentals" object with actual values from the provided data
   - Include "technicalSetup", "riskAssessment", and "catalysts" fields
   - Be RESPONSIBLE: clearly state risks, do not present uncertain calls as high-conviction. If fundamentals are deteriorating, flag it even for technically attractive setups.
   - Include a "targetPrice" with justification (e.g. based on PBV reversion, sector-relative PER, or technical resistance)
6. For newsSentiment, preserve the original URL for each news item in the "url" field exactly as provided.
7. For technicalAnalysis: provide detailed multi-day pattern analysis, not just today's snapshot. Identify support/resistance from the price history provided. Estimate RSI from recent price momentum. The "notes" for each signal should be 3-5 sentences describing the setup, volume confirmation, and actionable trade parameters. Include 5-8 stocks.
8. For commodityAnalysis: analyze at least 4-6 key commodities (Oil, Gold, Coal, Palm Oil/CPO, Nickel, Tin). For each: explain the global supply-demand context, current price trajectory, and specifically HOW it flows through to Indonesian producers' revenue/margins. Name specific IDX tickers with the transmission mechanism (e.g. "ADRO benefits from thermal coal spot at $X as ~70% of revenue is coal mining with ASP tracking Newcastle benchmark").
9. For corporateEvents: identify any acquisitions, mergers, cooperations, IPOs, restructurings, or market rumors from the news. Include ticker codes of involved companies. Preserve source URLs when available.
10. For pricePredictions: provide predictions for 5-8 key stocks with targets backed by the fundamental and technical data provided. Rationale must be 5-8 sentences combining price history analysis, fundamental valuation, flow signals, and risk assessment. Be honest about confidence -- "high" only when multiple dimensions align.
11. For chartData: include ALL provided data points -- do NOT summarize or reduce them. For priceHistoryCharts, include every date-price pair from the multi-day price history for at least 6 top stocks. For foreignFlowChart, include every date from the multi-day foreign flow data provided. For sectorPerformanceChart, populate from sector data. For marketBreadthChart, calculate from the daily advance-decline data. The charts need enough data points for smooth, meaningful visualizations.
12. For bandarmology: this is the core of Indonesian market analysis. Analyze broker concentration patterns to detect the 4 Wyckoff phases: Accumulation (concentrated institutional buying, fragmented retail selling -- stealth buying phase), Mark-Up (price rising with broker self-crossing confirming controlled distribution), Distribution (concentrated selling to fragmented retail buyers -- the smart money exit), Mark-Down (price collapse after distribution completes). For each stock signal: the "interpretation" must be 4-6 sentences connecting broker behavior to price action, volume patterns, and fundamental context. Flag the highest-conviction signals in "alertStocks".
13. For marketOutlook: synthesize ALL data dimensions into a cohesive macro thesis. The "summary" must be 5-8 sentences. "keyRisks" and "keyCatalysts" should each have 3-5 items, each being 2-3 sentences. The "shortTermForecast" must be 4-6 sentences with actionable guidance.
14. Write all analysis in English with institutional-level depth.
15. Do not use any emojis anywhere in the response.
16. Think deeply about inter-market correlations, commodity-equity linkages, sector rotation patterns, and smart money flow. The hallmark of great analysis is connecting seemingly unrelated data points into a coherent narrative.`;

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

BANDARMOLOGY / BROKER SUMMARY ANALYSIS (1-month broker concentration data for top stocks):
${marketData.bandarmologySignals.length > 0 ? marketData.bandarmologySignals.map((s) => {
  const buyersList = s.topBuyers.map((b) => `${b.broker}(${b.name}${b.isForeign ? ",F" : ""},Rp${(b.netValue / 1e9).toFixed(2)}B)`).join(", ");
  const sellersList = s.topSellers.map((b) => `${b.broker}(${b.name}${b.isForeign ? ",F" : ""},Rp${(b.netValue / 1e9).toFixed(2)}B)`).join(", ");
  return `${s.code} (${s.name}): Phase=${s.phase} | BuyConc=${s.topBuyerConcentration.toFixed(1)}% | SellConc=${s.topSellerConcentration.toFixed(1)}% | Buyers=${s.buyerCount} | Sellers=${s.sellerCount}
  Top Buyers: ${buyersList || "none"}
  Top Sellers: ${sellersList || "none"}
  Signal: ${s.rationale}`;
}).join("\n\n") : "No bandarmology data available."}

Generate a comprehensive daily market intelligence report. CRITICAL DEPTH REQUIREMENTS:

1. CROSS-REFERENCE EVERYTHING: Every insight must connect at least 2-3 data dimensions. Example: "ADRO rose 3.2% on Rp 45B foreign net buy (technical breakout above 2,850 resistance confirmed by 2.3x average volume), as Newcastle coal spot prices climbed to $135/ton. PER at 5.2x remains well below the mining sector average of 8.1x, with ROE of 24.3% indicating strong capital efficiency."

2. STOCK PICKS MUST BE RESEARCH-QUALITY: Use the fundamental data provided (PER, PBV, ROE, D/E, EPS) to build valuation arguments. Compare to sector averages. State specific price levels from the chart data. Cross-reference with bandarmology phase and foreign flow.

3. EVERY REASON/RATIONALE must be multi-sentence with specific numbers and causal explanations -- NOT generic summaries like "stock rose on positive sentiment". Explain the mechanism.

4. INCLUDE ALL CHART DATA POINTS: Preserve every date-price pair in the price history. Do not truncate the data.

5. BE RESPONSIBLE WITH PICKS: Flag deteriorating fundamentals honestly. If D/E is high, say so. If PER is expensive vs sector, acknowledge it. High-conviction calls require fundamental, technical, AND flow alignment.`;

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 32000,
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
