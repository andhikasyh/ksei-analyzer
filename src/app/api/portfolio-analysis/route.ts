import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAuthUser } from "@/lib/auth";
import { checkProStatusServer } from "@/lib/supabase";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  const user = await getAuthUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPro = await checkProStatusServer(user.id);
  const rateLimitKey = `portfolio-analysis:user:${user.id}`;
  const { allowed, retryAfterMs } = checkRateLimit(rateLimitKey);

  if (!allowed && !isPro) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).` }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfterSec) } }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Service unavailable" }, { status: 500 });
  }

  const body = await request.json();
  const { holdings, broker: brokerInfo, messages: clientMessages } = body;

  if (!Array.isArray(holdings) || holdings.length === 0) {
    return Response.json({ error: "holdings array is required" }, { status: 400 });
  }

  if (clientMessages && (!Array.isArray(clientMessages) || clientMessages.length > 30)) {
    return Response.json({ error: "Invalid messages" }, { status: 400 });
  }

  const brokerName = brokerInfo?.name || "Default";
  const buyFeePct = brokerInfo?.buyPct || 0.0015;
  const sellFeePct = brokerInfo?.sellPct || 0.0025;

  const stockCodes = holdings.map((h: any) => h.stock_code);
  const supabase = getSupabase();

  const [companiesRes, financialsRes, marketRes, dividendsRes] = await Promise.all([
    supabase.from("idx_companies").select("*").in("kode_emiten", stockCodes),
    supabase
      .from("idx_financial_ratios")
      .select("*")
      .in("code", stockCodes)
      .order("fs_date", { ascending: false }),
    supabase
      .from("idx_stock_summary")
      .select("stock_code, date, close, change, volume, value, foreign_buy, foreign_sell, listed_shares")
      .in("stock_code", stockCodes)
      .order("date", { ascending: false })
      .limit(stockCodes.length * 30),
    supabase
      .from("idx_dividends")
      .select("code, cash_dividend, currency, ex_dividend, payment_date, note")
      .in("code", stockCodes)
      .order("ex_dividend", { ascending: false })
      .limit(stockCodes.length * 5),
  ]);

  const companyMap: Record<string, any> = {};
  (companiesRes.data ?? []).forEach((c: any) => { companyMap[c.kode_emiten] = c; });

  const financialMap: Record<string, any> = {};
  (financialsRes.data ?? []).forEach((f: any) => {
    if (!financialMap[f.code]) financialMap[f.code] = f;
  });

  const marketMap: Record<string, any[]> = {};
  (marketRes.data ?? []).forEach((m: any) => {
    if (!marketMap[m.stock_code]) marketMap[m.stock_code] = [];
    if (marketMap[m.stock_code].length < 10) marketMap[m.stock_code].push(m);
  });

  const dividendMap: Record<string, any[]> = {};
  (dividendsRes.data ?? []).forEach((d: any) => {
    if (!dividendMap[d.code]) dividendMap[d.code] = [];
    dividendMap[d.code].push(d);
  });

  const SHARES_PER_LOT = 100;

  const portfolioData = holdings.map((h: any) => {
    const company = companyMap[h.stock_code] || {};
    const fin = financialMap[h.stock_code] || {};
    const market = marketMap[h.stock_code] || [];
    const divs = dividendMap[h.stock_code] || [];
    const latestPrice = market[0] ? parseFloat(market[0].close) || 0 : 0;
    const shares = h.shares;
    const lots = Math.round(shares / SHARES_PER_LOT);
    const marketValue = latestPrice * shares;
    const costBasis = h.avg_price * shares;
    const buyFee = costBasis * buyFeePct;
    const sellFee = marketValue * sellFeePct;
    const netCost = costBasis + buyFee;
    const netMV = marketValue - sellFee;
    const grossPnl = marketValue - costBasis;
    const grossPnlPct = costBasis > 0 ? (grossPnl / costBasis) * 100 : 0;
    const netPnl = netMV - netCost;
    const netPnlPct = netCost > 0 ? (netPnl / netCost) * 100 : 0;
    const breakEvenPrice = Math.ceil(h.avg_price * (1 + buyFeePct) / (1 - sellFeePct));

    return {
      stockCode: h.stock_code,
      companyName: company.nama_emiten || fin.stock_name || h.stock_code,
      sector: company.sektor || fin.sector || "Unknown",
      subSector: company.sub_sektor || fin.sub_sector || "",
      lots,
      shares,
      avgPrice: h.avg_price,
      breakEvenPrice,
      currentPrice: latestPrice,
      marketValue,
      costBasis,
      buyFee: Math.round(buyFee),
      sellFee: Math.round(sellFee),
      grossPnl,
      grossPnlPct: Math.round(grossPnlPct * 100) / 100,
      netPnl,
      netPnlPct: Math.round(netPnlPct * 100) / 100,
      financials: fin.code ? {
        pe: fin.per, pbv: fin.price_bv, de: fin.de_ratio,
        roe: fin.roe, roa: fin.roa, npm: fin.npm, eps: fin.eps,
        assets: fin.assets, liabilities: fin.liabilities, equity: fin.equity,
        sales: fin.sales, profit: fin.profit_period,
      } : null,
      recentPrices: market.slice(0, 5).map((m: any) => ({
        date: m.date, close: m.close, change: m.change,
        foreignBuy: m.foreign_buy, foreignSell: m.foreign_sell,
      })),
      dividends: divs.slice(0, 3).map((d: any) => ({
        amount: d.cash_dividend, exDate: d.ex_dividend, type: d.note,
      })),
    };
  });

  const totalMarketValue = portfolioData.reduce((s: number, p: any) => s + p.marketValue, 0);
  const totalCostBasis = portfolioData.reduce((s: number, p: any) => s + p.costBasis, 0);
  const totalBuyFees = portfolioData.reduce((s: number, p: any) => s + p.buyFee, 0);
  const totalSellFees = portfolioData.reduce((s: number, p: any) => s + p.sellFee, 0);
  const totalGrossPnL = totalMarketValue - totalCostBasis;
  const totalNetPnL = (totalMarketValue - totalSellFees) - (totalCostBasis + totalBuyFees);
  const totalPnLPct = totalCostBasis > 0 ? (totalGrossPnL / totalCostBasis) * 100 : 0;
  const totalNetPnLPct = (totalCostBasis + totalBuyFees) > 0 ? (totalNetPnL / (totalCostBasis + totalBuyFees)) * 100 : 0;

  const sectorBreakdown: Record<string, number> = {};
  portfolioData.forEach((p: any) => {
    sectorBreakdown[p.sector] = (sectorBreakdown[p.sector] || 0) + p.marketValue;
  });

  const portfolioContext = {
    broker: { name: brokerName, buyFeePct: (buyFeePct * 100).toFixed(2) + "%", sellFeePct: (sellFeePct * 100).toFixed(2) + "%" },
    totalHoldings: portfolioData.length,
    totalMarketValue,
    totalCostBasis,
    totalBuyFees: Math.round(totalBuyFees),
    totalSellFees: Math.round(totalSellFees),
    totalGrossPnL,
    grossPnLPct: Math.round(totalPnLPct * 100) / 100,
    totalNetPnL,
    netPnLPct: Math.round(totalNetPnLPct * 100) / 100,
    sectorAllocation: Object.entries(sectorBreakdown).map(([sector, value]) => ({
      sector,
      value,
      percentage: totalMarketValue > 0 ? Math.round((value / totalMarketValue) * 10000) / 100 : 0,
    })),
    holdings: portfolioData,
  };

  const systemPrompt = `You are a professional portfolio analyst specializing in the Indonesia Stock Exchange (IDX/BEI). You provide insightful, actionable analysis in clear, accessible language for Indonesian retail investors.

