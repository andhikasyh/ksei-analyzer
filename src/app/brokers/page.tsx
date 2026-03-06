"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { IDXBroker, formatValue, formatShares } from "@/lib/types";
import {
  DateRange,
  mapDateRange,
  BROKER_COLORS,
  BrokerFlowPoint,
  BrokerPosition,
  BandarmologyEntry,
} from "@/lib/brokerUtils";
import { GlobalSearch } from "@/components/SearchInput";
import { StatsCard } from "@/components/StatsCard";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Collapse from "@mui/material/Collapse";
import LinearProgress from "@mui/material/LinearProgress";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import InsightsIcon from "@mui/icons-material/Insights";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

const LICENSE_LABELS: Record<string, { short: string; color: string }> = {
  "Penjamin Emisi Efek, Perantara Pedagang Efek": {
    short: "Underwriter + Broker",
    color: "#3b82f6",
  },
  "Perantara Pedagang Efek": {
    short: "Broker-Dealer",
    color: "#8b5cf6",
  },
  "Penjamin Emisi Efek": {
    short: "Underwriter",
    color: "#f59e0b",
  },
};

const PERIOD_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "1M", days: 30 },
  { label: "All", days: 0 },
];

const TREND_CONFIG = {
  surging: { label: "Surging", color: "#22c55e", icon: "up" },
  rising: { label: "Rising", color: "#34d399", icon: "up" },
  steady: { label: "Steady", color: "#94a3b8", icon: "none" },
  declining: { label: "Declining", color: "#f87171", icon: "down" },
} as const;

