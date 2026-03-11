import { supabase } from "./supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StockRegime {
  symbol: string;
  regime: string;
  confidence_score: number;
  accum_ratio: number;
  volume_ratio: number;
  volatility: number;
  foreign_flow_dir: number;
}

export interface ConcentrationSnapshot {
  date: string;
  buy_concentration: number;
  sell_concentration: number;
  accum_ratio: number;
  net_flow: number;
  total_buyers: number;
  total_sellers: number;
  top_buyer_code: string;
  top_buyer_share: number;
  buyer_participation: number;
}

export interface DailyBrokerEntry {
  broker_code: string;
  date: string;
  net_value: number;
}

export interface OHLCVPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
  foreign_buy: number;
  foreign_sell: number;
}

export interface CADIPoint {
  date: string;
  label: string;
  cadi: number;
  dailyNet: number;
}

export interface WyckoffPhase {
  startDate: string;
  endDate: string;
  phase: "ACC" | "MU" | "DIS" | "MD";
  confidence: number;
  priceChange: number;
  priceRange: [number, number];
  days: number;
}

export interface BrokerStreak {
  broker_code: string;
  days_active: number;
  total_days: number;
  max_streak: number;
  current_streak: number;
  direction: "buy" | "sell";
  activity_ratio: number;
}

export interface SMTResult {
  score: number;
  components: {
    freqVolDiv: number;
    stealthAccum: number;
    absorption: number;
    concMomentum: number;
    blockTrade: number;
  };
}

export interface DivergenceResult {
  type: "bullish" | "bearish" | "none";
  strength: number;
  priceTrend: "up" | "down" | "flat";
  flowTrend: "up" | "down" | "flat";
}

export interface CorrelationResult {
  rSquared: number;
  rankIC: number;
  badge: "Strong" | "Moderate" | "Weak" | "Minimal";
}

export interface VerdictFactor {
  name: string;
  direction: "bullish" | "bearish" | "neutral";
  strength: number;
}

export interface VerdictResult {
  signal: "ACCUMULATION" | "DISTRIBUTION" | "NEUTRAL";
  conviction: number;
  factors: VerdictFactor[];
}

export interface FlowAnalysis {
  regime: StockRegime | null;
  concentration: ConcentrationSnapshot | null;
  concentrationHistory: ConcentrationSnapshot[];
  cadi: CADIPoint[];
  wyckoff: WyckoffPhase[];
  persistence: BrokerStreak[];
  smt: SMTResult;
  divergence: DivergenceResult;
  correlation: CorrelationResult;
  verdict: VerdictResult;
  prices: OHLCVPoint[];
}

// ── Data Fetching ──────────────────────────────────────────────────────────────

export async function fetchStockRegime(symbol: string): Promise<StockRegime | null> {
  const { data } = await supabase
    .from("mv_stock_regime")
    .select("symbol, regime, confidence_score, accum_ratio, volume_ratio, volatility, foreign_flow_dir")
    .eq("symbol", symbol)
    .limit(1);

  if (!data?.[0]) return null;
  const r = data[0] as any;
  return {
    symbol: r.symbol,
    regime: r.regime || "neutral",
    confidence_score: parseFloat(r.confidence_score) || 0,
    accum_ratio: parseFloat(r.accum_ratio) || 0,
    volume_ratio: parseFloat(r.volume_ratio) || 0,
    volatility: parseFloat(r.volatility) || 0,
    foreign_flow_dir: parseFloat(r.foreign_flow_dir) || 0,
  };
}

