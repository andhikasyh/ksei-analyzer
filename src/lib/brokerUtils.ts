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

let foreignBrokerCodesCache: string[] | null = null;

export async function fetchForeignBrokerCodes(): Promise<string[]> {
  if (foreignBrokerCodesCache) return foreignBrokerCodesCache;
  const { data } = await supabase
    .from("idx_brokers")
    .select("code")
    .eq("is_foreign", true);
  const codes = (data ?? []).map((r: { code: string }) => String(r.code));
  foreignBrokerCodesCache = codes;
  return codes;
}

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
  chartType: "TYPE_CHART_VALUE" | "TYPE_CHART_VOLUME",
  investorType: string = "ALL"
): Promise<BrokerFlowPoint[]> {
  if (brokerCodes.length === 0) return [];
  const queryInvestorType = investorType === "FOREIGN" ? "ALL" : investorType;
  let query = supabase
    .from("idx_broker_activity")
    .select("broker_code, date, time, datetime_label, value_raw")
    .eq("symbol", symbol)
    .eq("period", mapping.period)
    .eq("investor_type", queryInvestorType)
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

export interface AggregatedFlowPoint {
  date: string;
  label: string;
  buy: number;
  sell: number;
  net: number;
}

export async function fetchBrokerFlowAggregated(
  symbol: string,
  mapping: PeriodMapping,
  chartType: "TYPE_CHART_VALUE" | "TYPE_CHART_VOLUME",
  investorType: string = "ALL"
): Promise<AggregatedFlowPoint[]> {
  const topBrokers = await fetchTopBrokers(symbol, mapping, 30, investorType);
  if (topBrokers.length === 0) return [];

  const flow = await fetchBrokerFlow(symbol, mapping, topBrokers, chartType, investorType);
  if (flow.length === 0) return [];

  return flow.map((point) => {
    let buy = 0;
    let sell = 0;
    topBrokers.forEach((code) => {
      const v = Number((point as Record<string, number>)[code] ?? 0);
      if (v > 0) buy += v;
      else if (v < 0) sell += Math.abs(v);
    });
    return {
      date: point.date,
      label: point.label,
      buy,
      sell,
      net: buy - sell,
    };
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
  limit: number = 5,
  investorType: string = "ALL"
): Promise<string[]> {
  const queryInvestorType = investorType === "FOREIGN" ? "ALL" : investorType;
  const { data: dateCheck } = await supabase
    .from("idx_broker_activity")
    .select("date")
    .eq("symbol", symbol)
    .eq("period", mapping.period)
    .eq("investor_type", queryInvestorType)
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
    .eq("investor_type", queryInvestorType)
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

  let entries = Object.entries(brokerVals);
  if (investorType === "FOREIGN") {
    const foreignCodes = await fetchForeignBrokerCodes();
    const foreignSet = new Set(foreignCodes);
    entries = entries.filter(([code]) => foreignSet.has(code));
  }

  return entries
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([code]) => code);
}

export interface BrokerRankingsResult {
  rankings: BrokerPosition[];
  fallbackToAll?: boolean;
}

export async function fetchBrokerRankings(
  symbol: string,
  mapping: PeriodMapping,
  investorType: string = "ALL"
): Promise<BrokerRankingsResult> {
  const fromTableOrRaw = async (type: string): Promise<BrokerPosition[]> => {
    const rankingQuery = await supabase
      .from("idx_ba_stock_ranking")
      .select("date, broker_code, net_value, net_volume, value_share, rank")
      .eq("symbol", symbol)
      .eq("period", mapping.period)
      .eq("investor_type", type)
      .order("date", { ascending: false })
      .order("rank")
      .limit(500);

    if (rankingQuery.data && rankingQuery.data.length > 0) {
      const latestDate = (rankingQuery.data as any[])[0]?.date;
      const filtered = latestDate
        ? (rankingQuery.data as any[]).filter((r: any) => r.date === latestDate)
        : rankingQuery.data;

      if (filtered.length >= 2) {
        return filtered.map((r: any) => ({
          broker_code: r.broker_code,
          total_value: Math.abs(parseFloat(r.net_value) || 0),
          total_volume: Math.abs(parseFloat(r.net_volume) || 0),
          value_share: parseFloat(r.value_share) || 0,
          rank: r.rank,
        }));
      }
    }

    return fetchBrokerRankingsFromRaw(symbol, mapping, type);
  };

  const queryType = investorType === "FOREIGN" ? "ALL" : investorType;
  let rankings = await fromTableOrRaw(queryType);

  if (investorType === "FOREIGN" && rankings.length > 0) {
    const foreignCodes = await fetchForeignBrokerCodes();
    const foreignSet = new Set(foreignCodes);
    rankings = rankings.filter((r) => foreignSet.has(r.broker_code));
    const totalAbs = rankings.reduce((s, r) => s + r.total_value, 0);
    rankings = rankings
      .map((r) => ({
        ...r,
        value_share: totalAbs > 0 ? (r.total_value / totalAbs) * 100 : 0,
      }))
      .sort((a, b) => b.total_value - a.total_value)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }

  if (rankings.length > 0) {
    return { rankings };
  }

  if (investorType !== "ALL") {
    const allRankings = await fromTableOrRaw("ALL");
    if (allRankings.length > 0) {
      return { rankings: allRankings, fallbackToAll: true };
    }
  }

  return { rankings: [] };
}

async function fetchBrokerRankingsFromRaw(
  symbol: string,
  mapping: PeriodMapping,
  investorType: string
): Promise<BrokerPosition[]> {
  const baseQ = () =>
    supabase
      .from("idx_broker_activity")
      .select("date")
      .eq("symbol", symbol)
      .eq("period", mapping.period)
      .eq("investor_type", investorType)
      .eq("chart_type", "TYPE_CHART_VALUE")
      .order("date", { ascending: false })
      .limit(1);

  let dateCheck = (await baseQ().eq("market_board", "REGULAR")).data;
  if (!dateCheck || dateCheck.length === 0) dateCheck = (await baseQ()).data;
  if (!dateCheck || dateCheck.length === 0) return [];
  const latestDate = dateCheck[0].date;

  const baseFilter = { symbol, period: mapping.period, investor_type: investorType, date: latestDate };
  let valData: any[] = (
    await supabase
      .from("idx_broker_activity")
      .select("broker_code, value_raw, time")
      .eq("symbol", baseFilter.symbol)
      .eq("period", baseFilter.period)
      .eq("investor_type", baseFilter.investor_type)
      .eq("market_board", "REGULAR")
      .eq("chart_type", "TYPE_CHART_VALUE")
      .eq("date", baseFilter.date)
      .limit(5000)
  ).data ?? [];
  let volData: any[] = (
    await supabase
      .from("idx_broker_activity")
      .select("broker_code, value_raw, time")
      .eq("symbol", baseFilter.symbol)
      .eq("period", baseFilter.period)
      .eq("investor_type", baseFilter.investor_type)
      .eq("market_board", "REGULAR")
      .eq("chart_type", "TYPE_CHART_VOLUME")
      .eq("date", baseFilter.date)
      .limit(5000)
  ).data ?? [];

  if (valData.length === 0 && investorType !== "ALL") {
    valData = (
      await supabase
        .from("idx_broker_activity")
        .select("broker_code, value_raw, time")
        .eq("symbol", baseFilter.symbol)
        .eq("period", baseFilter.period)
        .eq("investor_type", baseFilter.investor_type)
        .eq("chart_type", "TYPE_CHART_VALUE")
        .eq("date", baseFilter.date)
        .limit(5000)
    ).data ?? [];
    volData = (
      await supabase
        .from("idx_broker_activity")
        .select("broker_code, value_raw, time")
        .eq("symbol", baseFilter.symbol)
        .eq("period", baseFilter.period)
        .eq("investor_type", baseFilter.investor_type)
        .eq("chart_type", "TYPE_CHART_VOLUME")
        .eq("date", baseFilter.date)
        .limit(5000)
    ).data ?? [];
  }

  const getLatest = (rows: any[]): Record<string, number> => {
    const map: Record<string, { v: number; t: string }> = {};
    rows.forEach((r: any) => {
      const k = r.broker_code as string;
      const t = (r.time as string) ?? "";
      if (!map[k] || t > map[k].t) map[k] = { v: parseFloat(r.value_raw) || 0, t };
    });
    const out: Record<string, number> = {};
    Object.entries(map).forEach(([k, v]) => { out[k] = v.v; });
    return out;
  };

  const values = getLatest(valData);
  const volumes = getLatest(volData);
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

export interface BrokerDistEntry {
  broker_code: string;
  net_value: number;
  net_volume: number;
  b_val: number;
  s_val: number;
  b_lot: number;
  s_lot: number;
  value_share: number;
}

export async function fetchBrokerDistribution(
  symbol: string,
  mapping: PeriodMapping,
  investorType: string = "ALL"
): Promise<BrokerDistEntry[]> {
  const queryInvestorType = investorType === "FOREIGN" ? "ALL" : investorType;

  const { data: summaryDates } = await supabase
    .from("idx_ba_daily_summary")
    .select("date")
    .eq("symbol", symbol)
    .eq("period", mapping.period)
    .eq("investor_type", queryInvestorType)
    .eq("market_board", "REGULAR")
    .order("date", { ascending: false })
    .limit(1);

  if (summaryDates?.length) {
    const latestDate = summaryDates[0].date;
    const { data: summaryRows } = await supabase
      .from("idx_ba_daily_summary")
      .select("broker_code, net_value, b_val, s_val, net_volume, b_lot, s_lot")
      .eq("symbol", symbol)
      .eq("period", mapping.period)
      .eq("investor_type", queryInvestorType)
      .eq("market_board", "REGULAR")
      .eq("date", latestDate)
      .limit(500);

    if (summaryRows?.length) {
      let entries: BrokerDistEntry[] = summaryRows.map((r: any) => ({
        broker_code: r.broker_code,
        net_value: parseFloat(r.net_value) || 0,
        net_volume: parseFloat(r.net_volume) || 0,
        b_val: parseFloat(r.b_val) || 0,
        s_val: parseFloat(r.s_val) || 0,
        b_lot: parseFloat(r.b_lot) || 0,
        s_lot: parseFloat(r.s_lot) || 0,
        value_share: 0,
      }));

      if (investorType === "FOREIGN") {
        const foreignCodes = await fetchForeignBrokerCodes();
        const foreignSet = new Set(foreignCodes);
        entries = entries.filter((e) => foreignSet.has(e.broker_code));
      }

      const totalAbs = entries.reduce((s, e) => s + Math.abs(e.net_value), 0);
      return entries
        .map((e) => ({
          ...e,
          value_share: totalAbs > 0 ? (Math.abs(e.net_value) / totalAbs) * 100 : 0,
        }))
        .sort((a, b) => Math.abs(b.net_value) - Math.abs(a.net_value));
    }
  }

  const { data: dateCheck } = await supabase
    .from("idx_broker_activity")
    .select("date")
    .eq("symbol", symbol)
    .eq("period", mapping.period)
    .eq("investor_type", queryInvestorType)
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
      .eq("investor_type", queryInvestorType)
      .eq("market_board", "REGULAR")
      .eq("chart_type", "TYPE_CHART_VALUE")
      .eq("date", latestDate)
      .limit(5000),
    supabase
      .from("idx_broker_activity")
      .select("broker_code, value_raw, time")
      .eq("symbol", symbol)
      .eq("period", mapping.period)
      .eq("investor_type", queryInvestorType)
      .eq("market_board", "REGULAR")
      .eq("chart_type", "TYPE_CHART_VOLUME")
      .eq("date", latestDate)
      .limit(5000),
  ]);

  const getLatest = (rows: any[]): Record<string, number> => {
    const map: Record<string, { v: number; t: string }> = {};
    rows.forEach((r: any) => {
      const k = r.broker_code as string;
      const t = (r.time as string) ?? "";
      if (!map[k] || t > map[k].t) map[k] = { v: parseFloat(r.value_raw) || 0, t };
    });
    const out: Record<string, number> = {};
    Object.entries(map).forEach(([k, v]) => { out[k] = v.v; });
    return out;
  };

  const values = getLatest(valRes.data || []);
  const volumes = getLatest(volRes.data || []);
  let entries = Object.entries(values).map(([code, netVal]) => {
    const netVol = volumes[code] || 0;
    return {
      broker_code: code,
      net_value: netVal,
      net_volume: netVol,
      b_val: Math.max(netVal, 0),
      s_val: Math.abs(Math.min(netVal, 0)),
      b_lot: Math.max(netVol, 0),
      s_lot: Math.abs(Math.min(netVol, 0)),
      value_share: 0,
    };
  });

  if (investorType === "FOREIGN") {
    const foreignCodes = await fetchForeignBrokerCodes();
    const foreignSet = new Set(foreignCodes);
    entries = entries.filter((e) => foreignSet.has(e.broker_code));
  }

  const totalAbs = entries.reduce((s, e) => s + Math.abs(e.net_value), 0);
  return entries
    .map((e) => ({
      ...e,
      value_share: totalAbs > 0 ? (Math.abs(e.net_value) / totalAbs) * 100 : 0,
    }))
    .sort((a, b) => Math.abs(b.net_value) - Math.abs(a.net_value));
}