CONTEXT - Indonesian Stock Market (IDX/BEI):
- Stocks traded in LOTS (1 lot = 100 lembar/shares)
- User's broker: ${brokerName} (buy fee: ${(buyFeePct * 100).toFixed(2)}%, sell fee: ${(sellFeePct * 100).toFixed(2)}%)
- The data includes break-even prices already accounting for round-trip broker fees
- Currency: IDR (Rupiah)

Here is the complete portfolio data:

${JSON.stringify(portfolioContext, null, 2)}

Provide a comprehensive portfolio analysis. Structure your response EXACTLY as follows:

**SKOR KESEHATAN PORTFOLIO: [0-100]/100**

**RINGKASAN EKSEKUTIF**
3-4 sentences: total value, gross vs net P&L (both with percentages), total fees paid, how the broker fees impact returns, and key strengths/concerns.

**ANALISIS PER SAHAM**
For EACH holding in the portfolio, write a dedicated analysis covering:
- Position: [lots] lot [code] @ Rp [avg_price] (now Rp [current_price])
- BEP: Rp [break_even_price] -- state whether current price is above or below BEP
- P&L: Gross [amount/pct], Net (after fees) [amount/pct]
- Fee impact: buy fee Rp [x], sell fee Rp [y] -- is this eating significantly into returns?
- Financial health: interpret key ratios (P/E, ROE, D/E, NPM) in simple terms
- Verdict: STRONG BUY / BUY / HOLD / SELL / STRONG SELL with 1-2 sentence rationale
- Action: specific recommendation (hold, add [n] lot, reduce to [n] lot, exit position)