async function fetchConcentration(symbol: string): Promise<ConcentrationSnapshot | null> {
  const { data } = await supabase
    .from("v_ba_accumulation")
    .select("date, buy_concentration, sell_concentration, accum_ratio, net_flow, total_buyers, total_sellers, top_buyer_code, top_buyer_share, buyer_participation")
    .eq("symbol", symbol)
    .eq("period", "1M")
    .eq("investor_type", "ALL")
    .eq("market_board", "REGULAR")
    .order("date", { ascending: false })
    .limit(1);

  if (!data?.[0]) return null;
  const r = data[0] as any;
  return {
    date: r.date,
    buy_concentration: parseFloat(r.buy_concentration) || 0,
    sell_concentration: parseFloat(r.sell_concentration) || 0,
    accum_ratio: parseFloat(r.accum_ratio) || 0,
    net_flow: parseFloat(r.net_flow) || 0,
    total_buyers: parseInt(r.total_buyers) || 0,
    total_sellers: parseInt(r.total_sellers) || 0,
    top_buyer_code: r.top_buyer_code || "",
    top_buyer_share: parseFloat(r.top_buyer_share) || 0,
    buyer_participation: parseFloat(r.buyer_participation) || 0,
  };
}

async function fetchDailyBrokerData(symbol: string, dateFrom: string, dateTo: string): Promise<DailyBrokerEntry[]> {
  const { data } = await supabase
    .from("idx_broker_activity")
    .select("broker_code, date, time, value_raw")
    .eq("symbol", symbol)
    .eq("period", "6M")
    .eq("investor_type", "ALL")
    .eq("market_board", "REGULAR")
    .eq("chart_type", "TYPE_CHART_VALUE")
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .order("date")
    .order("time", { ascending: false })
    .limit(50000);

  if (!data?.length) return [];

  const latest = new Map<string, DailyBrokerEntry>();
  for (const r of data as any[]) {
    const key = `${r.broker_code}|${r.date}`;
    if (!latest.has(key)) {
      latest.set(key, {
        broker_code: r.broker_code,
        date: r.date,
        net_value: parseFloat(r.value_raw) || 0,
      });
    }
  }
  return Array.from(latest.values());
}

async function fetchConcentrationHistory(symbol: string, limit = 60): Promise<ConcentrationSnapshot[]> {
  const { data } = await supabase
    .from("v_ba_accumulation")
    .select("date, buy_concentration, sell_concentration, accum_ratio, net_flow, total_buyers, total_sellers, top_buyer_code, top_buyer_share, buyer_participation")
    .eq("symbol", symbol)
    .eq("period", "1M")
    .eq("investor_type", "ALL")
    .eq("market_board", "REGULAR")
    .order("date", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];
  const out = (data as any[]).map((r) => ({
    date: r.date,
    buy_concentration: parseFloat(r.buy_concentration) || 0,
    sell_concentration: parseFloat(r.sell_concentration) || 0,
    accum_ratio: parseFloat(r.accum_ratio) || 0,
    net_flow: parseFloat(r.net_flow) || 0,
    total_buyers: parseInt(r.total_buyers) || 0,
    total_sellers: parseInt(r.total_sellers) || 0,
    top_buyer_code: r.top_buyer_code || "",
    top_buyer_share: parseFloat(r.top_buyer_share) || 0,
    buyer_participation: parseFloat(r.buyer_participation) || 0,
  }));
  return out.reverse();
}

async function fetchOHLCV(symbol: string, dateFrom: string, dateTo: string): Promise<OHLCVPoint[]> {
  const { data } = await supabase
    .from("idx_stock_summary")
    .select("date, open, high, low, close, volume, value, foreign_buy, foreign_sell")
    .eq("stock_code", symbol)
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .order("date")
    .limit(500);

  if (!data) return [];
  return data.map((r: any) => ({
    date: r.date,
    open: parseFloat(r.open) || 0,
    high: parseFloat(r.high) || 0,
    low: parseFloat(r.low) || 0,
    close: parseFloat(r.close) || 0,
    volume: parseFloat(r.volume) || 0,
    value: parseFloat(r.value) || 0,
    foreign_buy: parseFloat(r.foreign_buy) || 0,
    foreign_sell: parseFloat(r.foreign_sell) || 0,
  }));
}

// ── Computation: CADI ──────────────────────────────────────────────────────────

