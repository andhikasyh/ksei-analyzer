import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface ExitRule {
  type: "tp_sl" | "holding_period" | "trailing_stop";
  tp?: number;
  sl?: number;
  days?: number;
  trailingPct?: number;
}

interface PriceRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeResult {
  symbol: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  exitReason: "tp" | "sl" | "trailing" | "expiry" | "end_of_data";
  pnlPct: number;
  pnlAmount: number;
  shares: number;
  capitalUsed: number;
  holdingDays: number;
  maxDrawdownPct: number;
  maxGainPct: number;
  equityCurve: { date: string; value: number; amount: number }[];
}

function simulateTrade(
  prices: PriceRow[],
  entryIdx: number,
  exitRule: ExitRule,
  capitalPerTrade: number
): TradeResult | null {
  if (entryIdx < 0 || entryIdx >= prices.length) return null;
  const entry = prices[entryIdx];
  const entryPrice = entry.close;
  if (entryPrice <= 0) return null;

  const shares = Math.floor(capitalPerTrade / entryPrice);
  const capitalUsed = shares * entryPrice;
  if (shares <= 0) return null;

  let exitIdx = -1;
  let exitPrice = entryPrice;
  let exitReason: TradeResult["exitReason"] = "end_of_data";
  let maxHigh = entryPrice;
  let maxDrawdown = 0;
  let maxGain = 0;
  const equityCurve: { date: string; value: number; amount: number }[] = [
    { date: entry.date, value: 100, amount: capitalUsed },
  ];

  const maxDays = exitRule.type === "holding_period" ? (exitRule.days || 20) : 999;

  for (let i = entryIdx + 1; i < prices.length; i++) {
    const daysSince = i - entryIdx;
    const bar = prices[i];

    const highPct = ((bar.high - entryPrice) / entryPrice) * 100;
    const lowPct = ((bar.low - entryPrice) / entryPrice) * 100;
    const closePct = ((bar.close - entryPrice) / entryPrice) * 100;

    if (bar.high > maxHigh) maxHigh = bar.high;
    const dd = ((bar.low - maxHigh) / maxHigh) * 100;
    if (dd < maxDrawdown) maxDrawdown = dd;
    if (highPct > maxGain) maxGain = highPct;

    equityCurve.push({
      date: bar.date,
      value: 100 + closePct,
      amount: Math.round(shares * bar.close),
    });

    if (exitRule.type === "tp_sl" || exitRule.type === "holding_period") {
      if (exitRule.sl !== undefined && lowPct <= -exitRule.sl) {
        exitIdx = i;
        exitPrice = entryPrice * (1 - exitRule.sl / 100);
        exitReason = "sl";
        break;
      }
      if (exitRule.tp !== undefined && highPct >= exitRule.tp) {
        exitIdx = i;
        exitPrice = entryPrice * (1 + exitRule.tp / 100);
        exitReason = "tp";
        break;
      }
    }

    if (exitRule.type === "trailing_stop" && exitRule.trailingPct) {
      const trailPrice = maxHigh * (1 - exitRule.trailingPct / 100);
      if (bar.low <= trailPrice) {
        exitIdx = i;
        exitPrice = trailPrice;
        exitReason = "trailing";
        break;
      }
    }

    if (daysSince >= maxDays) {
      exitIdx = i;
      exitPrice = bar.close;
      exitReason = "expiry";
      break;
    }
  }

  if (exitIdx === -1) {
    exitIdx = prices.length - 1;
    exitPrice = prices[exitIdx].close;
    exitReason = "end_of_data";
  }

  const pnlPct = ((exitPrice - entryPrice) / entryPrice) * 100;
  const pnlAmount = Math.round(shares * (exitPrice - entryPrice));

  return {
    symbol: "",
    entryDate: entry.date,
    entryPrice,
    exitDate: prices[exitIdx].date,
    exitPrice: Math.round(exitPrice * 100) / 100,
    exitReason,
    pnlPct: Math.round(pnlPct * 100) / 100,
    pnlAmount,
    shares,
    capitalUsed: Math.round(capitalUsed),
    holdingDays: exitIdx - entryIdx,
    maxDrawdownPct: Math.round(maxDrawdown * 100) / 100,
    maxGainPct: Math.round(maxGain * 100) / 100,
    equityCurve,
  };
}

