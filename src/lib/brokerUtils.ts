import { supabase } from "./supabase";

export type DateRange = "1D" | "1M" | "3M" | "6M" | "1Y" | "custom";

export interface PeriodMapping {
  period: string;
  dateFrom?: string;
  dateTo?: string;
}

export function mapDateRange(
  range: DateRange,
  customFrom?: string,
  customTo?: string
): PeriodMapping {
  const today = new Date().toISOString().split("T")[0];

  switch (range) {
    case "1D":
      return { period: "1D" };
    case "1M":
      return { period: "1M" };
    case "3M": {
      const from = new Date();
      from.setDate(from.getDate() - 90);
      return {
        period: "6M",
        dateFrom: from.toISOString().split("T")[0],
        dateTo: today,
      };
    }
    case "6M":
      return { period: "6M" };
    case "1Y":
      return { period: "1Y" };
    case "custom":
      if (customFrom && customTo) {
        const span =
          (new Date(customTo).getTime() - new Date(customFrom).getTime()) /
          (1000 * 60 * 60 * 24);
        if (span <= 1)
          return { period: "1D", dateFrom: customFrom, dateTo: customTo };
        if (span <= 30)
          return { period: "1M", dateFrom: customFrom, dateTo: customTo };
        if (span <= 180)
          return { period: "6M", dateFrom: customFrom, dateTo: customTo };
        return { period: "1Y", dateFrom: customFrom, dateTo: customTo };
      }
      return { period: "1M" };
    default:
      return { period: "1M" };
  }
}

export const BROKER_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

export interface BrokerFlowPoint {
  label: string;
  date: string;
  time: string;
  [brokerOrClose: string]: string | number;
}

export interface BrokerPosition {
  broker_code: string;
  total_value: number;
  total_volume: number;
  value_share: number;
  rank: number;
}

export interface BandarmologyEntry {
  symbol: string;
  hhi_score: number;
  active_brokers: number;
  total_value: number;
  top_broker_value: number;
  top_rank: number;
  date: string;
}

export async function fetchBrokerFlow(
  symbol: string,
  mapping: PeriodMapping,
  brokerCodes: string[],
  chartType: "TYPE_CHART_VALUE" | "TYPE_CHART_VOLUME"
): Promise<BrokerFlowPoint[]> {
  let query = supabase
    .from("idx_broker_activity")
    .select("broker_code, date, time, datetime_label, value_raw")
    .eq("symbol", symbol)
    .eq("period", mapping.period)
    .eq("investor_type", "ALL")
    .eq("market_board", "REGULAR")
    .eq("chart_type", chartType)
    .in("broker_code", brokerCodes)
    .order("date")
    .order("time")
    .limit(10000);

  if (mapping.dateFrom) query = query.gte("date", mapping.dateFrom);
  if (mapping.dateTo) query = query.lte("date", mapping.dateTo);

  const { data } = await query;
  if (!data || data.length === 0) return [];

  const isIntraday = mapping.period === "1D";
  const grouped: Record<string, Record<string, number>> = {};

  data.forEach((r: any) => {
    const key = isIntraday ? r.time : r.date;
    if (!grouped[key]) grouped[key] = {};
    grouped[key][r.broker_code] = parseFloat(r.value_raw) || 0;
  });

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, brokers]) => {
      const point: BrokerFlowPoint = {
        label: isIntraday
          ? key
          : new Date(key + "T00:00:00").toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
        date: isIntraday ? data[0]?.date || "" : key,
        time: isIntraday ? key : "00:00",
        ...brokers,
      };
      return point;
    });
}

export async function fetchClosingPrices(
  symbol: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ date: string; label: string; close: number }[]> {
  let query = supabase
    .from("idx_stock_summary")
    .select("date, close")
    .eq("stock_code", symbol)
    .order("date");

  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);

  const { data } = await query;
  if (!data) return [];

  return data.map((r: any) => ({
    date: r.date,
    label: new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
    close: parseFloat(r.close) || 0,
  }));
}