function computeCADI(brokerData: DailyBrokerEntry[], topN = 10): CADIPoint[] {
  const byBrokerDate = new Map<string, Map<string, number>>();
  for (const e of brokerData) {
    if (!byBrokerDate.has(e.broker_code)) byBrokerDate.set(e.broker_code, new Map());
    byBrokerDate.get(e.broker_code)!.set(e.date, e.net_value);
  }

  const dates = [...new Set(brokerData.map((e) => e.date))].sort();
  if (dates.length < 2) return [];

  const dailyChanges = new Map<string, Map<string, number>>();
  for (const [broker, dateMap] of byBrokerDate) {
    dailyChanges.set(broker, new Map());
    for (let i = 0; i < dates.length; i++) {
      const curr = dateMap.get(dates[i]) ?? 0;
      const prev = i > 0 ? (dateMap.get(dates[i - 1]) ?? 0) : 0;
      dailyChanges.get(broker)!.set(dates[i], curr - prev);
    }
  }

  let cumulative = 0;
  return dates.map((date) => {
    const brokerChanges: { code: string; change: number }[] = [];
    for (const [broker, changes] of dailyChanges) {
      const change = changes.get(date) ?? 0;
      if (change !== 0) brokerChanges.push({ code: broker, change });
    }

    brokerChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const top = brokerChanges.slice(0, topN);
    const dayNet = top.reduce((s, e) => s + e.change, 0);
    cumulative += dayNet;

    return {
      date,
      label: new Date(date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      cadi: cumulative,
      dailyNet: dayNet,
    };
  });
}

// ── Computation: Broker Persistence ────────────────────────────────────────────

function computePersistence(brokerData: DailyBrokerEntry[]): BrokerStreak[] {
  const dates = [...new Set(brokerData.map((e) => e.date))].sort();
  const totalDays = dates.length;
  if (totalDays < 3) return [];

  const byBroker = new Map<string, Map<string, number>>();
  for (const e of brokerData) {
    if (!byBroker.has(e.broker_code)) byBroker.set(e.broker_code, new Map());
    byBroker.get(e.broker_code)!.set(e.date, e.net_value);
  }

  const byBrokerChanges = new Map<string, Map<string, number>>();
  for (const [broker, dateMap] of byBroker) {
    byBrokerChanges.set(broker, new Map());
    for (let i = 0; i < dates.length; i++) {
      const curr = dateMap.get(dates[i]) ?? 0;
      const prev = i > 0 ? (dateMap.get(dates[i - 1]) ?? 0) : 0;
      byBrokerChanges.get(broker)!.set(dates[i], curr - prev);
    }
  }

  const results: BrokerStreak[] = [];
  for (const [broker, changes] of byBrokerChanges) {
    let maxBuyStreak = 0,
      maxSellStreak = 0;
    let curStreak = 0;
    let curDir: "buy" | "sell" = "buy";
    let daysActive = 0;

    for (const date of dates) {
      const val = changes.get(date) ?? 0;
      if (val === 0) {
        curStreak = 0;
        continue;
      }
      daysActive++;
      const dir = val > 0 ? "buy" : "sell";
      if (dir === curDir) {
        curStreak++;
      } else {
        curStreak = 1;
        curDir = dir;
      }
      if (dir === "buy") maxBuyStreak = Math.max(maxBuyStreak, curStreak);
      else maxSellStreak = Math.max(maxSellStreak, curStreak);
    }

    if (daysActive < 3) continue;
    results.push({
      broker_code: broker,
      days_active: daysActive,
      total_days: totalDays,
      max_streak: Math.max(maxBuyStreak, maxSellStreak),
      current_streak: curStreak,
      direction: curDir,
      activity_ratio: daysActive / totalDays,
    });
  }

  return results
    .sort((a, b) => b.current_streak - a.current_streak || b.max_streak - a.max_streak)
    .slice(0, 30);
}

// ── Computation: Wyckoff Phases ────────────────────────────────────────────────

function computeWyckoff(prices: OHLCVPoint[]): WyckoffPhase[] {
  if (prices.length < 20) return [];

  const windowSize = Math.min(30, Math.max(15, Math.floor(prices.length / 5)));
  const step = Math.max(1, Math.floor(windowSize / 3));
  const rawPhases: { start: number; end: number; phase: "ACC" | "MU" | "DIS" | "MD"; confidence: number }[] = [];

  for (let i = 0; i <= prices.length - windowSize; i += step) {
    const w = prices.slice(i, i + windowSize);
    const startP = w[0].close;
    const endP = w[w.length - 1].close;
    if (startP <= 0) continue;

    const pctChange = ((endP - startP) / startP) * 100;
    let totalAbsChange = 0;
    for (let j = 1; j < w.length; j++) totalAbsChange += Math.abs(w[j].close - w[j - 1].close);
    const er = totalAbsChange > 0 ? Math.abs(endP - startP) / totalAbsChange : 0;

    const halfLen = Math.floor(w.length / 2);
    const vol1 = w.slice(0, halfLen).reduce((s, p) => s + p.volume, 0) / halfLen;
    const vol2 = w.slice(halfLen).reduce((s, p) => s + p.volume, 0) / (w.length - halfLen);
    const volRatio = vol1 > 0 ? vol2 / vol1 : 1;

    let phase: "ACC" | "MU" | "DIS" | "MD";
    let confidence: number;

    if (er < 0.25) {
      const midPrice = (Math.max(...w.map((p) => p.high)) + Math.min(...w.map((p) => p.low))) / 2;
      if (endP <= midPrice) {
        phase = "ACC";
        confidence = clamp(0.35 + (1 - er) * 0.25 + (volRatio > 1 ? 0.15 : 0), 0.3, 0.85);
      } else {
        phase = "DIS";
        confidence = clamp(0.35 + (1 - er) * 0.25 + (volRatio > 1 ? 0.15 : 0), 0.3, 0.85);
      }
    } else if (pctChange > 2) {
      phase = "MU";
      confidence = clamp(0.35 + er * 0.45 + Math.min(pctChange / 30, 0.2), 0.3, 0.92);
    } else if (pctChange < -2) {
      phase = "MD";
      confidence = clamp(0.35 + er * 0.45 + Math.min(Math.abs(pctChange) / 30, 0.2), 0.3, 0.92);
    } else if (pctChange >= 0) {
      phase = "ACC";
      confidence = clamp(0.3 + er * 0.2, 0.3, 0.6);
    } else {
      phase = "DIS";
      confidence = clamp(0.3 + er * 0.2, 0.3, 0.6);
    }

    rawPhases.push({ start: i, end: i + windowSize - 1, phase, confidence });
  }

  if (rawPhases.length === 0) return [];

  const pointPhases = new Array(prices.length).fill(null) as (null | { phase: string; confidence: number; count: number })[];
  for (const rp of rawPhases) {
    for (let i = rp.start; i <= rp.end && i < prices.length; i++) {
      if (!pointPhases[i]) pointPhases[i] = { phase: rp.phase, confidence: rp.confidence, count: 1 };
      else {
        pointPhases[i]!.confidence = (pointPhases[i]!.confidence * pointPhases[i]!.count + rp.confidence) / (pointPhases[i]!.count + 1);
        pointPhases[i]!.phase = rp.phase;
        pointPhases[i]!.count++;
      }
    }
  }

  const merged: WyckoffPhase[] = [];
  let current: { phase: string; startIdx: number; confidences: number[] } | null = null;

  for (let i = 0; i < prices.length; i++) {
    const pp = pointPhases[i];
    if (!pp) continue;
    if (!current || current.phase !== pp.phase) {
      if (current) {
        const slice = prices.slice(current.startIdx, i);
        const avgConf = current.confidences.reduce((a, b) => a + b, 0) / current.confidences.length;
        const sp = prices[current.startIdx].close;
        merged.push({
          startDate: prices[current.startIdx].date,
          endDate: prices[i - 1].date,
          phase: current.phase as "ACC" | "MU" | "DIS" | "MD",
          confidence: avgConf,
          priceChange: sp > 0 ? ((prices[i - 1].close - sp) / sp) * 100 : 0,
          priceRange: [Math.min(...slice.map((p) => p.low)), Math.max(...slice.map((p) => p.high))],
          days: slice.length,
        });
      }
      current = { phase: pp.phase, startIdx: i, confidences: [pp.confidence] };
    } else {
      current.confidences.push(pp.confidence);
    }
  }

  if (current && current.startIdx < prices.length - 1) {
    const slice = prices.slice(current.startIdx);
    const avgConf = current.confidences.reduce((a, b) => a + b, 0) / current.confidences.length;
    const sp = prices[current.startIdx].close;
    merged.push({
      startDate: prices[current.startIdx].date,
      endDate: prices[prices.length - 1].date,
      phase: current.phase as "ACC" | "MU" | "DIS" | "MD",
      confidence: avgConf,
      priceChange: sp > 0 ? ((prices[prices.length - 1].close - sp) / sp) * 100 : 0,
      priceRange: [Math.min(...slice.map((p) => p.low)), Math.max(...slice.map((p) => p.high))],
      days: slice.length,
    });
  }

  return merged.filter((p) => p.days >= 5);
}

// ── Computation: Smart Money Tracker ───────────────────────────────────────────

function computeSMT(brokerData: DailyBrokerEntry[], prices: OHLCVPoint[]): SMTResult {
  const dates = [...new Set(brokerData.map((e) => e.date))].sort();
  if (dates.length < 5) return { score: 50, components: { freqVolDiv: 50, stealthAccum: 50, absorption: 50, concMomentum: 50, blockTrade: 50 } };

  const byDate = new Map<string, DailyBrokerEntry[]>();
  for (const e of brokerData) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }

  const priceMap = new Map<string, OHLCVPoint>();
  for (const p of prices) priceMap.set(p.date, p);

  // 1. Freq-Vol Divergence: low broker count + high total volume = institutional
  let freqVolScores: number[] = [];
  for (const date of dates) {
    const entries = byDate.get(date) || [];
    const activeBrokers = entries.filter((e) => e.net_value !== 0).length;
    const totalAbsVol = entries.reduce((s, e) => s + Math.abs(e.net_value), 0);
    const avgPerBroker = activeBrokers > 0 ? totalAbsVol / activeBrokers : 0;
    const medianEntries = entries.length;
    freqVolScores.push(activeBrokers > 0 && medianEntries > 0 ? clamp(avgPerBroker / (totalAbsVol / medianEntries + 1) * 50, 20, 80) : 50);
  }
  const freqVolDiv = avg(freqVolScores.slice(-10));

  // 2. Stealth Accumulation: consistent small positive daily changes from same brokers
  const brokerDailyChanges = new Map<string, number[]>();
  for (const date of dates) {
    const entries = byDate.get(date) || [];
    for (const e of entries) {
      if (!brokerDailyChanges.has(e.broker_code)) brokerDailyChanges.set(e.broker_code, []);
    }
  }
  const prevVals = new Map<string, number>();
  for (const date of dates) {
    const entries = byDate.get(date) || [];
    for (const e of entries) {
      const prev = prevVals.get(e.broker_code) ?? 0;
      const change = e.net_value - prev;
      brokerDailyChanges.get(e.broker_code)!.push(change);
      prevVals.set(e.broker_code, e.net_value);
    }
  }

  let stealthCount = 0;
  for (const [, changes] of brokerDailyChanges) {
    const positives = changes.filter((c) => c > 0);
    const consistency = positives.length / Math.max(changes.length, 1);
    const isSmall = positives.length > 0 && Math.max(...positives) < avg(positives.map(Math.abs)) * 3;
    if (consistency > 0.6 && isSmall && positives.length >= 3) stealthCount++;
  }
  const stealthAccum = clamp(30 + stealthCount * 8, 15, 90);

  // 3. Absorption: high volume days with low price movement
  let absorptionScores: number[] = [];
  for (const date of dates) {
    const p = priceMap.get(date);
    if (!p || p.close === 0) continue;
    const priceMove = Math.abs((p.close - p.open) / p.close) * 100;
    const entries = byDate.get(date) || [];
    const totalVol = entries.reduce((s, e) => s + Math.abs(e.net_value), 0);
    const avgVol = avg(dates.map((d) => (byDate.get(d) || []).reduce((s, e) => s + Math.abs(e.net_value), 0)));
    const volRelative = avgVol > 0 ? totalVol / avgVol : 1;
    if (volRelative > 1.2 && priceMove < 1.5) absorptionScores.push(70 + (volRelative - 1.2) * 20);
    else absorptionScores.push(40);
  }
  const absorption = clamp(avg(absorptionScores.slice(-10)), 15, 90);

  // 4. Concentration Momentum: is buying becoming more concentrated over time?
  const halfIdx = Math.floor(dates.length / 2);
  const firstHalfDates = dates.slice(0, halfIdx);
  const secondHalfDates = dates.slice(halfIdx);
  const calcHHI = (subset: string[]) => {
    const totals = new Map<string, number>();
    for (const d of subset) {
      for (const e of byDate.get(d) || []) {
        totals.set(e.broker_code, (totals.get(e.broker_code) || 0) + Math.max(e.net_value, 0));
      }
    }
    const totalBuy = [...totals.values()].reduce((s, v) => s + v, 0);
    if (totalBuy === 0) return 0;
    let hhi = 0;
    for (const v of totals.values()) {
      const share = v / totalBuy;
      hhi += share * share;
    }
    return hhi;
  };
  const hhi1 = calcHHI(firstHalfDates);
  const hhi2 = calcHHI(secondHalfDates);
  const concMomentum = clamp(50 + (hhi2 - hhi1) * 500, 15, 90);

  // 5. Block Trade: unusually large individual positions
  const brokerTotals = new Map<string, number>();
  for (const e of brokerData) {
    brokerTotals.set(e.broker_code, (brokerTotals.get(e.broker_code) || 0) + Math.abs(e.net_value));
  }
  const totalAbs = [...brokerTotals.values()].reduce((s, v) => s + v, 0);
  const avgBrokerVol = brokerTotals.size > 0 ? totalAbs / brokerTotals.size : 0;
  const maxBrokerVol = Math.max(...brokerTotals.values(), 0);
  const blockTrade = clamp(30 + (avgBrokerVol > 0 ? (maxBrokerVol / avgBrokerVol - 1) * 15 : 0), 15, 90);

  const score =
    freqVolDiv * 0.15 +
    stealthAccum * 0.2 +
    absorption * 0.2 +
    concMomentum * 0.2 +
    blockTrade * 0.25;

  return {
    score: clamp(Math.round(score), 0, 100),
    components: {
      freqVolDiv: Math.round(freqVolDiv),
      stealthAccum: Math.round(stealthAccum),
      absorption: Math.round(absorption),
      concMomentum: Math.round(concMomentum),
      blockTrade: Math.round(blockTrade),
    },
  };
}