**ANALISIS DIVERSIFIKASI**
- Sector concentration risk with percentages
- Number of holdings adequacy (ideal: 5-15 stocks for retail)
- Correlation risk -- are holdings moving together?
- Over/under-weight sectors vs IHSG composition

**LAPORAN RISIKO**
- Overall risk level: LOW / MODERATE / HIGH / VERY HIGH
- Top 3 risks ranked by severity
- Largest position as % of total (concentration risk)
- D/E ratio exposure across the portfolio
- What could go wrong: worst-case scenario assessment

**BIAYA & EFISIENSI**
- Total fees paid (buy + sell) as % of portfolio value
- Fee drag on annual returns
- Is the broker fee competitive? Suggest alternatives if not
- Tax-loss harvesting opportunities if any positions are at a loss

**REKOMENDASI AKSI**
Give exactly 3-5 specific, actionable steps. Each step must specify:
- Exact action (buy/sell/hold)
- Stock code
- Number of lots
- Approximate cost/proceeds
- Rationale in 1 sentence

**PROYEKSI PENDAPATAN**
- Expected annual dividend income per stock (in Rupiah)
- Total projected dividend yield (on cost basis vs current)
- Next upcoming ex-dates if known

**NILAI AKHIR: [A+ to F]**
One paragraph final assessment: is this a good portfolio? What's the #1 priority?

RULES:
- Do not use any emojis.
- Do not use markdown tables (|---|---| format). Use bullet points instead.
- Write in Bahasa Indonesia with financial terms in English where natural (P/E, ROE, BEP, etc.)
- All monetary values in IDR with separators (e.g. Rp 1.500.000).
- Always express quantities in LOTS.
- Be direct and honest. Don't sugarcoat underperforming positions.
- Reference SPECIFIC numbers from the data -- don't be vague.
- If < 3 stocks, strongly flag under-diversification.

FOR FOLLOW-UP QUESTIONS:
- Answer concisely and directly based on the portfolio data above.
- Stay focused on the user's portfolio and Indonesian stock market.
- You can deep-dive into any specific stock or topic the user asks about.
- If the user asks about a stock not in their portfolio, relate it back to how it would fit.
- Maintain the same formatting style: bold headers, bullet points, no tables.`;

  const anthropic = new Anthropic({ apiKey });

  const apiMessages = clientMessages
    ? clientMessages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    : [{ role: "user" as const, content: "Analyze my portfolio and provide a comprehensive report." }];

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: systemPrompt,
    messages: apiMessages,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err: unknown) {
        console.error("Portfolio analysis stream error:", err instanceof Error ? err.message : err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Analysis failed" })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