export async function fetchTopBrokers(
  symbol: string,
  mapping: PeriodMapping,
  limit: number = 5
): Promise<string[]> {
  const { data: dateCheck } = await supabase
    .from("idx_broker_activity")
    .select("date")
    .eq("symbol", symbol)
    .eq("period", mapping.period)
    .eq("investor_type", "ALL")
    .eq("market_board", "REGULAR")
    .eq("chart_type", "TYPE_CHART_VALUE")
    .order("date", { ascending: false })
    .limit(1);

  if (!dateCheck || dateCheck.length === 0) return [];
  const latestDate = dateCheck[0].date;

  const { data } = await supabase
    .from("idx_broker_activity")
    .select("broker_code, value_raw, time")
    .eq("symbol", symbol)
    .eq("period", mapping.period)
    .eq("investor_type", "ALL")
    .eq("market_board", "REGULAR")
    .eq("chart_type", "TYPE_CHART_VALUE")
    .eq("date", latestDate)
    .order("time", { ascending: false })
    .limit(5000);

  if (!data || data.length === 0) return [];

  const brokerVals: Record<string, number> = {};
  data.forEach((r: any) => {
    const bc = r.broker_code as string;
    if (!(bc in brokerVals)) {
      brokerVals[bc] = Math.abs(parseFloat(r.value_raw) || 0);
    }
  });

  return Object.entries(brokerVals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([code]) => code);
}

export async function fetchBrokerRankings(
  symbol: string,
  mapping: PeriodMapping,
  investorType: string = "ALL"
): Promise<BrokerPosition[]> {
  const rankingQuery = await supabase
    .from("idx_ba_stock_ranking")
    .select("date, broker_code, total_value, total_volume, value_share, rank")
    .eq("symbol", symbol)
    .eq("period", mapping.period)
    .eq("investor_type", investorType)
    .order("date", { ascending: false })
    .order("rank")
    .limit(500);

  if (rankingQuery.data && rankingQuery.data.length > 0) {
    const latestDate = (rankingQuery.data as any[])[0]?.date;
    const filtered = latestDate
      ? (rankingQuery.data as any[]).filter(
          (r: any) => r.date === latestDate
        )
      : rankingQuery.data;

    if (filtered.length >= 2) {
      return filtered.map((r: any) => ({
        broker_code: r.broker_code,
        total_value: parseFloat(r.total_value) || 0,
        total_volume: parseFloat(r.total_volume) || 0,
        value_share: parseFloat(r.value_share) || 0,
        rank: r.rank,
      }));
    }
  }

  return fetchBrokerRankingsFromRaw(symbol, mapping, investorType);
}

async function fetchBrokerRankingsFromRaw(
  symbol: string,
  mapping: PeriodMapping,
  investorType: string
): Promise<BrokerPosition[]> {
  const { data: dateCheck } = await supabase
    .from("idx_broker_activity")
    .select("date")
    .eq("symbol", symbol)
    .eq("period", mapping.period)
    .eq("investor_type", investorType)
    .eq("market_board", "REGULAR")
    .eq("chart_type", "TYPE_CHART_VALUE")
    .order("date", { ascending: false })
    .limit(1);

  if (!dateCheck || dateCheck.length === 0) return [];
  const latestDate = dateCheck[0].date;

  const [valRes, volRes] = await Promise.all([
    supabase
      .from("idx_broker_activity")
      .select("broker_code, value_raw, time")
      .eq("symbol", symbol)
      .eq("period", mapping.period)
      .eq("investor_type", investorType)
      .eq("market_board", "REGULAR")
      .eq("chart_type", "TYPE_CHART_VALUE")
      .eq("date", latestDate)
      .limit(5000),
    supabase
      .from("idx_broker_activity")
      .select("broker_code, value_raw, time")
      .eq("symbol", symbol)
      .eq("period", mapping.period)
      .eq("investor_type", investorType)
      .eq("market_board", "REGULAR")
      .eq("chart_type", "TYPE_CHART_VOLUME")
      .eq("date", latestDate)
      .limit(5000),
  ]);

  const getLatest = (
    rows: any[]
  ): Record<string, number> => {
    const map: Record<string, { v: number; t: string }> = {};
    rows.forEach((r: any) => {
      const k = r.broker_code as string;
      const t = r.time as string;
      if (!map[k] || t > map[k].t) map[k] = { v: parseFloat(r.value_raw) || 0, t };
    });
    const out: Record<string, number> = {};
    Object.entries(map).forEach(([k, v]) => { out[k] = v.v; });
    return out;
  };

  const values = getLatest(valRes.data || []);
  const volumes = getLatest(volRes.data || []);
  const totalAbs = Object.values(values).reduce(
    (s, v) => s + Math.abs(v),
    0
  );

  return Object.entries(values)
    .map(([code, val]) => ({
      broker_code: code,
      total_value: Math.abs(val),
      total_volume: Math.abs(volumes[code] || 0),
      value_share: totalAbs > 0 ? (Math.abs(val) / totalAbs) * 100 : 0,
      rank: 0,
    }))
    .sort((a, b) => b.total_value - a.total_value)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