// ── Computation: Divergence Detection ──────────────────────────────────────────

function computeDivergence(cadi: CADIPoint[], prices: OHLCVPoint[]): DivergenceResult {
  if (cadi.length < 5 || prices.length < 5) return { type: "none", strength: 0, priceTrend: "flat", flowTrend: "flat" };

  const recentCadi = cadi.slice(-15);
  const cadiStart = recentCadi[0].cadi;
  const cadiEnd = recentCadi[recentCadi.length - 1].cadi;
  const cadiPct = cadiStart !== 0 ? ((cadiEnd - cadiStart) / Math.abs(cadiStart)) * 100 : cadiEnd > 0 ? 100 : -100;

  const recentDates = new Set(recentCadi.map((c) => c.date));
  const recentPrices = prices.filter((p) => recentDates.has(p.date));
  if (recentPrices.length < 3) return { type: "none", strength: 0, priceTrend: "flat", flowTrend: "flat" };

  const priceStart = recentPrices[0].close;
  const priceEnd = recentPrices[recentPrices.length - 1].close;
  const pricePct = priceStart > 0 ? ((priceEnd - priceStart) / priceStart) * 100 : 0;

  const priceTrend = pricePct > 2 ? "up" : pricePct < -2 ? "down" : "flat";
  const flowTrend = cadiPct > 5 ? "up" : cadiPct < -5 ? "down" : "flat";

  if (priceTrend === "down" && flowTrend === "up") {
    return { type: "bullish", strength: clamp(Math.abs(cadiPct - pricePct) / 20, 0.2, 1), priceTrend, flowTrend };
  }
  if (priceTrend === "up" && flowTrend === "down") {
    return { type: "bearish", strength: clamp(Math.abs(cadiPct - pricePct) / 20, 0.2, 1), priceTrend, flowTrend };
  }
  return { type: "none", strength: 0, priceTrend, flowTrend };
}

