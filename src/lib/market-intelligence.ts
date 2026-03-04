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

async function fetchMarketNews(): Promise<NewsHeadline[]> {
  const all: NewsHeadline[] = [];
  const queries = [
    "IHSG saham hari ini",
    "IDX market bursa efek Indonesia",
    "saham Indonesia terbaru",
    "ekonomi Indonesia pasar modal",
  ];

  for (const q of queries) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;
      const res = await fetch(rssUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items.slice(0, 8)) {
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
        if (title) {
          all.push({ title, source, url: link, date: dateStr });
        }
      }
    } catch {
      // best-effort
    }
  }

  const seen = new Set<string>();
  return all.filter((h) => {
    if (seen.has(h.title)) return false;
    seen.add(h.title);
    return true;
  }).slice(0, 25);
}

async function fetchCommodityNews(): Promise<NewsHeadline[]> {
  const all: NewsHeadline[] = [];
  const queries = [
    "harga minyak crude oil hari ini",
    "harga emas gold hari ini",
    "harga batubara coal Indonesia",
    "harga CPO kelapa sawit",
    "harga nikel nickel Indonesia",
    "harga timah tin Indonesia",
  ];

  for (const q of queries) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;
      const res = await fetch(rssUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items.slice(0, 4)) {
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
        if (title) {
          all.push({ title, source, url: link, date: dateStr });
        }
      }
    } catch {
      // best-effort
    }
  }

  const seen = new Set<string>();
  return all.filter((h) => {
    if (seen.has(h.title)) return false;
    seen.add(h.title);
    return true;
  }).slice(0, 15);
}

async function fetchCorporateNews(): Promise<NewsHeadline[]> {
  const all: NewsHeadline[] = [];
  const queries = [
    "akuisisi perusahaan Indonesia IDX",
    "merger saham Indonesia",
    "kerjasama bisnis emiten IDX",
    "IPO saham baru Indonesia",
    "rumor akuisisi saham Indonesia",
  ];

  for (const q of queries) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;
      const res = await fetch(rssUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items.slice(0, 4)) {
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
        if (title) {
          all.push({ title, source, url: link, date: dateStr });
        }
      }
    } catch {
      // best-effort
    }
  }

  const seen = new Set<string>();
  return all.filter((h) => {
    if (seen.has(h.title)) return false;
    seen.add(h.title);
    return true;
  }).slice(0, 10);
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
}

async function aggregateMarketData(
  supabase: ReturnType<typeof getSupabase>
): Promise<AggregatedMarketData | null> {
  const { data: summaryData } = await supabase
    .from("idx_stock_summary")
    .select("*")
    .order("date", { ascending: false })
    .limit(3000);

  if (!summaryData?.length) return null;

  const latestDate = summaryData[0].date;
  const todayStocks = summaryData.filter(
    (r: Record<string, string>) => r.date === latestDate
  );

  const { data: financialData } = await supabase
    .from("idx_financial_ratios")
    .select("code, sector, sub_sector")
    .order("fs_date", { ascending: false });

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

  const [priceHistory, corpActionsRes] = await Promise.all([
    fetchMultiDayHistory(supabase, topCodes),
    supabase
      .from("idx_corporate_actions")
      .select("code, issuer_name, action_type, action_type_raw, start_date")
      .gte("start_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
      .order("start_date", { ascending: false })
      .limit(20),
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
12. Write all analysis in English with institutional-level depth.
13. Do not use any emojis anywhere in the response.
14. Think deeply about inter-market correlations, commodity-equity linkages, sector rotation patterns, and smart money flow.`;

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

Generate a comprehensive daily market intelligence report including: deep technical analysis, commodity impact analysis, corporate events, price predictions with targets and stop-losses, and chart data using the real historical prices provided. Cross-reference all data points -- commodity prices with related IDX stocks, news with affected tickers, foreign flow with price action -- to produce the most insightful institutional-quality analysis possible.`;

  const anthropic = new Anthropic({ apiKey });

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 24000,
    thinking: {
      type: "enabled",
      budget_tokens: 12000,
    },
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

  const { error: upsertError } = await supabase
    .from("market_intelligence")
    .upsert(
      {
        report_date: marketData.tradingDate,
        report,
        title,
        image_url: imageUrl,
      },
      { onConflict: "report_date" }
    );

  if (upsertError) {
    console.error("Failed to store report:", upsertError);
  }

  return {
    report,
    reportDate: marketData.tradingDate,
    title,
    imageUrl,
    createdAt: new Date().toISOString(),
  };
}