const BA_PERIOD_OPTS = [
  { label: "1D", value: "1D" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
];

function hhiIndicator(score: number): { label: string; color: string } {
  if (score >= 5000) return { label: "High", color: "#ef4444" };
  if (score >= 2500) return { label: "Concentrated", color: "#f59e0b" };
  if (score >= 1500) return { label: "Moderate", color: "#3b82f6" };
  return { label: "Dispersed", color: "#22c55e" };
}

interface BrokerRecord {
  date: string;
  broker_code: string;
  broker_name: string;
  volume: string;
  value: string;
  frequency: number;
}

interface BrokerAggregate {
  code: string;
  name: string;
  totalVolume: number;
  totalValue: number;
  totalFrequency: number;
  activeDays: number;
  avgValuePerDay: number;
  trend: keyof typeof TREND_CONFIG;
  peakValue: number;
  peakDate: string;
  dailyData: {
    date: string;
    displayDate: string;
    volume: number;
    value: number;
    frequency: number;
  }[];
}

interface DailyTotal {
  date: string;
  displayDate: string;
  totalVolume: number;
  totalValue: number;
  totalFrequency: number;
  activeBrokers: number;
}

type ActTickerBreakdown = {
  symbol: string;
  net_value: number;
  b_val: number;
  s_val: number;
  net_volume: number;
  b_lot: number;
  s_lot: number;
  b_avg: number;
  s_avg: number;
  value_share: number;
  rank: number;
};

export default function BrokersPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [tab, setTab] = useState(0);

  const [brokers, setBrokers] = useState<IDXBroker[]>([]);
  const [loadingBrokers, setLoadingBrokers] = useState(true);
  const [search, setSearch] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("All");

  const [records, setRecords] = useState<BrokerRecord[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [period, setPeriod] = useState(30);
  const [expandedBroker, setExpandedBroker] = useState<string | null>(null);

  const [actDateRange, setActDateRange] = useState<DateRange>("1M");
  const [actSelectedBroker, setActSelectedBroker] = useState("BK");
  const [actBrokerInput, setActBrokerInput] = useState("");
  const [actMetric, setActMetric] = useState<"value" | "volume">("value");
  const [actFlowData, setActFlowData] = useState<BrokerFlowPoint[]>([]);
  const [actAllTickers, setActAllTickers] = useState<string[]>([]);
  const [actVisibleTickers, setActVisibleTickers] = useState<string[]>([]);
  const [actAddTickerOpen, setActAddTickerOpen] = useState(false);
  const [actAddTickerInput, setActAddTickerInput] = useState("");
  const [actBuyRows, setActBuyRows] = useState<ActTickerBreakdown[]>([]);
  const [actSellRows, setActSellRows] = useState<ActTickerBreakdown[]>([]);
  const [loadingAct, setLoadingAct] = useState(false);

  const [baPeriod, setBaPeriod] = useState("1D");
  const [baView, setBaView] = useState<"leaderboard" | "lookup">("leaderboard");
  const [baLeaderboard, setBaLeaderboard] = useState<BandarmologyEntry[]>([]);
  const [loadingBA, setLoadingBA] = useState(false);
  const [brokerLookup, setBrokerLookup] = useState("");
  const [brokerLookupStocks, setBrokerLookupStocks] = useState<BrokerPosition[]>([]);
  const [loadingBrokerLookup, setLoadingBrokerLookup] = useState(false);
  const [brokerLookupCode, setBrokerLookupCode] = useState("");

  useEffect(() => {
    async function fetchBrokers() {
      const { data, error } = await supabase
        .from("idx_brokers")
        .select("code, name, license, is_foreign, created_at, updated_at")
        .order("name");
      if (!error && data) setBrokers(data as IDXBroker[]);
      setLoadingBrokers(false);
    }
    fetchBrokers();
  }, []);

  useEffect(() => {
    async function fetchActivity() {
      setLoadingActivity(true);
      let query = supabase
        .from("idx_broker_summary")
        .select("date, broker_code, broker_name, volume, value, frequency")
        .order("date", { ascending: true });

      if (period > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);
        query = query.gte("date", startDate.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (!error && data) setRecords(data as BrokerRecord[]);
      setLoadingActivity(false);
    }
    fetchActivity();
  }, [period]);

  const actMapping = useMemo(() => mapDateRange(actDateRange), [actDateRange]);
  const brokerOptions = useMemo(
    () => [...brokers].sort((a, b) => a.code.localeCompare(b.code)),
    [brokers]
  );

  const getBrokerMeta = (b: IDXBroker) => {
    const licenseMeta = LICENSE_LABELS[b.license] || {
      short: b.license || "Unknown",
      color: "#64748b",
    };
    const originMeta = b.is_foreign
      ? { label: "Foreign", color: "#38bdf8" }
      : { label: "Local", color: "#22c55e" };
    return { licenseMeta, originMeta };
  };

  useEffect(() => {
    if (tab !== 1 || !actSelectedBroker) return;
    let cancelled = false;
    async function loadAct() {
      setLoadingAct(true);
      let valueQuery = supabase
        .from("idx_broker_activity")
        .select("symbol, date, time, value_raw")
        .eq("broker_code", actSelectedBroker)
        .eq("period", actMapping.period)
        .eq("investor_type", "ALL")
        .eq("market_board", "REGULAR")
        .eq("chart_type", "TYPE_CHART_VALUE")
        .order("date")
        .order("time")
        .limit(50000);
      let volumeQuery = supabase
        .from("idx_broker_activity")
        .select("symbol, date, time, value_raw")
        .eq("broker_code", actSelectedBroker)
        .eq("period", actMapping.period)
        .eq("investor_type", "ALL")
        .eq("market_board", "REGULAR")
        .eq("chart_type", "TYPE_CHART_VOLUME")
        .order("date")
        .order("time")
        .limit(50000);

      if (actMapping.dateFrom) {
        valueQuery = valueQuery.gte("date", actMapping.dateFrom);
        volumeQuery = volumeQuery.gte("date", actMapping.dateFrom);
      }
      if (actMapping.dateTo) {
        valueQuery = valueQuery.lte("date", actMapping.dateTo);
        volumeQuery = volumeQuery.lte("date", actMapping.dateTo);
      }

      const [{ data: valueRows }, { data: volumeRows }] = await Promise.all([
        valueQuery,
        volumeQuery,
      ]);
      if (cancelled) return;

      if (!valueRows || valueRows.length === 0) {
        setActFlowData([]);
        setActAllTickers([]);
        setActVisibleTickers([]);
        setActAddTickerOpen(false);
        setActAddTickerInput("");
        setActBuyRows([]);
        setActSellRows([]);
        setLoadingAct(false);
        return;
      }

      const isIntraday = actMapping.period === "1D";
      const sourceValueRows = [...(valueRows as any[])];
      const sourceVolumeRows = [...((volumeRows || []) as any[])];

      if (isIntraday) {
        const latestDate =
          sourceValueRows.reduce(
            (latest, row) => (row.date > latest ? row.date : latest),
            sourceValueRows[0]?.date || ""
          ) || "";
        for (let i = sourceValueRows.length - 1; i >= 0; i -= 1) {
          if (sourceValueRows[i].date !== latestDate) sourceValueRows.splice(i, 1);
        }
        for (let i = sourceVolumeRows.length - 1; i >= 0; i -= 1) {
          if (sourceVolumeRows[i].date !== latestDate) sourceVolumeRows.splice(i, 1);
        }
      }

      const timelineSet = new Set<string>();
      sourceValueRows.forEach((r: any) => {
        timelineSet.add(isIntraday ? String(r.time || "") : String(r.date || ""));
      });
      const timeline = Array.from(timelineSet)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      const pointsMap: Record<string, BrokerFlowPoint> = {};
      timeline.forEach((key) => {
        pointsMap[key] = {
          label: isIntraday
            ? key
            : new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              }),
          date: isIntraday ? String(sourceValueRows[0]?.date || "") : key,
          time: isIntraday ? key : "00:00",
        };
      });

      const seriesRows =
        actMetric === "value" ? sourceValueRows : sourceVolumeRows;
      const latestSeriesByTicker: Record<string, number> = {};
      seriesRows.forEach((r: any) => {
        const symbol = String(r.symbol || "").toUpperCase();
        const key = isIntraday ? String(r.time || "") : String(r.date || "");
        if (!symbol || !key || !pointsMap[key]) return;
        const val = parseFloat(r.value_raw) || 0;
        pointsMap[key][symbol] = val;
        latestSeriesByTicker[symbol] = val;
      });

      const sortedTickers = Object.entries(latestSeriesByTicker)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([symbol]) => symbol);
      const defaultVisible = sortedTickers.slice(0, 6);

      const flowData = timeline.map((key) => pointsMap[key]);

      const latestVolumeByTicker: Record<string, number> = {};
      sourceVolumeRows.forEach((r: any) => {
        const symbol = String(r.symbol || "").toUpperCase();
        if (!symbol) return;
        latestVolumeByTicker[symbol] = parseFloat(r.value_raw) || 0;
      });

      const latestValueByTicker: Record<string, number> = {};
      sourceValueRows.forEach((r: any) => {
        const symbol = String(r.symbol || "").toUpperCase();
        if (!symbol) return;
        latestValueByTicker[symbol] = parseFloat(r.value_raw) || 0;
      });

      const totalAbs = Object.values(latestValueByTicker).reduce(
        (sum, v) => sum + Math.abs(v),
        0
      );
      const rows: ActTickerBreakdown[] = sortedTickers.map((symbol, idx) => {
        const netVal = latestValueByTicker[symbol] || 0;
        const netVol = latestVolumeByTicker[symbol] || 0;
        const bVal = Math.max(netVal, 0);
        const sVal = Math.abs(Math.min(netVal, 0));
        const bLot = Math.max(netVol, 0);
        const sLot = Math.abs(Math.min(netVol, 0));
        return {
          symbol,
          net_value: netVal,
          b_val: bVal,
          s_val: sVal,
          net_volume: netVol,
          b_lot: bLot,
          s_lot: sLot,
          b_avg: bLot > 0 ? bVal / bLot : 0,
          s_avg: sLot > 0 ? sVal / sLot : 0,
          value_share: totalAbs > 0 ? (Math.abs(netVal) / totalAbs) * 100 : 0,
          rank: idx + 1,
        };
      });

      const buyRows = rows
        .filter((r) => r.b_val > 0 || r.b_lot > 0)
        .sort((a, b) =>
          actMetric === "value" ? b.b_val - a.b_val : b.b_lot - a.b_lot
        )
        .slice(0, 20);
      const sellRows = rows
        .filter((r) => r.s_val > 0 || r.s_lot > 0)
        .sort((a, b) =>
          actMetric === "value" ? b.s_val - a.s_val : b.s_lot - a.s_lot
        )
        .slice(0, 20);

      setActFlowData(flowData);
      setActAllTickers(sortedTickers);
      setActVisibleTickers((prev) => {
        const stillValid = prev.filter((t) => sortedTickers.includes(t));
        return stillValid.length > 0 ? stillValid : defaultVisible;
      });
      setActAddTickerInput("");
      setActBuyRows(buyRows);
      setActSellRows(sellRows);
      if (!cancelled) setLoadingAct(false);
    }
    loadAct();
    return () => { cancelled = true; };
  }, [tab, actSelectedBroker, actMetric, actMapping]);

  useEffect(() => {
    if (tab !== 2) return;
    let cancelled = false;
    async function fetchBA() {
      setLoadingBA(true);
      setBrokerLookupStocks([]);
      setBrokerLookupCode("");
      const { data, error } = await supabase.rpc("get_bandarmology", {
        p_period: baPeriod,
        p_investor_type: "ALL",
      });
      if (cancelled) return;
      if (!error && data) {
        setBaLeaderboard(
          (data as BandarmologyEntry[]).sort(
            (a, b) => b.hhi_score - a.hhi_score
          )
        );
      } else {
        setBaLeaderboard([]);
      }
      setLoadingBA(false);
    }
    fetchBA();
    return () => { cancelled = true; };
  }, [tab, baPeriod]);

  async function handleBrokerLookup() {
    const code = brokerLookup.trim().toUpperCase();
    if (!code) return;
    setLoadingBrokerLookup(true);
    setBrokerLookupCode(code);
    const { data } = await supabase
      .from("idx_ba_broker_ranking")
      .select("*")
      .eq("broker_code", code)
      .eq("period", baPeriod)
      .eq("investor_type", "ALL")
      .order("date", { ascending: false })
      .order("rank")
      .limit(500);
    if (data && data.length > 0) {
      const latest = (data as any[])[0].date;
      const filtered = (data as any[]).filter((r) => r.date === latest);
      setBrokerLookupStocks(
        filtered.map((r: any) => ({
          broker_code: r.broker_code,
          net_value: parseFloat(r.net_value) || 0,
          b_val: parseFloat(r.b_val) || 0,
          s_val: parseFloat(r.s_val) || 0,
          net_volume: parseFloat(r.net_volume) || 0,
          b_lot: parseFloat(r.b_lot) || 0,
          s_lot: parseFloat(r.s_lot) || 0,
          b_avg: 0,
          s_avg: 0,
          value_share: parseFloat(r.value_share) || 0,
          rank: r.rank,
          symbol: r.symbol,
        })) as any
      );
    } else {
      setBrokerLookupStocks([]);
    }
    setLoadingBrokerLookup(false);
  }

  const baStats = useMemo(() => {
    if (baLeaderboard.length === 0) return null;
    const avgHHI =
      baLeaderboard.reduce((s, l) => s + l.hhi_score, 0) / baLeaderboard.length;
    const totalVal = baLeaderboard.reduce((s, l) => s + l.total_abs_value, 0);
    const top = baLeaderboard[0];
    return { avgHHI, totalVal, topSymbol: top.symbol, topHHI: top.hhi_score, stockCount: baLeaderboard.length };
  }, [baLeaderboard]);

  const brokerAggregates = useMemo<BrokerAggregate[]>(() => {
    const map: Record<
      string,
      {
        code: string;
        name: string;
        totalVolume: number;
        totalValue: number;
        totalFrequency: number;
        dailyMap: Record<
          string,
          { volume: number; value: number; frequency: number }
        >;
      }
    > = {};

    records.forEach((r) => {
      const key = r.broker_code;
      if (!map[key]) {
        map[key] = {
          code: key,
          name: r.broker_name,
          totalVolume: 0,
          totalValue: 0,
          totalFrequency: 0,
          dailyMap: {},
        };
      }
      const vol = parseFloat(r.volume) || 0;
      const val = parseFloat(r.value) || 0;
      const freq = r.frequency || 0;

      map[key].totalVolume += vol;
      map[key].totalValue += val;
      map[key].totalFrequency += freq;
      if (r.broker_name) map[key].name = r.broker_name;

      if (!map[key].dailyMap[r.date]) {
        map[key].dailyMap[r.date] = { volume: 0, value: 0, frequency: 0 };
      }
      map[key].dailyMap[r.date].volume += vol;
      map[key].dailyMap[r.date].value += val;
      map[key].dailyMap[r.date].frequency += freq;
    });

    return Object.values(map)
      .map((b) => {
        const dailyData = Object.entries(b.dailyMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, d]) => ({
            date,
            displayDate: new Date(date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            ...d,
          }));

        const activeDays = dailyData.length;
        const avgValuePerDay =
          activeDays > 0 ? b.totalValue / activeDays : 0;

        let trend: keyof typeof TREND_CONFIG = "steady";
        if (dailyData.length >= 3) {
          const recentDays = dailyData.slice(-3);
          const recentAvg =
            recentDays.reduce((s, d) => s + d.value, 0) / recentDays.length;
          const ratio = avgValuePerDay > 0 ? recentAvg / avgValuePerDay : 1;
          if (ratio > 1.5) trend = "surging";
          else if (ratio > 1.15) trend = "rising";
          else if (ratio < 0.7) trend = "declining";
        }

        let peakValue = 0;
        let peakDate = "";
        dailyData.forEach((d) => {
          if (d.value > peakValue) {
            peakValue = d.value;
            peakDate = d.displayDate;
          }
        });

        return {
          code: b.code,
          name: b.name,
          totalVolume: b.totalVolume,
          totalValue: b.totalValue,
          totalFrequency: b.totalFrequency,
          activeDays,
          avgValuePerDay,
          trend,
          peakValue,
          peakDate,
          dailyData,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [records]);

  const dailyTotals = useMemo<DailyTotal[]>(() => {
    const map: Record<
      string,
      {
        volume: number;
        value: number;
        frequency: number;
        brokers: Set<string>;
      }
    > = {};
    records.forEach((r) => {
      if (!map[r.date])
        map[r.date] = {
          volume: 0,
          value: 0,
          frequency: 0,
          brokers: new Set(),
        };
      map[r.date].volume += parseFloat(r.volume) || 0;
      map[r.date].value += parseFloat(r.value) || 0;
      map[r.date].frequency += r.frequency || 0;
      map[r.date].brokers.add(r.broker_code);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        displayDate: new Date(date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        totalVolume: d.volume,
        totalValue: d.value,
        totalFrequency: d.frequency,
        activeBrokers: d.brokers.size,
      }));
  }, [records]);

  const activityStats = useMemo(() => {
    const totalValue = dailyTotals.reduce((s, d) => s + d.totalValue, 0);
    const totalVolume = dailyTotals.reduce((s, d) => s + d.totalVolume, 0);
    const totalFreq = dailyTotals.reduce((s, d) => s + d.totalFrequency, 0);
    const activeBrokers = brokerAggregates.length;
    const tradingDays = dailyTotals.length;
    const avgDailyValue = tradingDays > 0 ? totalValue / tradingDays : 0;
    const top5Value = brokerAggregates
      .slice(0, 5)
      .reduce((s, b) => s + b.totalValue, 0);
    const top5Pct = totalValue > 0 ? (top5Value / totalValue) * 100 : 0;

    return {
      totalValue,
      totalVolume,
      totalFreq,
      activeBrokers,
      tradingDays,
      avgDailyValue,
      top5Pct,
    };
  }, [dailyTotals, brokerAggregates]);

  const licenseTypes = useMemo(() => {
    const s = new Set(brokers.map((b) => b.license).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [brokers]);

  const filtered = useMemo(() => {
    let result = brokers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.code.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q)
      );
    }
    if (licenseFilter !== "All") {
      result = result.filter((b) => b.license === licenseFilter);
    }
    return result;
  }, [brokers, search, licenseFilter]);

  const dirStats = useMemo(() => {
    const byLicense: Record<string, number> = {};
    brokers.forEach((b) => {
      byLicense[b.license] = (byLicense[b.license] || 0) + 1;
    });
    return {
      total: brokers.length,
      underwriterBroker:
        byLicense["Penjamin Emisi Efek, Perantara Pedagang Efek"] || 0,
      brokerOnly: byLicense["Perantara Pedagang Efek"] || 0,
    };
  }, [brokers]);

  const textColor = isDark ? "#6b7fa3" : "#546280";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tooltipStyle = {
    background: isDark ? "#111b30" : "#fff",
    border: `1px solid ${isDark ? "rgba(107,127,163,0.15)" : "#e4e4e7"}`,
    borderRadius: "8px",
    fontSize: "12px",
    color: isDark ? "#e8edf5" : "#0c1222",
  };

  const maxBrokerValue =
    brokerAggregates.length > 0 ? brokerAggregates[0].totalValue : 1;

  const isLoading =
    tab === 0
      ? loadingActivity && records.length === 0
      : tab === 3
        ? loadingBrokers && brokers.length === 0
        : false;

  if (isLoading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3 }} />
        <Skeleton
          variant="rounded"
          height={40}
          sx={{ borderRadius: 3, maxWidth: 320 }}
        />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid size={{ xs: 6, md: 3 }} key={i}>
              <Skeleton
                variant="rounded"
                height={80}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={2}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Grid size={{ xs: 12, lg: 6 }} key={i}>
              <Skeleton
                variant="rounded"
                height={260}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <GlobalSearch compact />

      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/")}
        size="small"
        sx={{ alignSelf: "flex-start", minWidth: "auto" }}
      >
        Dashboard
      </Button>

      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Broker Intelligence
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.25 }}
        >
          Market activity analytics and broker directory for IDX
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          minHeight: 36,
          "& .MuiTab-root": {
            minHeight: 36,
            py: 0.5,
            px: 2,
            fontSize: "0.8rem",
            fontWeight: 600,
            textTransform: "none",
            borderRadius: 2,
            mr: 1,
          },
          "& .MuiTabs-indicator": {
            height: 2,
            borderRadius: 1,
          },
        }}
      >
        <Tab
          icon={<EqualizerIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label="Market Activity"
        />
        <Tab
          icon={<ShowChartIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label="Broker Activity"
        />
        <Tab
          icon={<InsightsIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label="Bandarmology"
        />
        <Tab
          icon={<StorefrontIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label="Directory"
        />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={2.5} className="animate-in">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, mr: 0.5 }}
            >
              Period
            </Typography>
            {PERIOD_OPTIONS.map((opt) => (
              <Chip
                key={opt.days}
                label={opt.label}
                size="small"
                onClick={() => setPeriod(opt.days)}
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  height: 26,
                  cursor: "pointer",
                  bgcolor:
                    period === opt.days
                      ? isDark
                        ? "rgba(212,168,67,0.15)"
                        : "rgba(161,124,47,0.1)"
                      : "transparent",
                  color:
                    period === opt.days ? "primary.main" : "text.secondary",
                  border: "1px solid",
                  borderColor:
                    period === opt.days ? "primary.main" : "transparent",
                  "&:hover": {
                    bgcolor: isDark
                      ? "rgba(212,168,67,0.1)"
                      : "rgba(161,124,47,0.06)",
                  },
                }}
              />
            ))}
            {loadingActivity && (
              <Chip
                label="Loading..."
                size="small"
                sx={{ fontSize: "0.65rem", height: 22, opacity: 0.5 }}
              />
            )}
          </Stack>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }} className="animate-in animate-in-delay-1">
              <StatsCard
                title="Total Value"
                value={formatValue(activityStats.totalValue)}
                subtitle={`${activityStats.tradingDays} trading days`}
                icon={<ShowChartIcon />}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }} className="animate-in animate-in-delay-2">
              <StatsCard
                title="Total Volume"
                value={formatShares(activityStats.totalVolume)}
                subtitle={`${formatShares(activityStats.totalFreq)} txns`}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }} className="animate-in animate-in-delay-3">
              <StatsCard
                title="Active Brokers"
                value={activityStats.activeBrokers}
                subtitle={`Top 5: ${activityStats.top5Pct.toFixed(1)}% share`}
                icon={<StorefrontIcon />}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }} className="animate-in animate-in-delay-4">
              <StatsCard
                title="Avg Daily Value"
                value={formatValue(activityStats.avgDailyValue)}
                subtitle="Per trading day"
                icon={<EqualizerIcon />}
              />
            </Grid>
          </Grid>

          {brokerAggregates.length >= 5 && (
            <ConcentrationTreemap
              brokerAggregates={brokerAggregates}
              totalValue={activityStats.totalValue}
              top5Pct={activityStats.top5Pct}
              isDark={isDark}
              onBrokerClick={(code) => {
                const el = document.getElementById("broker-table");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            />
          )}

          {dailyTotals.length > 1 && (
            <Grid container spacing={2}>
              <Grid
                size={{ xs: 12, lg: 6 }}
                className="animate-in animate-in-delay-5"
              >
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500,
                      mb: 1.5,
                      display: "block",
                    }}
                  >
                    Daily Market Value (IDR)
                  </Typography>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={dailyTotals}>
                      <defs>
                        <linearGradient
                          id="valueGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#d4a843"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#d4a843"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={gridColor}
                      />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fill: textColor, fontSize: 9 }}
                      />
                      <YAxis
                        tick={{ fill: textColor, fontSize: 10 }}
                        tickFormatter={(v) => formatValue(v)}
                      />
                      <RechartsTooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number) => [formatValue(v), "Value"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalValue"
                        stroke="#d4a843"
                        fill="url(#valueGrad)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid
                size={{ xs: 12, lg: 6 }}
                className="animate-in animate-in-delay-6"
              >
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500,
                      mb: 1.5,
                      display: "block",
                    }}
                  >
                    Daily Market Volume
                  </Typography>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dailyTotals}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={gridColor}
                      />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fill: textColor, fontSize: 9 }}
                      />
                      <YAxis
                        tick={{ fill: textColor, fontSize: 10 }}
                        tickFormatter={(v) => formatShares(v)}
                      />
                      <RechartsTooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number) => [formatShares(v), "Volume"]}
                      />
                      <Bar
                        dataKey="totalVolume"
                        fill="#34d399"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          )}

          <Paper
            sx={{ p: 2.5, borderRadius: 3 }}
            className="animate-in animate-in-delay-7"
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
                mb: 2,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Broker Leaderboard
                </Typography>
                <Chip
                  label={`${brokerAggregates.length} brokers`}
                  size="small"
                  sx={{
                    fontSize: "0.65rem",
                    height: 20,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Ranked by total trading value - click to expand
              </Typography>
            </Box>

            <TableContainer sx={{ maxHeight: 620 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 32 }}>#</TableCell>
                    <TableCell sx={{ width: 28, p: 0.5 }} />
                    <TableCell>Broker</TableCell>
                    <TableCell align="right">Total Value</TableCell>
                    <TableCell
                      align="right"
                      sx={{ display: { xs: "none", md: "table-cell" } }}
                    >
                      Volume
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ display: { xs: "none", sm: "table-cell" } }}
                    >
                      Freq
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ display: { xs: "none", md: "table-cell" } }}
                    >
                      Days
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ display: { xs: "none", lg: "table-cell" } }}
                    >
                      Trend
                    </TableCell>
                    <TableCell sx={{ minWidth: 110 }}>Share</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {brokerAggregates.map((broker, i) => {
                    const sharePct =
                      activityStats.totalValue > 0
                        ? (broker.totalValue / activityStats.totalValue) * 100
                        : 0;
                    const barPct =
                      maxBrokerValue > 0
                        ? (broker.totalValue / maxBrokerValue) * 100
                        : 0;
                    const isExpanded = expandedBroker === broker.code;
                    const trendCfg = TREND_CONFIG[broker.trend];

                    return (
                      <Fragment key={broker.code}>
                        <TableRow
                          onClick={() =>
                            setExpandedBroker(
                              isExpanded ? null : broker.code
                            )
                          }
                          sx={{
                            cursor: "pointer",
                            "&:hover": {
                              bgcolor: isDark
                                ? "rgba(212,168,67,0.04)"
                                : "rgba(161,124,47,0.02)",
                            },
                            ...(isExpanded && {
                              bgcolor: isDark
                                ? "rgba(212,168,67,0.06)"
                                : "rgba(161,124,47,0.03)",
                            }),
                            ...(i < 3 && {
                              borderLeft: `3px solid ${
                                i === 0
                                  ? "#d4a843"
                                  : i === 1
                                    ? "#e8c468"
                                    : "#f0d68a"
                              }`,
                            }),
                          }}
                        >
                          <TableCell>
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                color:
                                  i < 3 ? "primary.main" : "text.secondary",
                                fontWeight: i < 3 ? 700 : 400,
                              }}
                            >
                              {i + 1}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ p: 0.5 }}>
                            {isExpanded ? (
                              <KeyboardArrowUpIcon
                                sx={{ fontSize: 16, color: "text.secondary" }}
                              />
                            ) : (
                              <KeyboardArrowDownIcon
                                sx={{ fontSize: 16, color: "text.secondary" }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Tooltip
                              title={broker.name}
                              placement="top"
                              arrow
                            >
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: "0.8rem",
                                    color: "primary.main",
                                  }}
                                >
                                  {broker.code}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    fontSize: "0.65rem",
                                    display: "block",
                                    maxWidth: 180,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {broker.name}
                                </Typography>
                              </Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 600,
                              }}
                            >
                              {formatValue(broker.totalValue)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              display: { xs: "none", md: "table-cell" },
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              {formatShares(broker.totalVolume)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              display: { xs: "none", sm: "table-cell" },
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              {broker.totalFrequency.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              display: { xs: "none", md: "table-cell" },
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                color: "text.secondary",
                              }}
                            >
                              {broker.activeDays}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              display: { xs: "none", lg: "table-cell" },
                            }}
                          >
                            <Chip
                              icon={
                                trendCfg.icon === "up" ? (
                                  <TrendingUpIcon sx={{ fontSize: 12 }} />
                                ) : trendCfg.icon === "down" ? (
                                  <TrendingDownIcon sx={{ fontSize: 12 }} />
                                ) : undefined
                              }
                              label={trendCfg.label}
                              size="small"
                              sx={{
                                fontSize: "0.6rem",
                                height: 20,
                                bgcolor: `${trendCfg.color}18`,
                                color: trendCfg.color,
                                fontWeight: 600,
                                "& .MuiChip-icon": {
                                  color: trendCfg.color,
                                  fontSize: 12,
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Box sx={{ flex: 1, minWidth: 50 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={barPct}
                                  sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: isDark
                                      ? "rgba(255,255,255,0.06)"
                                      : "rgba(0,0,0,0.06)",
                                    "& .MuiLinearProgress-bar": {
                                      borderRadius: 3,
                                      bgcolor:
                                        i < 3
                                          ? "#d4a843"
                                          : i < 10
                                            ? "#e8c468"
                                            : isDark
                                              ? "rgba(255,255,255,0.2)"
                                              : "rgba(0,0,0,0.15)",
                                    },
                                  }}
                                />
                              </Box>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  color: "text.secondary",
                                  minWidth: 38,
                                  textAlign: "right",
                                  fontSize: "0.6rem",
                                }}
                              >
                                {sharePct.toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell
                            colSpan={9}
                            sx={{ p: 0, borderBottom: isExpanded ? undefined : 0 }}
                          >
                            <Collapse
                              in={isExpanded}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Box
                                sx={{
                                  px: 3,
                                  py: 2.5,
                                  bgcolor: isDark
                                    ? "rgba(212,168,67,0.03)"
                                    : "rgba(161,124,47,0.015)",
                                }}
                              >
                                <Grid container spacing={2.5}>
                                  <Grid size={{ xs: 12, sm: 4 }}>
                                    <Stack spacing={2}>
                                      <Box>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{
                                            fontSize: "0.6rem",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                          }}
                                        >
                                          Avg Value / Day
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 700,
                                            fontFamily:
                                              '"JetBrains Mono", monospace',
                                            mt: 0.25,
                                          }}
                                        >
                                          {formatValue(broker.avgValuePerDay)}
                                        </Typography>
                                      </Box>
                                      <Box>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{
                                            fontSize: "0.6rem",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                          }}
                                        >
                                          Peak Day
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 700,
                                            fontFamily:
                                              '"JetBrains Mono", monospace',
                                            mt: 0.25,
                                          }}
                                        >
                                          {formatValue(broker.peakValue)}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ fontSize: "0.6rem" }}
                                        >
                                          on {broker.peakDate}
                                        </Typography>
                                      </Box>
                                      <Box>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{
                                            fontSize: "0.6rem",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                          }}
                                        >
                                          Avg Freq / Day
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 700,
                                            fontFamily:
                                              '"JetBrains Mono", monospace',
                                            mt: 0.25,
                                          }}
                                        >
                                          {broker.activeDays > 0
                                            ? Math.round(
                                                broker.totalFrequency /
                                                  broker.activeDays
                                              ).toLocaleString()
                                            : "0"}
                                        </Typography>
                                      </Box>
                                    </Stack>
                                  </Grid>

                                  <Grid size={{ xs: 12, sm: 8 }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        fontSize: "0.6rem",
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        mb: 1,
                                        display: "block",
                                      }}
                                    >
                                      Daily Trading Value
                                    </Typography>
                                    {broker.dailyData.length > 1 ? (
                                      <ResponsiveContainer
                                        width="100%"
                                        height={160}
                                      >
                                        <AreaChart data={broker.dailyData}>
                                          <defs>
                                            <linearGradient
                                              id={`grad-${broker.code}`}
                                              x1="0"
                                              y1="0"
                                              x2="0"
                                              y2="1"
                                            >
                                              <stop
                                                offset="5%"
                                                stopColor="#3b82f6"
                                                stopOpacity={0.25}
                                              />
                                              <stop
                                                offset="95%"
                                                stopColor="#3b82f6"
                                                stopOpacity={0}
                                              />
                                            </linearGradient>
                                          </defs>
                                          <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={gridColor}
                                          />
                                          <XAxis
                                            dataKey="displayDate"
                                            tick={{
                                              fill: textColor,
                                              fontSize: 8,
                                            }}
                                          />
                                          <YAxis
                                            tick={{
                                              fill: textColor,
                                              fontSize: 9,
                                            }}
                                            tickFormatter={(v) =>
                                              formatValue(v)
                                            }
                                            width={55}
                                          />
                                          <RechartsTooltip
                                            contentStyle={tooltipStyle}
                                            formatter={(v: number) => [
                                              formatValue(v),
                                              "Value",
                                            ]}
                                          />
                                          <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#3b82f6"
                                            fill={`url(#grad-${broker.code})`}
                                            strokeWidth={2}
                                          />
                                        </AreaChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          height: 160,
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Not enough data points for chart
                                        </Typography>
                                      </Box>
                                    )}
                                  </Grid>
                                </Grid>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {brokerAggregates.length === 0 && !loadingActivity && (
              <Box sx={{ py: 5, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No broker activity data found for this period
                </Typography>
              </Box>
            )}
          </Paper>
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={2.5} className="animate-in">
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.4 }}>
              Broker Activity Controls
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", display: "block", mb: 1.6 }}
            >
              Pilih satu broker untuk melihat buy/sell ticker pada timeframe
              yang dipilih.
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1.2 }}
            >
              <Autocomplete
                size="small"
                options={brokerOptions}
                value={
                  brokerOptions.find((b) => b.code === actSelectedBroker) || null
                }
                inputValue={actBrokerInput}
                onInputChange={(_, v) => setActBrokerInput(v.toUpperCase())}
                onChange={(_, selected) => {
                  if (!selected) return;
                  const c = selected.code.toUpperCase();
                  setActSelectedBroker(c);
                  setActBrokerInput("");
                }}
                getOptionLabel={(o) => `${o.code} - ${o.name}`}
                isOptionEqualToValue={(a, b) => a.code === b.code}
                sx={{
                  width: { xs: "100%", sm: 380 },
                  "& .MuiOutlinedInput-root": { borderRadius: 2, minHeight: 38 },
                }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  const { licenseMeta, originMeta } = getBrokerMeta(option);
                  return (
                    <Box key={key} component="li" {...optionProps} sx={{ py: 0.8 }}>
                      <Stack
                        direction="row"
                        spacing={0.8}
                        alignItems="center"
                        sx={{ width: "100%" }}
                      >
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 800,
                            fontSize: "0.73rem",
                            color: "primary.main",
                            minWidth: 36,
                          }}
                        >
                          {option.code}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.72rem",
                            color: "text.primary",
                            flex: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {option.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={originMeta.label}
                          sx={{
                            height: 18,
                            fontSize: "0.58rem",
                            fontWeight: 700,
                            color: originMeta.color,
                            border: "1px solid",
                            borderColor: `${originMeta.color}66`,
                            bgcolor: `${originMeta.color}1A`,
                          }}
                        />
                        <Chip
                          size="small"
                          label={licenseMeta.short}
                          sx={{
                            height: 18,
                            fontSize: "0.56rem",
                            fontWeight: 700,
                            color: licenseMeta.color,
                            border: "1px solid",
                            borderColor: `${licenseMeta.color}66`,
                            bgcolor: `${licenseMeta.color}1A`,
                          }}
                        />
                      </Stack>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select broker code..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                color: "text.secondary",
                                fontSize: "0.62rem",
                              }}
                            >
                              BR
                            </Typography>
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Stack>
            <Stack
              direction="row"
              spacing={0.8}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1.2 }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 700,
                  mr: 0.4,
                  fontSize: "0.68rem",
                }}
              >
                RANGE
              </Typography>
              {(["1D", "1M", "3M", "6M", "1Y"] as DateRange[]).map((r) => (
                <Chip
                  key={r}
                  label={r}
                  size="small"
                  onClick={() => setActDateRange(r)}
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 700,
                    fontSize: "0.69rem",
                    height: 28,
                    px: 0.2,
                    cursor: "pointer",
                    bgcolor:
                      actDateRange === r
                        ? isDark
                          ? "rgba(212,168,67,0.18)"
                          : "rgba(161,124,47,0.11)"
                        : "transparent",
                    color: actDateRange === r ? "primary.main" : "text.secondary",
                    border: "1px solid",
                    borderColor: actDateRange === r ? "primary.main" : "transparent",
                  }}
                />
              ))}
              <Box sx={{ mx: 0.35, height: 16, width: 1, bgcolor: "divider" }} />
              <Chip
                label="Value"
                size="small"
                onClick={() => setActMetric("value")}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.67rem",
                  height: 26,
                  cursor: "pointer",
                  bgcolor:
                    actMetric === "value"
                      ? isDark
                        ? "rgba(59,130,246,0.14)"
                        : "rgba(59,130,246,0.09)"
                      : "transparent",
                  color: actMetric === "value" ? "#3b82f6" : "text.secondary",
                  border: "1px solid",
                  borderColor: actMetric === "value" ? "#3b82f6" : "transparent",
                }}
              />
              <Chip
                label="Volume"
                size="small"
                onClick={() => setActMetric("volume")}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.67rem",
                  height: 26,
                  cursor: "pointer",
                  bgcolor:
                    actMetric === "volume"
                      ? isDark
                        ? "rgba(34,197,94,0.14)"
                        : "rgba(34,197,94,0.09)"
                      : "transparent",
                  color: actMetric === "volume" ? "#22c55e" : "text.secondary",
                  border: "1px solid",
                  borderColor: actMetric === "volume" ? "#22c55e" : "transparent",
                }}
              />
            </Stack>
            {actSelectedBroker && (
              <Chip
                size="small"
                label={`Broker ${actSelectedBroker}`}
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 800,
                  fontSize: "0.69rem",
                  height: 26,
                  bgcolor: `${BROKER_COLORS[0]}20`,
                  color: BROKER_COLORS[0],
                  border: "1px solid",
                  borderColor: BROKER_COLORS[0],
                }}
              />
            )}
          </Paper>

          {!actSelectedBroker ? (
            <Paper sx={{ p: 5, borderRadius: 3, textAlign: "center" }}>
              <Typography color="text.secondary">
                Select a broker to view buy/sell ticker activity
              </Typography>
            </Paper>
          ) : (
            <>
              {actAllTickers.length > 0 && (
                <Paper sx={{ p: 2, borderRadius: 3 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mb: 1,
                      color: "text.secondary",
                      fontWeight: 700,
                      fontSize: "0.68rem",
                    }}
                  >
                    SELECTED TICKERS
                  </Typography>
                  <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mb: actAddTickerOpen ? 1 : 0 }}>
                    {actVisibleTickers.map((ticker, idx) => {
                      return (
                        <Chip
                          key={ticker}
                          size="small"
                          label={ticker}
                          onDelete={() =>
                            setActVisibleTickers((prev) =>
                              prev.filter((t) => t !== ticker)
                            )
                          }
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 700,
                            fontSize: "0.67rem",
                            height: 24,
                            border: "1px solid",
                            borderColor: BROKER_COLORS[idx % BROKER_COLORS.length],
                            color: BROKER_COLORS[idx % BROKER_COLORS.length],
                            bgcolor: `${BROKER_COLORS[idx % BROKER_COLORS.length]}1A`,
                            "& .MuiChip-deleteIcon": {
                              color: BROKER_COLORS[idx % BROKER_COLORS.length],
                            },
                          }}
                        />
                      );
                    })}
                    <Chip
                      size="small"
                      label="+"
                      onClick={() => setActAddTickerOpen((v) => !v)}
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        height: 24,
                        minWidth: 28,
                        border: "1px dashed",
                        borderColor: "divider",
                        color: "text.secondary",
                        bgcolor: "transparent",
                      }}
                    />
                  </Stack>
                  {actAddTickerOpen && (
                    <Autocomplete
                      size="small"
                      options={actAllTickers.filter(
                        (ticker) => !actVisibleTickers.includes(ticker)
                      )}
                      inputValue={actAddTickerInput}
                      onInputChange={(_, v) => setActAddTickerInput(v.toUpperCase())}
                      onChange={(_, selected) => {
                        if (!selected) return;
                        setActVisibleTickers((prev) =>
                          prev.includes(selected)
                            ? prev
                            : [...prev, selected].slice(-10)
                        );
                        setActAddTickerInput("");
                        setActAddTickerOpen(false);
                      }}
                      sx={{
                        width: { xs: "100%", sm: 260 },
                        "& .MuiOutlinedInput-root": { borderRadius: 2, minHeight: 34 },
                      }}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Search ticker to add..." />
                      )}
                    />
                  )}
                </Paper>
              )}

              <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                {loadingAct ? (
                  <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
                ) : actFlowData.length === 0 || actVisibleTickers.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      No ticker activity found for this broker in selected
                      period.
                    </Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={340}>
                    <ComposedChart data={actFlowData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 9 }} interval="preserveStartEnd" />
                      <YAxis yAxisId="left" tick={{ fill: textColor, fontSize: 9 }}
                        tickFormatter={(v) => actMetric === "value" ? formatValue(v) : formatShares(v)} width={60} />
                      <RechartsTooltip contentStyle={tooltipStyle}
                        formatter={(v: number, name: string) => [
                          actMetric === "value" ? formatValue(v) : formatShares(v),
                          name
                        ]} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: 8 }} />
                      {actVisibleTickers.map((ticker, idx) => (
                        <Line
                          key={ticker}
                          yAxisId="left"
                          type="monotone"
                          dataKey={ticker}
                          stroke={BROKER_COLORS[idx % BROKER_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                          name={ticker}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </Paper>

              {(actBuyRows.length > 0 || actSellRows.length > 0) && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.2 }}>
                    Broker Activity
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>BY</TableCell>
                          <TableCell align="right">B.Val</TableCell>
                          <TableCell align="right">B.Lot</TableCell>
                          <TableCell align="right">B.Avg</TableCell>
                          <TableCell sx={{ width: 28 }} />
                          <TableCell>SL</TableCell>
                          <TableCell align="right">S.Val</TableCell>
                          <TableCell align="right">S.Lot</TableCell>
                          <TableCell align="right">S.Avg</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Array.from({
                          length: Math.max(actBuyRows.length, actSellRows.length),
                        }).map((_, i) => {
                          const b = actBuyRows[i];
                          const s = actSellRows[i];
                          return (
                          <TableRow key={`${b?.symbol || "b"}-${s?.symbol || "s"}-${i}`}>
                            <TableCell>
                              <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: "#22c55e" }}>
                                {b?.symbol || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "#22c55e" }}>
                                {b ? formatValue(b.b_val) : "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                {b ? formatShares(b.b_lot) : "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "text.secondary" }}>
                                {b && b.b_avg > 0 ? formatValue(b.b_avg) : "-"}
                              </Typography>
                            </TableCell>
                            <TableCell />
                            <TableCell>
                              <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: "#ef4444" }}>
                                {s?.symbol || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "#ef4444" }}>
                                {s ? formatValue(s.s_val) : "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                {s ? formatShares(s.s_lot) : "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "text.secondary" }}>
                                {s && s.s_avg > 0 ? formatValue(s.s_avg) : "-"}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </>
          )}

        </Stack>
      )}

      {tab === 2 && (
        <Stack spacing={2.5} className="animate-in">
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>Period</Typography>
            {BA_PERIOD_OPTS.map((opt) => (
              <Chip key={opt.value} label={opt.label} size="small" onClick={() => setBaPeriod(opt.value)}
                sx={{
                  fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.7rem", height: 26, cursor: "pointer",
                  bgcolor: baPeriod === opt.value ? (isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.1)") : "transparent",
                  color: baPeriod === opt.value ? "primary.main" : "text.secondary",
                  border: "1px solid", borderColor: baPeriod === opt.value ? "primary.main" : "transparent",
                }} />
            ))}
            {loadingBA && <Chip label="Loading..." size="small" sx={{ fontSize: "0.65rem", height: 22, opacity: 0.5 }} />}
          </Stack>

          {baStats && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, md: 3 }}><StatsCard title="Stocks Tracked" value={baStats.stockCount} subtitle={`${baPeriod} data`} icon={<InsightsIcon />} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><StatsCard title="Avg HHI" value={baStats.avgHHI.toFixed(0)} subtitle={hhiIndicator(baStats.avgHHI).label} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><StatsCard title="Most Concentrated" value={baStats.topSymbol} subtitle={`HHI ${baStats.topHHI.toFixed(0)}`} icon={<ShowChartIcon />} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><StatsCard title="Total Value" value={formatValue(baStats.totalVal)} subtitle="Combined activity" icon={<EqualizerIcon />} /></Grid>
            </Grid>
          )}

          <Paper sx={{ p: 0.75, borderRadius: 3 }}>
            <Tabs
              value={baView}
              onChange={(_, v) => setBaView(v)}
              sx={{
                minHeight: 34,
                "& .MuiTab-root": {
                  minHeight: 34,
                  py: 0,
                  px: 2,
                  textTransform: "none",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace',
                },
              }}
            >
              <Tab value="leaderboard" label="HHI Leaderboard" />
              <Tab value="lookup" label="Broker Lookup" />
            </Tabs>
          </Paper>

          {baView === "leaderboard" && (
          <Paper
            sx={{ p: 2.5, borderRadius: 3 }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
                mb: 2,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  HHI Concentration Leaderboard
                </Typography>
                <Chip
                  label={`${baLeaderboard.length} stocks`}
                  size="small"
                  sx={{
                    fontSize: "0.65rem",
                    height: 20,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Higher HHI = fewer brokers dominate trading
              </Typography>
            </Box>

            {loadingBA ? (
              <Stack spacing={1}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="rounded"
                    height={40}
                    sx={{ borderRadius: 1.5 }}
                  />
                ))}
              </Stack>
            ) : baLeaderboard.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No concentration data for this period
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 520 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 32 }}>#</TableCell>
                      <TableCell>Symbol</TableCell>
                      <TableCell align="right">HHI Score</TableCell>
                      <TableCell
                        align="center"
                        sx={{ display: { xs: "none", sm: "table-cell" } }}
                      >
                        Brokers
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ display: { xs: "none", md: "table-cell" } }}
                      >
                        Total Value
                      </TableCell>
                      <TableCell align="center">Level</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {baLeaderboard.map((entry, i) => {
                      const hi = hhiIndicator(entry.hhi_score);
                      return (
                          <TableRow
                            key={entry.symbol}
                            hover
                            onClick={() => router.push(`/stock/${entry.symbol}`)}
                            sx={{
                              cursor: "pointer",
                              ...(i < 3 && {
                                borderLeft: `3px solid ${hi.color}`,
                              }),
                            }}
                          >
                            <TableCell>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  color: i < 3 ? hi.color : "text.secondary",
                                  fontWeight: i < 3 ? 700 : 400,
                                }}
                              >
                                {i + 1}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: "0.8rem",
                                  color: "primary.main",
                                }}
                              >
                                {entry.symbol}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontWeight: 700,
                                  color: hi.color,
                                }}
                              >
                                {entry.hhi_score.toFixed(0)}
                              </Typography>
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{
                                display: { xs: "none", sm: "table-cell" },
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  color: "text.secondary",
                                }}
                              >
                                {entry.active_brokers}
                              </Typography>
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                display: { xs: "none", md: "table-cell" },
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                }}
                              >
                                {formatValue(entry.total_abs_value)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={hi.label}
                                size="small"
                                sx={{
                                  fontSize: "0.6rem",
                                  height: 20,
                                  bgcolor: `${hi.color}18`,
                                  color: hi.color,
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
          )}

          {baView === "lookup" && (
          <Paper
            sx={{ p: 2.5, borderRadius: 3 }}
            className="animate-in animate-in-delay-6"
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, mb: 1.5 }}
            >
              Broker Lookup
            </Typography>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <TextField
                size="small"
                placeholder="Enter broker code (e.g. YP, ZP)"
                value={brokerLookup}
                onChange={(e) => setBrokerLookup(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleBrokerLookup();
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{ fontSize: 18, color: "text.secondary" }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  minWidth: 220,
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                  "& input": {
                    fontFamily: '"JetBrains Mono", monospace',
                    textTransform: "uppercase",
                  },
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleBrokerLookup}
                disabled={!brokerLookup.trim() || loadingBrokerLookup}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                {loadingBrokerLookup ? "Loading..." : "Search"}
              </Button>
            </Stack>

            {brokerLookupCode && (
              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Top stocks for broker
                  </Typography>
                  <Chip
                    label={brokerLookupCode}
                    size="small"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      height: 22,
                      color: "primary.main",
                      bgcolor: isDark
                        ? "rgba(212,168,67,0.12)"
                        : "rgba(161,124,47,0.08)",
                    }}
                  />
                </Stack>

                {brokerLookupStocks.length === 0 ? (
                  <Box sx={{ py: 2, textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                      No activity found for broker {brokerLookupCode} in{" "}
                      {baPeriod}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 32 }}>#</TableCell>
                          <TableCell>Symbol</TableCell>
                          <TableCell align="right">Net Value</TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              display: { xs: "none", sm: "table-cell" },
                            }}
                          >
                            Volume
                          </TableCell>
                          <TableCell sx={{ minWidth: 100 }}>Share</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {brokerLookupStocks.map((bs: any) => {
                          const barW =
                            brokerLookupStocks[0]?.net_value
                              ? (Math.abs(bs.net_value) /
                                  Math.abs((brokerLookupStocks[0] as any).net_value)) *
                                100
                              : 0;
                          return (
                            <TableRow
                              key={bs.symbol}
                              hover
                              sx={{
                                cursor: "pointer",
                                "&:last-child td": { borderBottom: 0 },
                              }}
                              onClick={() =>
                                router.push(`/stock/${bs.symbol}`)
                              }
                            >
                              <TableCell>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontFamily:
                                      '"JetBrains Mono", monospace',
                                    color: "text.secondary",
                                  }}
                                >
                                  {bs.rank}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    fontFamily:
                                      '"JetBrains Mono", monospace',
                                    fontSize: "0.8rem",
                                    color: "primary.main",
                                  }}
                                >
                                  {bs.symbol}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontFamily:
                                      '"JetBrains Mono", monospace',
                                    fontWeight: 600,
                                    color:
                                      bs.net_value > 0
                                        ? "#22c55e"
                                        : bs.net_value < 0
                                          ? "#ef4444"
                                          : "text.primary",
                                  }}
                                >
                                  {formatValue(bs.net_value)}
                                </Typography>
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  display: {
                                    xs: "none",
                                    sm: "table-cell",
                                  },
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontFamily:
                                      '"JetBrains Mono", monospace',
                                  }}
                                >
                                  {formatShares(bs.net_volume)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Box sx={{ flex: 1, minWidth: 40 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={barW}
                                      sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        bgcolor: isDark
                                          ? "rgba(255,255,255,0.06)"
                                          : "rgba(0,0,0,0.06)",
                                        "& .MuiLinearProgress-bar": {
                                          borderRadius: 3,
                                          bgcolor: "#d4a843",
                                        },
                                      }}
                                    />
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontFamily:
                                        '"JetBrains Mono", monospace',
                                      color: "text.secondary",
                                      minWidth: 38,
                                      textAlign: "right",
                                      fontSize: "0.6rem",
                                    }}
                                  >
                                    {bs.value_share.toFixed(1)}%
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </Paper>
          )}
        </Stack>
      )}

      {tab === 3 && (
        <Stack spacing={2.5} className="animate-in">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatsCard
                title="Total Brokers"
                value={dirStats.total}
                subtitle="Registered firms"
                icon={<StorefrontIcon />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <StatsCard
                title="Underwriter + Broker"
                value={dirStats.underwriterBroker}
                subtitle="Dual-licensed"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <StatsCard
                title="Broker-Dealer Only"
                value={dirStats.brokerOnly}
                subtitle="Trading only"
              />
            </Grid>
          </Grid>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ sm: "center" }}
          >
            <TextField
              size="small"
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        sx={{ fontSize: 18, color: "text.secondary" }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                minWidth: 260,
                "& .MuiOutlinedInput-root": { borderRadius: 2 },
              }}
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterListIcon
                sx={{ fontSize: 16, color: "text.secondary" }}
              />
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <Select
                  value={licenseFilter}
                  onChange={(e) => setLicenseFilter(e.target.value)}
                  sx={{ borderRadius: 2, fontSize: "0.85rem" }}
                >
                  {licenseTypes.map((l) => (
                    <MenuItem key={l} value={l} sx={{ fontSize: "0.85rem" }}>
                      {l === "All"
                        ? "All Licenses"
                        : LICENSE_LABELS[l]?.short || l}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Chip
              label={`${filtered.length} broker${filtered.length !== 1 ? "s" : ""}`}
              size="small"
              sx={{ fontFamily: "monospace", fontWeight: 600 }}
            />
          </Stack>

          <Grid container spacing={1.5}>
            {filtered.map((broker) => {
              const lic = LICENSE_LABELS[broker.license];
              const activityData = brokerAggregates.find(
                (a) => a.code === broker.code
              );

              return (
                <Grid
                  size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                  key={broker.code}
                >
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      transition:
                        "border-color 0.15s ease, background-color 0.15s ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: isDark
                          ? "rgba(59,130,246,0.04)"
                          : "rgba(59,130,246,0.02)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontFamily: "monospace",
                          color: "primary.main",
                          fontSize: "1rem",
                        }}
                      >
                        {broker.code}
                      </Typography>
                      <StorefrontIcon
                        sx={{
                          fontSize: 16,
                          color: "text.secondary",
                          opacity: 0.3,
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        fontSize: "0.8rem",
                        lineHeight: 1.3,
                        flex: 1,
                      }}
                    >
                      {broker.name}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        label={lic?.short || broker.license}
                        size="small"
                        sx={{
                          fontSize: "0.65rem",
                          height: 20,
                          bgcolor: lic
                            ? `${lic.color}18`
                            : isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          color: lic?.color || "text.secondary",
                          fontWeight: 600,
                        }}
                      />
                      {activityData && (
                        <Chip
                          label={formatValue(activityData.totalValue)}
                          size="small"
                          sx={{
                            fontSize: "0.6rem",
                            height: 18,
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 600,
                            bgcolor: isDark
                              ? "rgba(212,168,67,0.12)"
                              : "rgba(161,124,47,0.08)",
                            color: "primary.main",
                          }}
                        />
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {filtered.length === 0 && (
            <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
              <Typography color="text.secondary">
                No brokers found matching your criteria
              </Typography>
            </Paper>
          )}
        </Stack>
      )}
    </Stack>
  );
}

interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  code: string;
  name: string;
  pct: number;
  value: number;
  trend: string;
  area: number;
}

function squarifyLayout(
  items: { code: string; name: string; value: number; pct: number; trend: string }[],
  W: number,
  H: number,
): TreemapRect[] {
  const totalVal = items.reduce((s, i) => s + i.value, 0);
  if (totalVal === 0 || items.length === 0) return [];
  const totalArea = W * H;

  type Node = (typeof items)[0] & { area: number };
  const nodes: Node[] = items.map((it) => ({
    ...it,
    area: (it.value / totalVal) * totalArea,
  }));

  const rects: TreemapRect[] = [];

  function worst(row: Node[], side: number) {
    const s = row.reduce((a, n) => a + n.area, 0);
    const mx = Math.max(...row.map((n) => n.area));
    const mn = Math.min(...row.map((n) => n.area));
    return Math.max(
      (side * side * mx) / (s * s),
      (s * s) / (side * side * mn),
    );
  }

  function layRow(
    row: Node[],
    x: number,
    y: number,
    w: number,
    h: number,
    vert: boolean,
  ) {
    const ra = row.reduce((a, n) => a + n.area, 0);
    if (vert) {
      const rw = ra / h;
      let cy = y;
      row.forEach((n) => {
        const nh = n.area / rw;
        rects.push({ x, y: cy, w: rw, h: nh, ...n });
        cy += nh;
      });
      return { x: x + rw, y, w: w - rw, h };
    }
    const rh = ra / w;
    let cx = x;
    row.forEach((n) => {
      const nw = n.area / rh;
      rects.push({ x: cx, y, w: nw, h: rh, ...n });
      cx += nw;
    });
    return { x, y: y + rh, w, h: h - rh };
  }

  function run(
    rem: Node[],
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!rem.length) return;
    if (rem.length === 1) {
      rects.push({ x, y, w, h, ...rem[0] });
      return;
    }
    const vert = h > w;
    const side = vert ? h : w;
    const row: Node[] = [rem[0]];
    const rest = rem.slice(1);
    let cw = worst(row, side);
    while (rest.length) {
      const candidate = [...row, rest[0]];
      const nw = worst(candidate, side);
      if (nw <= cw) {
        row.push(rest.shift()!);
        cw = nw;
      } else break;
    }
    const b = layRow(row, x, y, w, h, vert);
    run(rest, b.x, b.y, b.w, b.h);
  }

  run(nodes, 0, 0, W, H);
  return rects;
}

const TREEMAP_PALETTE = [
  "#d4a843",
  "#c49a3a",
  "#e8c468",
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#14b8a6",
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#22c55e",
  "#f97316",
  "#64748b",
];

function ConcentrationTreemap({
  brokerAggregates,
  totalValue,
  top5Pct,
  isDark,
  onBrokerClick,
}: {
  brokerAggregates: { code: string; name: string; totalValue: number; trend: keyof typeof TREND_CONFIG }[];
  totalValue: number;
  top5Pct: number;
  isDark: boolean;
  onBrokerClick: (code: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const top = brokerAggregates.slice(0, 12);
  const topValue = top.reduce((s, b) => s + b.totalValue, 0);
  const othersValue = totalValue - topValue;
  const othersCount = brokerAggregates.length - 12;

  const items = top.map((b) => ({
    code: b.code,
    name: b.name,
    value: b.totalValue,
    pct: totalValue > 0 ? (b.totalValue / totalValue) * 100 : 0,
    trend: b.trend as string,
  }));
  if (othersValue > 0 && othersCount > 0) {
    items.push({
      code: "OTHERS",
      name: `${othersCount} other brokers`,
      value: othersValue,
      pct: totalValue > 0 ? (othersValue / totalValue) * 100 : 0,
      trend: "steady",
    });
  }

  const W = 1000;
  const H = 380;
  const rects = squarifyLayout(items, W, H);
  const gap = 2;

  const hhi = useMemo(() => {
    if (totalValue <= 0) return 0;
    return brokerAggregates.reduce((sum, b) => {
      const share = (b.totalValue / totalValue) * 100;
      return sum + share * share;
    }, 0);
  }, [brokerAggregates, totalValue]);
  const hhiInfo = hhiIndicator(hhi);

  return (
    <Paper
      className="animate-in animate-in-delay-4"
      sx={{
        borderRadius: 2.5,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box
        sx={{
          px: 2.5,
          pt: 2,
          pb: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 700,
              fontSize: "0.85rem",
              letterSpacing: "-0.02em",
            }}
          >
            Market Concentration
          </Typography>
          <Chip
            label={`Top 5: ${top5Pct.toFixed(1)}%`}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.6rem",
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace',
              bgcolor: isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.06)",
              color: "primary.main",
            }}
          />
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.6rem",
              color: "text.secondary",
            }}
          >
            HHI
          </Typography>
          <Chip
            label={`${hhi.toFixed(0)} ${hhiInfo.label}`}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.58rem",
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace',
              bgcolor: `${hhiInfo.color}18`,
              color: hhiInfo.color,
            }}
          />
        </Stack>
      </Box>

      <Box
        sx={{
          px: 1.5,
          pb: 1.5,
          position: "relative",
          width: "100%",
          aspectRatio: `${W} / ${H}`,
          maxHeight: 420,
        }}
      >
        <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
          {rects.map((r, i) => {
            const color = TREEMAP_PALETTE[i] || TREEMAP_PALETTE[TREEMAP_PALETTE.length - 1];
            const isOthers = r.code === "OTHERS";
            const isHovered = hovered === r.code;
            const tileW = (r.w / W) * 100;
            const tileH = (r.h / H) * 100;
            const tileX = (r.x / W) * 100;
            const tileY = (r.y / H) * 100;

            const isLarge = tileW > 12 && tileH > 20;
            const isMedium = tileW > 6 && tileH > 12;

            const trendCfg = TREND_CONFIG[r.trend as keyof typeof TREND_CONFIG] || TREND_CONFIG.steady;

            return (
              <Tooltip
                key={r.code}
                title={
                  <Box sx={{ p: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", fontFamily: '"JetBrains Mono", monospace' }}>
                      {r.code}
                    </Typography>
                    <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.7)", mb: 0.5 }}>
                      {r.name}
                    </Typography>
                    <Typography sx={{ fontSize: "0.65rem", fontFamily: '"JetBrains Mono", monospace' }}>
                      {r.pct.toFixed(2)}% share - {formatValue(r.value)}
                    </Typography>
                    {!isOthers && (
                      <Typography sx={{ fontSize: "0.6rem", color: trendCfg.color, mt: 0.25 }}>
                        Trend: {trendCfg.label}
                      </Typography>
                    )}
                  </Box>
                }
                arrow
                placement="top"
              >
                <Box
                  onMouseEnter={() => setHovered(r.code)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => !isOthers && onBrokerClick(r.code)}
                  sx={{
                    position: "absolute",
                    left: `${tileX}%`,
                    top: `${tileY}%`,
                    width: `${tileW}%`,
                    height: `${tileH}%`,
                    p: `${gap}px`,
                    cursor: isOthers ? "default" : "pointer",
                    transition: "transform 0.15s ease, z-index 0s",
                    transform: isHovered ? "scale(1.02)" : "scale(1)",
                    zIndex: isHovered ? 10 : 1,
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 1.5,
                      overflow: "hidden",
                      position: "relative",
                      background: isOthers
                        ? isDark
                          ? "rgba(100,116,139,0.15)"
                          : "rgba(100,116,139,0.08)"
                        : isDark
                          ? `linear-gradient(135deg, ${color}28 0%, ${color}14 100%)`
                          : `linear-gradient(135deg, ${color}18 0%, ${color}0a 100%)`,
                      border: `1px solid ${
                        isHovered
                          ? `${color}80`
                          : isOthers
                            ? isDark ? "rgba(100,116,139,0.15)" : "rgba(100,116,139,0.1)"
                            : isDark ? `${color}30` : `${color}20`
                      }`,
                      transition: "all 0.2s ease",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isLarge ? "flex-start" : "center",
                      justifyContent: "center",
                      px: isLarge ? 1.5 : 0.5,
                      py: isLarge ? 1 : 0.5,
                      "&::before": !isOthers ? {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: 3,
                        background: color,
                        opacity: isHovered ? 1 : 0.7,
                        transition: "opacity 0.2s ease",
                      } : undefined,
                      ...(isHovered && !isOthers && {
                        boxShadow: `0 4px 20px ${color}30`,
                      }),
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 800,
                        fontSize: isLarge ? "0.9rem" : isMedium ? "0.7rem" : "0.6rem",
                        color: isOthers
                          ? "text.secondary"
                          : color,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.2,
                        textAlign: isLarge ? "left" : "center",
                      }}
                    >
                      {r.code}
                    </Typography>
                    {(isLarge || isMedium) && (
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 600,
                          fontSize: isLarge ? "0.75rem" : "0.6rem",
                          color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
                          lineHeight: 1.3,
                          mt: 0.25,
                        }}
                      >
                        {r.pct.toFixed(1)}%
                      </Typography>
                    )}
                    {isLarge && (
                      <>
                        <Typography
                          sx={{
                            fontSize: "0.55rem",
                            color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)",
                            lineHeight: 1.2,
                            mt: 0.25,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "100%",
                          }}
                        >
                          {r.name}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)",
                            mt: 0.5,
                          }}
                        >
                          {formatValue(r.value)}
                        </Typography>
                        {!isOthers && (
                          <Box
                            sx={{
                              mt: 0.5,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                bgcolor: trendCfg.color,
                              }}
                            />
                            <Typography
                              sx={{
                                fontSize: "0.5rem",
                                fontWeight: 600,
                                color: trendCfg.color,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              {trendCfg.label}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
}