// ── Computation: Flow-Price Correlation ────────────────────────────────────────

function computeCorrelation(cadi: CADIPoint[], prices: OHLCVPoint[]): CorrelationResult {
  if (cadi.length < 10 || prices.length < 10) return { rSquared: 0, rankIC: 0, badge: "Minimal" };

  const priceMap = new Map<string, number>();
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1].close > 0) {
      priceMap.set(prices[i].date, (prices[i].close - prices[i - 1].close) / prices[i - 1].close);
    }
  }

  const pairs: { flow: number; ret: number }[] = [];
  for (const c of cadi) {
    const ret = priceMap.get(c.date);
    if (ret !== undefined) pairs.push({ flow: c.dailyNet, ret });
  }

  if (pairs.length < 8) return { rSquared: 0, rankIC: 0, badge: "Minimal" };

  const flowMean = avg(pairs.map((p) => p.flow));
  const retMean = avg(pairs.map((p) => p.ret));
  let ssXY = 0, ssXX = 0, ssYY = 0;
  for (const p of pairs) {
    const dx = p.flow - flowMean;
    const dy = p.ret - retMean;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssYY += dy * dy;
  }

  const r = ssXX > 0 && ssYY > 0 ? ssXY / Math.sqrt(ssXX * ssYY) : 0;
  const rSquared = r * r;

  const flowRanks = rankArray(pairs.map((p) => p.flow));
  const retRanks = rankArray(pairs.map((p) => p.ret));
  const n = pairs.length;
  let d2sum = 0;
  for (let i = 0; i < n; i++) d2sum += (flowRanks[i] - retRanks[i]) ** 2;
  const rankIC = 1 - (6 * d2sum) / (n * (n * n - 1));

  const badge: CorrelationResult["badge"] =
    rSquared > 0.4 ? "Strong" : rSquared > 0.2 ? "Moderate" : rSquared > 0.08 ? "Weak" : "Minimal";

  return { rSquared: Math.round(rSquared * 100) / 100, rankIC: Math.round(rankIC * 100) / 100, badge };
}