async function runManualBacktest(
  supabase: ReturnType<typeof getSupabase>,
  stocks: string[],
  entryDate: string,
  exitRule: ExitRule,
  capital: number,
  sizing: string
): Promise<TradeResult[]> {
  const results: TradeResult[] = [];
  const numStocks = stocks.length;
  const capitalPerStock = sizing === "equal" ? capital / numStocks : capital;

  for (const symbol of stocks) {
    const { data } = await supabase
      .from("idx_stock_summary")
      .select("date, open_price, high, low, close, volume")
      .eq("stock_code", symbol)
      .gte("date", entryDate)
      .order("date", { ascending: true })
      .limit(300);

    if (!data?.length) continue;

    const prices: PriceRow[] = data.map((r: Record<string, unknown>) => ({
      date: r.date as string,
      open: parseFloat(r.open_price as string) || 0,
      high: parseFloat(r.high as string) || 0,
      low: parseFloat(r.low as string) || 0,
      close: parseFloat(r.close as string) || 0,
      volume: parseFloat(r.volume as string) || 0,
    }));

    const trade = simulateTrade(prices, 0, exitRule, capitalPerStock);
    if (trade) {
      trade.symbol = symbol;
      results.push(trade);
    }
  }

  return results;
}

async function runStrategyBacktest(
  supabase: ReturnType<typeof getSupabase>,
  stocks: string[],
  strategy: string,
  exitRule: ExitRule,
  lookbackMonths: number,
  capital: number,
  sizing: string
): Promise<{ trades: TradeResult[]; stats: Record<string, number>; monthlyReturns: Record<string, number>; drawdownCurve: { date: string; dd: number; equity: number }[] }> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - lookbackMonths);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const symbolList = stocks.length > 0 ? stocks : null;

  const { data: signalData, error: rpcError } = await supabase.rpc(
    "lab_detect_signals",
    {
      p_strategy: strategy,
      p_symbols: symbolList,
      p_date_from: cutoffStr,
      p_date_to: new Date().toISOString().slice(0, 10),
      p_limit: 500,
    }
  );

  if (rpcError || !signalData?.length) {
    return { trades: [], stats: {}, monthlyReturns: {}, drawdownCurve: [] };
  }

  const signalEntries: { symbol: string; date: string }[] = (signalData as { symbol: string; signal_date: string }[]).map(
    (r) => ({ symbol: r.symbol, date: r.signal_date })
  );

  const trades: TradeResult[] = [];
  const symbolPriceCache = new Map<string, PriceRow[]>();
  const uniqueSymbols = [...new Set(signalEntries.map((e) => e.symbol))];

  for (const sym of uniqueSymbols) {
    const { data } = await supabase
      .from("idx_stock_summary")
      .select("date, open_price, high, low, close, volume")
      .eq("stock_code", sym)
      .gte("date", cutoffStr)
      .order("date", { ascending: true })
      .limit(300);

    if (data?.length) {
      symbolPriceCache.set(
        sym,
        data.map((r: Record<string, unknown>) => ({
          date: r.date as string,
          open: parseFloat(r.open_price as string) || 0,
          high: parseFloat(r.high as string) || 0,
          low: parseFloat(r.low as string) || 0,
          close: parseFloat(r.close as string) || 0,
          volume: parseFloat(r.volume as string) || 0,
        }))
      );
    }
  }

  for (const entry of signalEntries) {
    const prices = symbolPriceCache.get(entry.symbol);
    if (!prices) continue;

    const entryIdx = prices.findIndex((p) => p.date >= entry.date);
    if (entryIdx < 0) continue;

    const capPerTrade = sizing === "equal"
      ? capital / Math.max(signalEntries.length, 1)
      : capital * 0.2;
    const trade = simulateTrade(prices, entryIdx, exitRule, capPerTrade);
    if (trade) {
      trade.symbol = entry.symbol;
      trades.push(trade);
    }
  }

  const wins = trades.filter((t) => t.pnlPct > 0);
  const losses = trades.filter((t) => t.pnlPct <= 0);
  const totalPnl = trades.reduce((s, t) => s + t.pnlPct, 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnlPct, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlPct, 0));
  const totalPnlAmount = trades.reduce((s, t) => s + t.pnlAmount, 0);

  let maxConsecWins = 0, maxConsecLosses = 0, cw = 0, cl = 0;
  for (const t of trades) {
    if (t.pnlPct > 0) { cw++; cl = 0; } else { cl++; cw = 0; }
    if (cw > maxConsecWins) maxConsecWins = cw;
    if (cl > maxConsecLosses) maxConsecLosses = cl;
  }

  const returns = trades.map((t) => t.pnlPct);
  const avgRet = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 1 ? Math.sqrt(returns.reduce((s, r) => s + (r - avgRet) ** 2, 0) / (returns.length - 1)) : 0;
  const downside = returns.filter((r) => r < 0);
  const downsideDev = downside.length > 1 ? Math.sqrt(downside.reduce((s, r) => s + r ** 2, 0) / downside.length) : 0;
  const sharpe = stdDev > 0 ? Math.round((avgRet / stdDev) * 100) / 100 : 0;
  const sortino = downsideDev > 0 ? Math.round((avgRet / downsideDev) * 100) / 100 : 0;
  const expectancy = returns.length > 0 ? Math.round(((wins.length / returns.length) * (wins.length > 0 ? grossProfit / wins.length : 0) - (losses.length / returns.length) * (losses.length > 0 ? grossLoss / losses.length : 0)) * 100) / 100 : 0;

  const sortedTrades = [...trades].sort((a, b) => a.exitDate.localeCompare(b.exitDate));
  let equity = capital;
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: { date: string; dd: number; equity: number }[] = [{ date: cutoffStr, dd: 0, equity: capital }];
  for (const t of sortedTrades) {
    equity += t.pnlAmount;
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
    if (dd < maxDD) maxDD = dd;
    drawdownCurve.push({ date: t.exitDate, dd: Math.round(dd * 100) / 100, equity: Math.round(equity) });
  }
  const calmar = maxDD < 0 ? Math.round((totalPnl / Math.abs(maxDD)) * 100) / 100 : 0;

  const monthlyReturns: Record<string, number> = {};
  for (const t of trades) {
    const ym = t.exitDate.slice(0, 7);
    monthlyReturns[ym] = (monthlyReturns[ym] || 0) + t.pnlPct;
  }
  for (const k of Object.keys(monthlyReturns)) {
    monthlyReturns[k] = Math.round(monthlyReturns[k] * 100) / 100;
  }

  const stats = {
    totalTrades: trades.length,
    winRate: trades.length > 0 ? Math.round((wins.length / trades.length) * 10000) / 100 : 0,
    avgReturn: trades.length > 0 ? Math.round(totalPnl / trades.length * 100) / 100 : 0,
    totalReturn: Math.round(totalPnl * 100) / 100,
    totalPnlAmount,
    profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : 0,
    maxWin: trades.length > 0 ? Math.max(...trades.map((t) => t.pnlPct)) : 0,
    maxLoss: trades.length > 0 ? Math.min(...trades.map((t) => t.pnlPct)) : 0,
    maxConsecWins,
    maxConsecLosses,
    avgHoldingDays: trades.length > 0 ? Math.round(trades.reduce((s, t) => s + t.holdingDays, 0) / trades.length) : 0,
    sharpe,
    sortino,
    calmar,
    expectancy,
    maxDrawdownPct: Math.round(maxDD * 100) / 100,
    finalEquity: Math.round(equity),
  };

  return { trades, stats, monthlyReturns, drawdownCurve };
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  const { allowed, retryAfterMs } = checkRateLimit(`backtest:${ip}`);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).` },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  try {
    const body = await request.json();
    const supabase = getSupabase();

    if (body.mode === "manual") {
      const { stocks, entryDate, exitRule, capital = 100_000_000, sizing = "equal" } = body;
      if (!stocks?.length || !entryDate || !exitRule) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const cappedCapital = Math.min(Math.max(Number(capital) || 100_000_000, 1_000_000), 1_000_000_000_000);
      const trades = await runManualBacktest(supabase, stocks.slice(0, 5), entryDate, exitRule, cappedCapital, sizing);
      return NextResponse.json({ trades });
    }

    if (body.mode === "strategy") {
      const { stocks = [], strategy, exitRule, lookbackMonths = 6, capital = 100_000_000, sizing = "equal" } = body;
      if (!strategy || !exitRule) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const cappedLookback = Math.min(Math.max(Number(lookbackMonths) || 6, 1), 36);
      const cappedCapital = Math.min(Math.max(Number(capital) || 100_000_000, 1_000_000), 1_000_000_000_000);
      const result = await runStrategyBacktest(
        supabase, stocks.slice(0, 20), strategy, exitRule, cappedLookback, cappedCapital, sizing
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    console.error("Backtest error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