// ── Computation: Verdict ───────────────────────────────────────────────────────

function computeVerdict(
  regime: StockRegime | null,
  concentration: ConcentrationSnapshot | null,
  cadi: CADIPoint[],
  smt: SMTResult,
  divergence: DivergenceResult,
  persistence: BrokerStreak[]
): VerdictResult {
  const factors: VerdictFactor[] = [];

  // 1. CADI Trend
  if (cadi.length >= 5) {
    const recent = cadi.slice(-10);
    const start = recent[0].cadi;
    const end = recent[recent.length - 1].cadi;
    const trend = end - start;
    const strength = clamp(Math.abs(trend) / (Math.abs(start) || 1) * 2, 0, 1);
    factors.push({
      name: "CADI Trend",
      direction: trend > 0 ? "bullish" : trend < 0 ? "bearish" : "neutral",
      strength,
    });
  }

  // 2. Smart Money Tracker
  factors.push({
    name: "Smart Money",
    direction: smt.score > 55 ? "bullish" : smt.score < 45 ? "bearish" : "neutral",
    strength: clamp(Math.abs(smt.score - 50) / 40, 0, 1),
  });

  // 3. Concentration Asymmetry
  if (concentration) {
    const buyConc = concentration.buy_concentration;
    const sellConc = concentration.sell_concentration;
    const diff = buyConc - sellConc;
    factors.push({
      name: "Concentration",
      direction: diff > 200 ? "bullish" : diff < -200 ? "bearish" : "neutral",
      strength: clamp(Math.abs(diff) / 2000, 0, 1),
    });
  }

  // 4. Accum Ratio
  if (concentration) {
    const ar = concentration.accum_ratio;
    factors.push({
      name: "Accum Ratio",
      direction: ar > 1.3 ? "bullish" : ar < 0.75 ? "bearish" : "neutral",
      strength: clamp(Math.abs(ar - 1) * 1.5, 0, 1),
    });
  }

  // 5. Foreign Flow
  if (regime) {
    factors.push({
      name: "Foreign Flow",
      direction: regime.foreign_flow_dir > 0.1 ? "bullish" : regime.foreign_flow_dir < -0.1 ? "bearish" : "neutral",
      strength: clamp(Math.abs(regime.foreign_flow_dir), 0, 1),
    });
  }

  // 6. Divergence
  if (divergence.type !== "none") {
    factors.push({
      name: "Divergence",
      direction: divergence.type === "bullish" ? "bullish" : "bearish",
      strength: divergence.strength,
    });
  }

  // 7. Broker Persistence
  const topBuyers = persistence.filter((p) => p.direction === "buy" && p.current_streak >= 3);
  const topSellers = persistence.filter((p) => p.direction === "sell" && p.current_streak >= 3);
  if (topBuyers.length > 0 || topSellers.length > 0) {
    const buyStr = topBuyers.reduce((s, p) => s + p.current_streak, 0);
    const sellStr = topSellers.reduce((s, p) => s + p.current_streak, 0);
    factors.push({
      name: "Persistence",
      direction: buyStr > sellStr ? "bullish" : sellStr > buyStr ? "bearish" : "neutral",
      strength: clamp(Math.abs(buyStr - sellStr) / 20, 0, 1),
    });
  }

  const bullishScore = factors.filter((f) => f.direction === "bullish").reduce((s, f) => s + f.strength, 0);
  const bearishScore = factors.filter((f) => f.direction === "bearish").reduce((s, f) => s + f.strength, 0);
  const totalStrength = bullishScore + bearishScore || 1;

  const netScore = (bullishScore - bearishScore) / totalStrength;
  const signal: VerdictResult["signal"] = netScore > 0.15 ? "ACCUMULATION" : netScore < -0.15 ? "DISTRIBUTION" : "NEUTRAL";

  const conviction = clamp(50 + Math.abs(netScore) * 45, 50, 95);

  return { signal, conviction: Math.round(conviction), factors };
}

// ── Master Analysis Function ───────────────────────────────────────────────────

export async function runFlowAnalysis(symbol: string): Promise<FlowAnalysis> {
  const today = new Date();
  const dateTo = today.toISOString().split("T")[0];
  const brokerFrom = new Date(today);
  brokerFrom.setDate(brokerFrom.getDate() - 120);
  const brokerDateFrom = brokerFrom.toISOString().split("T")[0];
  const priceFrom = new Date(today);
  priceFrom.setDate(priceFrom.getDate() - 400);
  const priceDateFrom = priceFrom.toISOString().split("T")[0];

  const [regime, concentration, concentrationHistory, brokerData, prices] = await Promise.all([
    fetchStockRegime(symbol),
    fetchConcentration(symbol),
    fetchConcentrationHistory(symbol),
    fetchDailyBrokerData(symbol, brokerDateFrom, dateTo),
    fetchOHLCV(symbol, priceDateFrom, dateTo),
  ]);

  const cadi = computeCADI(brokerData);
  const persistence = computePersistence(brokerData);
  const wyckoff = computeWyckoff(prices);
  const smt = computeSMT(brokerData, prices);
  const divergence = computeDivergence(cadi, prices);
  const correlation = computeCorrelation(cadi, prices);
  const verdict = computeVerdict(regime, concentration, cadi, smt, divergence, persistence);

  return { regime, concentration, concentrationHistory, cadi, wyckoff, persistence, smt, divergence, correlation, verdict, prices };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function rankArray(arr: number[]): number[] {
  const indexed = arr.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array(arr.length);
  indexed.forEach((item, rank) => {
    ranks[item.i] = rank + 1;
  });
  return ranks;
}
