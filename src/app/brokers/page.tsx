"use client";

import { useEffect, useState, useMemo, useRef, Fragment } from "react";
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
  Cell as RechartsCell,
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
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import CircularProgress from "@mui/material/CircularProgress";
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
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import IconButton from "@mui/material/IconButton";
import { useWatchlist } from "@/lib/watchlist";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3 }} />
  ),
});

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

const BA_PAGE_SIZE = 10;

const BA_CATEGORIES = [
  { key: "bandarmologi", label: "Top Akum Bandarmologi" },
  { key: "non_retail", label: "Top Akum NonRetail" },
  { key: "foreign", label: "Top Akum Foreign" },
] as const;

const BA_PERIOD_TOGGLE = [
  { key: "1M", label: "1M" },
  { key: "5D", label: "5D" },
] as const;

const BA_SIGNAL_FILTER = [
  { key: "accumulation", label: "Akumulasi" },
  { key: "distribution", label: "Distribusi" },
  { key: "all", label: "Semua" },
] as const;

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
  const { isWatched, toggle: toggleWatchlist } = useWatchlist();

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
  const [actCustomFrom, setActCustomFrom] = useState("");
  const [actCustomTo, setActCustomTo] = useState("");
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
  const [baDate, setBaDate] = useState("");
  const [baView, setBaView] = useState<"dashboard" | "lookup" | "network">("dashboard");
  const [baLeaderboard, setBaLeaderboard] = useState<BandarmologyEntry[]>([]);
  const [loadingBA, setLoadingBA] = useState(false);
  const [brokerLookup, setBrokerLookup] = useState("");
  const [brokerLookupStocks, setBrokerLookupStocks] = useState<BrokerPosition[]>([]);
  const [loadingBrokerLookup, setLoadingBrokerLookup] = useState(false);
  const [brokerLookupCode, setBrokerLookupCode] = useState("");

  const [baCategory, setBaCategory] = useState<"bandarmologi" | "non_retail" | "foreign">("bandarmologi");
  const [baDashPeriod, setBaDashPeriod] = useState<"1M" | "5D">("1M");
  const [baSignalFilter, setBaSignalFilter] = useState<"accumulation" | "distribution" | "all">("accumulation");
  const [baEntries, setBaEntries] = useState<{
    symbol: string; price: number; change_pct: number;
    accum_ratio: number; top_buyer: string; top_buyer_value: number; top_buyer_share: number;
    top_seller: string; top_seller_value: number;
    buyer_count: number; seller_count: number;
    buyer_participation: number;
    total_buy_value: number; total_sell_value: number;
    signal: "accumulation" | "distribution" | "neutral";
  }[]>([]);
  const [baUpdateDate, setBaUpdateDate] = useState("");
  const [baSearch, setBaSearch] = useState("");
  const [baPage, setBaPage] = useState(0);
  const [baCopied, setBaCopied] = useState(false);
  const [foreignBrokerCodes, setForeignBrokerCodes] = useState<Set<string>>(new Set());

  const [clusterData, setClusterData] = useState<{
    clusters: { cluster_id: number; cluster_label: string; broker_code: string; cluster_size: number; avg_internal_correlation: number }[];
    correlations: { broker_a: string; broker_b: string; shared_symbols: number; correlation: number }[];
    brokerNames: Record<string, { name: string; isForeign: boolean }>;
  } | null>(null);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [clusterMinCorr, setClusterMinCorr] = useState(0.5);
  const hoveredBrokerRef = useRef<string | null>(null);
  const [tooltipBroker, setTooltipBroker] = useState<string | null>(null);
  const graphRef = useRef<any>(null);
  const neighborMapRef = useRef<Map<string, { code: string; corr: number; shared: number }[]>>(new Map());

  const [brokerModalCode, setBrokerModalCode] = useState<string | null>(null);
  const [brokerModalData, setBrokerModalData] = useState<any>(null);
  const [brokerModalLoading, setBrokerModalLoading] = useState(false);

  const [regimeData, setRegimeData] = useState<{
    symbol: string; regime: string; confidence_score: number; accum_ratio: number;
    log_return: number; volume_ratio: number; volatility: number; foreign_flow_dir: number;
  }[]>([]);
  const [loadingRegimes, setLoadingRegimes] = useState(false);

  const clusterMap = useMemo(() => {
    const m = new Map<string, { cluster_id: number; cluster_label: string; cluster_size: number }>();
    if (clusterData) {
      for (const c of clusterData.clusters) {
        m.set(c.broker_code, { cluster_id: c.cluster_id, cluster_label: c.cluster_label, cluster_size: c.cluster_size });
      }
    }
    return m;
  }, [clusterData]);

  const CLUSTER_COLORS_STABLE = useMemo(() => [
    "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
    "#14b8a6", "#e11d48",
  ], []);

  const networkGraphData = useMemo(() => {
    if (!clusterData) return null;
    const filteredEdges = clusterData.correlations.filter((c) => c.correlation >= clusterMinCorr);
    const connectedBrokers = new Set<string>();
    for (const e of filteredEdges) {
      connectedBrokers.add(e.broker_a);
      connectedBrokers.add(e.broker_b);
    }

    const nbrMap = new Map<string, { code: string; corr: number; shared: number }[]>();
    for (const e of filteredEdges) {
      if (!nbrMap.has(e.broker_a)) nbrMap.set(e.broker_a, []);
      if (!nbrMap.has(e.broker_b)) nbrMap.set(e.broker_b, []);
      nbrMap.get(e.broker_a)!.push({ code: e.broker_b, corr: e.correlation, shared: e.shared_symbols });
      nbrMap.get(e.broker_b)!.push({ code: e.broker_a, corr: e.correlation, shared: e.shared_symbols });
    }
    neighborMapRef.current = nbrMap;

    const nodes = [...connectedBrokers].map((code) => {
      const cl = clusterMap.get(code);
      const meta = clusterData.brokerNames[code];
      const neighbors = nbrMap.get(code) || [];
      return {
        id: code,
        name: meta?.name || code,
        cluster: cl?.cluster_id || 0,
        clusterLabel: cl?.cluster_label || "Independent",
        size: cl?.cluster_size || 1,
        isForeign: meta?.isForeign || false,
        color: cl ? CLUSTER_COLORS_STABLE[(cl.cluster_id - 1) % CLUSTER_COLORS_STABLE.length] : "#64748b",
        neighborCount: neighbors.length,
        topNeighbors: [...neighbors].sort((a, b) => b.corr - a.corr).slice(0, 5),
        avgCorr: neighbors.length > 0 ? neighbors.reduce((s, n) => s + n.corr, 0) / neighbors.length : 0,
      };
    });

    const links = filteredEdges.map((e) => ({
      source: e.broker_a,
      target: e.broker_b,
      value: e.correlation,
      shared: e.shared_symbols,
    }));

    return { nodes, links };
  }, [clusterData, clusterMinCorr, clusterMap, CLUSTER_COLORS_STABLE]);

  const openBrokerModal = async (code: string) => {
    setBrokerModalCode(code);
    setBrokerModalLoading(true);
    setBrokerModalData(null);
    const nbrs = neighborMapRef.current.get(code);
    const topNeighbor = nbrs?.sort((a, b) => b.corr - a.corr)?.[0]?.code || "";
    try {
      const url = `/api/broker-detail?code=${code}${topNeighbor ? `&compare=${topNeighbor}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      setBrokerModalData(data);
    } catch {
      setBrokerModalData(null);
    }
    setBrokerModalLoading(false);
  };

  const regimeMap = useMemo(() => {
    const m = new Map<string, { regime: string; confidence_score: number }>();
    for (const r of regimeData) {
      m.set(r.symbol, { regime: r.regime, confidence_score: r.confidence_score });
    }
    return m;
  }, [regimeData]);

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
    if (tab !== 2) return;
    let cancelled = false;

    async function fetchQuantData() {
      setLoadingClusters(true);
      setLoadingRegimes(true);
      try {
        const [clusterRes, regimeRes] = await Promise.all([
          fetch("/api/broker-clusters").then((r) => r.json()),
          fetch("/api/stock-regime").then((r) => r.json()),
        ]);
        if (!cancelled) {
          setClusterData(clusterRes);
          setRegimeData(regimeRes.regimes || []);
        }
      } catch {
        // silent
      }
      if (!cancelled) {
        setLoadingClusters(false);
        setLoadingRegimes(false);
      }
    }
    fetchQuantData();
    return () => { cancelled = true; };
  }, [tab]);

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

  const actMapping = useMemo(() => mapDateRange(actDateRange, actCustomFrom, actCustomTo), [actDateRange, actCustomFrom, actCustomTo]);
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
    async function fetchForeignCodes() {
      const { data } = await supabase
        .from("idx_brokers")
        .select("code")
        .eq("is_foreign", true);
      if (data) setForeignBrokerCodes(new Set(data.map((d: any) => d.code)));
    }
    fetchForeignCodes();
  }, []);

  useEffect(() => {
    if (tab !== 2 || baView !== "dashboard") return;
    let cancelled = false;

    async function fetchBandarmolData() {
      setLoadingBA(true);
      setBaEntries([]);
      setBaPage(0);

      try {
        const is5D = baDashPeriod === "5D";
        const dbPeriod = is5D ? "1D" : "1M";

        const { data: dtData } = await supabase
          .from("idx_ba_daily_summary")
          .select("date")
          .eq("period", dbPeriod)
          .eq("investor_type", "ALL")
          .eq("market_board", "REGULAR")
          .order("date", { ascending: false })
          .limit(1);

        if (cancelled || !dtData?.length) { setLoadingBA(false); return; }
        const latestDate = dtData[0].date;
        setBaUpdateDate(latestDate);

        if (baCategory === "bandarmologi") {
          let query = supabase
            .from("v_ba_accumulation")
            .select("symbol, accum_ratio, top_buyer_code, top_buyer_value, top_buyer_share, top_seller_code, top_seller_value, total_buyers, total_sellers, buyer_participation, total_buy_value, total_sell_value")
            .eq("period", dbPeriod)
            .eq("investor_type", "ALL")
            .eq("market_board", "REGULAR")
            .eq("date", latestDate)
            .gt("total_buy_value", 0);

          if (baSignalFilter === "accumulation") {
            query = query.gte("accum_ratio", 1.5).order("accum_ratio", { ascending: false });
          } else if (baSignalFilter === "distribution") {
            query = query.lte("accum_ratio", 0.7).order("accum_ratio", { ascending: true });
          } else {
            query = query.order("accum_ratio", { ascending: false });
          }
          query = query.limit(500);

          const { data: accumData } = await query;
          if (cancelled || !accumData?.length) { setLoadingBA(false); return; }

          const top200 = (accumData as any[]).filter((r: any) => parseFloat(r.accum_ratio) > 0).slice(0, 200);
          const symbols = top200.map((e: any) => e.symbol as string);

          const { data: priceData } = await supabase
            .from("idx_stock_summary")
            .select("stock_code, close, previous, change")
            .in("stock_code", symbols)
            .order("date", { ascending: false })
            .limit(symbols.length * 3);

          const priceMap = new Map<string, { price: number; change_pct: number }>();
          if (priceData) {
            for (const r of priceData as any[]) {
              if (!priceMap.has(r.stock_code)) {
                const price = parseFloat(r.close) || 0;
                const prev = parseFloat(r.previous) || price;
                const change = parseFloat(r.change) || 0;
                priceMap.set(r.stock_code, { price, change_pct: prev > 0 ? (change / prev) * 100 : 0 });
              }
            }
          }

          if (cancelled) return;
          const mapped = top200.map((e: any) => {
            const priceInfo = priceMap.get(e.symbol) || { price: 0, change_pct: 0 };
            const ratio = parseFloat(e.accum_ratio) || 0;
            const buyerPart = parseFloat(e.buyer_participation) || 0;
            const buyerCnt = parseInt(e.total_buyers) || 0;
            const sellerCnt = parseInt(e.total_sellers) || 0;
            const tbuyVal = parseFloat(e.total_buy_value) || 0;
            const tbShare = parseFloat(e.top_buyer_share) || 0;
            const bsRatio = sellerCnt > 0 ? buyerCnt / sellerCnt : 1;
            const isLiquid = tbuyVal >= 1_000_000_000;
            const hasConcentrated = tbShare >= 25 || buyerPart >= 70;

            let signal: "accumulation" | "distribution" | "neutral" = "neutral";
            if (ratio >= 1.5 && isLiquid && bsRatio < 0.8 && sellerCnt >= 5 && hasConcentrated) {
              signal = "accumulation";
            } else if (ratio <= 0.7 && isLiquid && bsRatio > 1.3 && buyerCnt >= 5) {
              signal = "distribution";
            }
            return {
              symbol: e.symbol,
              price: priceInfo.price,
              change_pct: priceInfo.change_pct,
              accum_ratio: ratio,
              top_buyer: e.top_buyer_code || "-",
              top_buyer_value: parseFloat(e.top_buyer_value) || 0,
              top_buyer_share: tbShare,
              top_seller: e.top_seller_code || "-",
              top_seller_value: parseFloat(e.top_seller_value) || 0,
              buyer_count: buyerCnt,
              seller_count: sellerCnt,
              buyer_participation: buyerPart,
              total_buy_value: tbuyVal,
              total_sell_value: parseFloat(e.total_sell_value) || 0,
              signal,
            };
          });
          let result = mapped;
          if (baSignalFilter === "accumulation") {
            result = mapped.filter((e) => e.signal === "accumulation");
          } else if (baSignalFilter === "distribution") {
            result = mapped.filter((e) => e.signal === "distribution");
          }
          setBaEntries(result);
        } else {
          const brokerFilter = baCategory === "foreign" || baCategory === "non_retail";
          if (brokerFilter && foreignBrokerCodes.size === 0) { setLoadingBA(false); return; }

          const { data: summaryData } = await supabase
            .from("idx_ba_daily_summary")
            .select("symbol, broker_code, net_value, b_val, s_val")
            .eq("period", dbPeriod)
            .eq("investor_type", "ALL")
            .eq("market_board", "REGULAR")
            .eq("date", latestDate)
            .limit(50000);

          if (cancelled || !summaryData?.length) { setLoadingBA(false); return; }

          const filteredRows = (summaryData as any[]).filter((r: any) =>
            brokerFilter ? foreignBrokerCodes.has(r.broker_code) : true
          );

          type BrokerNet = { nv: number; bv: number; sv: number };
          const symMap = new Map<string, { brokers: Map<string, BrokerNet>; totalBuy: number; totalSell: number }>();
          for (const r of filteredRows) {
            const sym = r.symbol as string;
            const nv = parseFloat(r.net_value) || 0;
            const bv = parseFloat(r.b_val) || 0;
            const sv = parseFloat(r.s_val) || 0;
            const bc = r.broker_code as string;
            if (!symMap.has(sym)) symMap.set(sym, { brokers: new Map(), totalBuy: 0, totalSell: 0 });
            const entry = symMap.get(sym)!;
            entry.totalBuy += bv;
            entry.totalSell += sv;
            const prev = entry.brokers.get(bc) || { nv: 0, bv: 0, sv: 0 };
            entry.brokers.set(bc, { nv: prev.nv + nv, bv: prev.bv + bv, sv: prev.sv + sv });
          }

          const symEntries: typeof baEntries = [];
          for (const [symbol, { brokers, totalBuy, totalSell }] of symMap) {
            const buyers = [...brokers.entries()].filter(([, v]) => v.nv > 0).sort((a, b) => b[1].nv - a[1].nv);
            const sellers = [...brokers.entries()].filter(([, v]) => v.nv < 0).sort((a, b) => a[1].nv - b[1].nv);
            if (buyers.length === 0) continue;

            const top3buy = buyers.slice(0, 3).reduce((s, [, v]) => s + v.nv, 0);
            const top3sell = sellers.slice(0, 3).reduce((s, [, v]) => s + Math.abs(v.nv), 0);
            const ratio = top3sell > 0 ? top3buy / top3sell : 99.99;
            const top5buy = buyers.slice(0, 5).reduce((s, [, v]) => s + v.nv, 0);
            const buyerPart = totalBuy > 0 ? (top5buy / totalBuy) * 100 : 0;
            const topBuyerShare = totalBuy > 0 ? (buyers[0][1].nv / totalBuy) * 100 : 0;

            const bsRatio = sellers.length > 0 ? buyers.length / sellers.length : 1;
            const isLiquid = totalBuy >= 1_000_000_000;
            const hasConcentrated = topBuyerShare >= 25 || buyerPart >= 70;

            let signal: "accumulation" | "distribution" | "neutral" = "neutral";
            if (ratio >= 1.5 && isLiquid && bsRatio < 0.8 && sellers.length >= 5 && hasConcentrated) {
              signal = "accumulation";
            } else if (ratio <= 0.7 && isLiquid && bsRatio > 1.3 && buyers.length >= 5) {
              signal = "distribution";
            }

            symEntries.push({
              symbol,
              price: 0,
              change_pct: 0,
              accum_ratio: Math.min(ratio, 99.99),
              top_buyer: buyers[0][0],
              top_buyer_value: buyers[0][1].nv,
              top_buyer_share: topBuyerShare,
              top_seller: sellers.length > 0 ? sellers[0][0] : "-",
              top_seller_value: sellers.length > 0 ? Math.abs(sellers[0][1].nv) : 0,
              buyer_count: buyers.length,
              seller_count: sellers.length,
              buyer_participation: buyerPart,
              total_buy_value: totalBuy,
              total_sell_value: totalSell,
              signal,
            });
          }

          let filtered = symEntries;
          if (baSignalFilter === "accumulation") {
            filtered = symEntries.filter((e) => e.signal === "accumulation");
            filtered.sort((a, b) => b.accum_ratio - a.accum_ratio);
          } else if (baSignalFilter === "distribution") {
            filtered = symEntries.filter((e) => e.signal === "distribution");
            filtered.sort((a, b) => a.accum_ratio - b.accum_ratio);
          } else {
            filtered.sort((a, b) => b.accum_ratio - a.accum_ratio);
          }
          const top200 = filtered.slice(0, 200);
          const symbols = top200.map((e) => e.symbol);

          const { data: priceData } = await supabase
            .from("idx_stock_summary")
            .select("stock_code, close, previous, change")
            .in("stock_code", symbols)
            .order("date", { ascending: false })
            .limit(symbols.length * 3);

          if (priceData) {
            const priceMap = new Map<string, { price: number; change_pct: number }>();
            for (const r of priceData as any[]) {
              if (!priceMap.has(r.stock_code)) {
                const price = parseFloat(r.close) || 0;
                const prev = parseFloat(r.previous) || price;
                const change = parseFloat(r.change) || 0;
                priceMap.set(r.stock_code, { price, change_pct: prev > 0 ? (change / prev) * 100 : 0 });
              }
            }
            for (const entry of top200) {
              const p = priceMap.get(entry.symbol);
              if (p) { entry.price = p.price; entry.change_pct = p.change_pct; }
            }
          }

          if (cancelled) return;
          setBaEntries(top200);
        }
      } catch {
        // silently fail
      }
      setLoadingBA(false);
    }

    fetchBandarmolData();
    return () => { cancelled = true; };
  }, [tab, baView, baCategory, baDashPeriod, baSignalFilter, foreignBrokerCodes]);

  async function handleBrokerLookup(codeOverride?: string) {
    const code = (codeOverride ?? brokerLookup).trim().toUpperCase();
    if (!code) return;
    setLoadingBrokerLookup(true);
    setBrokerLookupCode(code);

    // ── Level 1: idx_ba_broker_ranking (pre-computed) ──
    {
      let q = supabase
        .from("idx_ba_broker_ranking")
        .select("broker_code, symbol, total_value, total_volume, value_share, rank, date")
        .eq("broker_code", code)
        .eq("period", baPeriod)
        .eq("investor_type", "ALL");
      if (baDate) q = q.eq("date", baDate);
      q = q.order("date", { ascending: false }).order("rank").limit(500);
      const { data } = await q;
      if (data && data.length > 0) {
        const latest = (data as any[])[0].date;
        const filtered = (data as any[]).filter((r: any) => r.date === latest);
        setBrokerLookupStocks(
          filtered.map((r: any) => ({
            broker_code: r.broker_code,
            total_value: parseFloat(r.total_value) || 0,
            total_volume: parseFloat(r.total_volume) || 0,
            value_share: parseFloat(r.value_share) || 0,
            rank: r.rank,
            symbol: r.symbol,
          })) as any
        );
        setLoadingBrokerLookup(false);
        return;
      }
    }

    // ── Level 2: idx_ba_daily_summary ──
    {
      let q = supabase
        .from("idx_ba_daily_summary")
        .select("broker_code, symbol, total_value, total_volume, date")
        .eq("broker_code", code)
        .eq("period", baPeriod)
        .eq("investor_type", "ALL")
        .eq("market_board", "REGULAR");
      if (baDate) q = q.lte("date", baDate);
      q = q.order("date", { ascending: false }).limit(500);
      const { data } = await q;
      if (data && data.length > 0) {
        const latest = (data as any[])[0].date;
        const filtered = (data as any[]).filter((r: any) => r.date === latest);
        const total = filtered.reduce((s: number, r: any) => s + Math.abs(parseFloat(r.total_value) || 0), 0);
        const rows = filtered
          .map((r: any) => {
            const tv = Math.abs(parseFloat(r.total_value) || 0);
            return {
              broker_code: r.broker_code,
              symbol: r.symbol,
              total_value: tv,
              total_volume: parseFloat(r.total_volume) || 0,
              value_share: total > 0 ? (tv / total) * 100 : 0,
              rank: 0,
            };
          })
          .sort((a: any, b: any) => b.total_value - a.total_value)
          .map((r: any, i: number) => ({ ...r, rank: i + 1 }));
        setBrokerLookupStocks(rows as any);
        setLoadingBrokerLookup(false);
        return;
      }
    }

    // ── Level 3: idx_broker_activity (raw, always populated) ──
    {
      let dtQ = supabase
        .from("idx_broker_activity")
        .select("date, time")
        .eq("broker_code", code)
        .eq("period", baPeriod)
        .eq("investor_type", "ALL")
        .eq("market_board", "REGULAR")
        .eq("chart_type", "TYPE_CHART_VALUE")
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .limit(1);
      if (baDate) dtQ = dtQ.lte("date", baDate);
      const { data: dtData } = await dtQ;
      const latestDate = (dtData as any)?.[0]?.date as string | null;
      const latestTime = (dtData as any)?.[0]?.time as string | null;

      if (latestDate) {
        // Fetch both value and volume chart types
        let rawQ = supabase
          .from("idx_broker_activity")
          .select("symbol, broker_code, value_raw, chart_type, time")
          .eq("broker_code", code)
          .eq("period", baPeriod)
          .eq("investor_type", "ALL")
          .eq("market_board", "REGULAR")
          .in("chart_type", ["TYPE_CHART_VALUE", "TYPE_CHART_VOLUME"])
          .eq("date", latestDate)
          .limit(10000);
        if (baPeriod === "1D" && latestTime) rawQ = rawQ.eq("time", latestTime);
        const { data: rawData } = await rawQ;

        if (rawData && rawData.length > 0) {
          const valMap = new Map<string, number>();
          const volMap = new Map<string, number>();
          for (const r of rawData as any[]) {
            const v = Math.abs(parseFloat(r.value_raw) || 0);
            if (r.chart_type === "TYPE_CHART_VALUE") {
              valMap.set(r.symbol, (valMap.get(r.symbol) || 0) + v);
            } else {
              volMap.set(r.symbol, (volMap.get(r.symbol) || 0) + v);
            }
          }
          const total = Array.from(valMap.values()).reduce((s, v) => s + v, 0);
          const rows = Array.from(valMap.entries())
            .map(([symbol, tv]) => ({
              broker_code: code,
              symbol,
              total_value: tv,
              total_volume: volMap.get(symbol) || 0,
              value_share: total > 0 ? (tv / total) * 100 : 0,
              rank: 0,
            }))
            .sort((a, b) => b.total_value - a.total_value)
            .map((r, i) => ({ ...r, rank: i + 1 }));
          setBrokerLookupStocks(rows as any);
          setLoadingBrokerLookup(false);
          return;
        }
      }
    }

    setBrokerLookupStocks([]);
    setLoadingBrokerLookup(false);
  }

  const baStats = useMemo(() => {
    if (baLeaderboard.length === 0) return null;
    const avgHHI =
      baLeaderboard.reduce((s, l) => s + l.hhi_score, 0) / baLeaderboard.length;
    const totalVal = baLeaderboard.reduce((s, l) => s + l.total_value, 0);
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

  const textColor = isDark ? "#737373" : "#737373";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tooltipStyle = {
    background: isDark ? "#141414" : "#f0eeeb",
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
          label={
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <span>Bandarmology</span>
              <Box
                component="span"
                sx={{
                  px: 0.65,
                  py: 0.15,
                  borderRadius: "4px",
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace',
                  letterSpacing: "0.05em",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.12)"),
                  color: (theme) => (theme.palette.mode === "dark" ? "#c9a227" : "#c9a227"),
                }}
              >
                BETA
              </Box>
            </Stack>
          }
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
                            stopColor="#c9a227"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#c9a227"
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
                        stroke="#c9a227"
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
                                  ? "#c9a227"
                                  : i === 1
                                    ? "#e0b83d"
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
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, justifyContent: "flex-end" }}>
                              <Box sx={{ flex: 1, minWidth: 44, maxWidth: 80 }}>
                                <Box sx={{ width: "100%", height: 6, borderRadius: 3, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                                  <Box sx={{ width: `${barPct}%`, height: "100%", borderRadius: 3, bgcolor: i < 3 ? "#c9a227" : i < 10 ? "#e0b83d" : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)", transition: "width 0.3s ease" }} />
                                </Box>
                              </Box>
                              <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, minWidth: 52, textAlign: "right" }}>
                                {formatValue(broker.totalValue)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              display: { xs: "none", md: "table-cell" },
                            }}
                          >
                            {(() => {
                              const maxVol = Math.max(...brokerAggregates.map((x) => x.totalVolume), 1);
                              const volPct = maxVol > 0 ? (broker.totalVolume / maxVol) * 100 : 0;
                              return (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, justifyContent: "flex-end" }}>
                                  <Box sx={{ flex: 1, minWidth: 44, maxWidth: 80 }}>
                                    <Box sx={{ width: "100%", height: 5, borderRadius: 2.5, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                                      <Box sx={{ width: `${volPct}%`, height: "100%", borderRadius: 2.5, bgcolor: isDark ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)", transition: "width 0.3s ease" }} />
                                    </Box>
                                  </Box>
                                  <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', minWidth: 48, textAlign: "right" }}>
                                    {formatShares(broker.totalVolume)}
                                  </Typography>
                                </Box>
                              );
                            })()}
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
                                          ? "#c9a227"
                                          : i < 10
                                            ? "#e0b83d"
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
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    minHeight: 38,
                    bgcolor: isDark ? "rgba(13,20,37,0.8)" : "background.paper",
                    fontSize: "0.82rem",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: isDark ? "rgba(17,27,48,0.9)" : "background.paper",
                    },
                    "&.Mui-focused": {
                      bgcolor: isDark ? "rgba(17,27,48,1)" : "background.paper",
                      boxShadow: isDark
                        ? "0 0 0 2px rgba(212,168,67,0.15)"
                        : "0 0 0 2px rgba(161,124,47,0.1)",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: isDark ? "rgba(212,168,67,0.25)" : "rgba(161,124,47,0.2)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "primary.main",
                      borderWidth: 1,
                    },
                  },
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
              <Chip
                label="Custom"
                size="small"
                onClick={() => {
                  setActDateRange("custom");
                  if (!actCustomFrom) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - 1);
                    setActCustomFrom(d.toISOString().split("T")[0]);
                  }
                  if (!actCustomTo) setActCustomTo(new Date().toISOString().split("T")[0]);
                }}
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700, fontSize: "0.69rem", height: 28, px: 0.2, cursor: "pointer",
                  bgcolor: actDateRange === "custom" ? (isDark ? "rgba(212,168,67,0.18)" : "rgba(161,124,47,0.11)") : "transparent",
                  color: actDateRange === "custom" ? "primary.main" : "text.secondary",
                  border: "1px solid", borderColor: actDateRange === "custom" ? "primary.main" : "transparent",
                }}
              />
              {actDateRange === "custom" && (
                <>
                  <TextField
                    type="date"
                    size="small"
                    value={actCustomFrom}
                    onChange={(e) => setActCustomFrom(e.target.value)}
                    sx={{
                      width: 140,
                      "& .MuiOutlinedInput-root": { borderRadius: 2, height: 28, fontSize: "0.72rem" },
                      "& input": { fontFamily: '"JetBrains Mono", monospace', py: 0, px: 1 },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>to</Typography>
                  <TextField
                    type="date"
                    size="small"
                    value={actCustomTo}
                    onChange={(e) => setActCustomTo(e.target.value)}
                    sx={{
                      width: 140,
                      "& .MuiOutlinedInput-root": { borderRadius: 2, height: 28, fontSize: "0.72rem" },
                      "& input": { fontFamily: '"JetBrains Mono", monospace', py: 0, px: 1 },
                    }}
                  />
                </>
              )}
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
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          minHeight: 34,
                          bgcolor: isDark ? "rgba(13,20,37,0.8)" : "background.paper",
                          fontSize: "0.82rem",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            bgcolor: isDark ? "rgba(17,27,48,0.9)" : "background.paper",
                          },
                          "&.Mui-focused": {
                            bgcolor: isDark ? "rgba(17,27,48,1)" : "background.paper",
                            boxShadow: isDark
                              ? "0 0 0 2px rgba(212,168,67,0.15)"
                              : "0 0 0 2px rgba(161,124,47,0.1)",
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: isDark ? "rgba(212,168,67,0.25)" : "rgba(161,124,47,0.2)",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "primary.main",
                            borderWidth: 1,
                          },
                        },
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
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: 8, color: isDark ? "#c8cdd5" : "#4a5568" }} />
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

              {(actBuyRows.length > 0 || actSellRows.length > 0) && (() => {
                const maxBVal = actBuyRows.length ? Math.max(...actBuyRows.map((r) => r.b_val)) : 1;
                const maxSVal = actSellRows.length ? Math.max(...actSellRows.map((r) => r.s_val)) : 1;
                return (
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
                          const bValPct = b && maxBVal > 0 ? (b.b_val / maxBVal) * 100 : 0;
                          const sValPct = s && maxSVal > 0 ? (s.s_val / maxSVal) * 100 : 0;
                          return (
                          <TableRow key={`${b?.symbol || "b"}-${s?.symbol || "s"}-${i}`}>
                            <TableCell>
                              <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: "#22c55e" }}>
                                {b?.symbol || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ minWidth: 130 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
                                <Box sx={{ flex: 1, minWidth: 48, maxWidth: 80 }}>
                                  <Box sx={{ width: "100%", height: 5, borderRadius: 2.5, bgcolor: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.1)", overflow: "hidden" }}>
                                    <Box sx={{ width: `${bValPct}%`, height: "100%", borderRadius: 2.5, bgcolor: "#22c55e", transition: "width 0.3s ease" }} />
                                  </Box>
                                </Box>
                                <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "#22c55e", minWidth: 48 }}>
                                  {b ? formatValue(b.b_val) : "-"}
                                </Typography>
                              </Box>
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
                            <TableCell align="right" sx={{ minWidth: 130 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
                                <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "#ef4444", minWidth: 48 }}>
                                  {s ? formatValue(s.s_val) : "-"}
                                </Typography>
                                <Box sx={{ flex: 1, minWidth: 48, maxWidth: 80 }}>
                                  <Box sx={{ width: "100%", height: 5, borderRadius: 2.5, bgcolor: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.1)", overflow: "hidden", display: "flex", flexDirection: "row-reverse" }}>
                                    <Box sx={{ width: `${sValPct}%`, height: "100%", borderRadius: 2.5, bgcolor: "#ef4444", transition: "width 0.3s ease" }} />
                                  </Box>
                                </Box>
                              </Box>
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
                );
              })()}
            </>
          )}

        </Stack>
      )}

      {tab === 2 && (() => {
        const baFiltered = baEntries.filter(e => !baSearch || e.symbol.includes(baSearch.toUpperCase()));
        const baTotalPages = Math.max(1, Math.ceil(baFiltered.length / BA_PAGE_SIZE));
        const baPageSlice = baFiltered.slice(baPage * BA_PAGE_SIZE, (baPage + 1) * BA_PAGE_SIZE);

        function handleCsvDownload() {
          const header = "Rank,Symbol,Price,Change%,Accum Ratio,Top Buyer,Buyer Share%,Buyers,Sellers,Participation%,Signal";
          const rows = baFiltered.map((e, i) =>
            `${i + 1},${e.symbol},${e.price},${e.change_pct.toFixed(2)},${e.accum_ratio.toFixed(2)},${e.top_buyer},${e.top_buyer_share.toFixed(1)},${e.buyer_count},${e.seller_count},${e.buyer_participation.toFixed(1)},${e.signal}`
          );
          const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `bandarmology_${baCategory}_${baDashPeriod}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }

        function handleCopyTickers() {
          const tickers = baFiltered.map(e => e.symbol).join(", ");
          navigator.clipboard.writeText(tickers);
          setBaCopied(true);
          setTimeout(() => setBaCopied(false), 1800);
        }

        return (
        <Stack spacing={2.5} className="animate-in">
          <Box sx={{
            display: "inline-flex", borderRadius: 2, overflow: "hidden", alignSelf: "flex-start",
            border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
            bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          }}>
            {([{ key: "dashboard", label: "Dashboard Transaksi" }, { key: "network", label: "Broker Network" }, { key: "lookup", label: "Broker Lookup" }] as const).map((t) => (
              <Box key={t.key} onClick={() => setBaView(t.key)} sx={{
                px: 2, py: 0.7, cursor: "pointer", fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.72rem", fontWeight: 700, transition: "all 0.15s ease", whiteSpace: "nowrap",
                color: baView === t.key ? (isDark ? "#fff" : "#1c1c1a") : "text.secondary",
                bgcolor: baView === t.key ? (isDark ? "rgba(212,168,67,0.18)" : "rgba(161,124,47,0.12)") : "transparent",
                borderRight: "1px solid", borderRightColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                "&:last-child": { borderRight: "none" },
                "&:hover": { bgcolor: baView === t.key ? undefined : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") },
              }}>{t.label}</Box>
            ))}
          </Box>

          {baView === "dashboard" && (
          <Paper sx={{ p: 0, borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: "-0.01em" }}>Dashboard Transaksi</Typography>
                  {baUpdateDate && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.62rem", fontFamily: '"JetBrains Mono", monospace' }}>
                      Data per {new Date(baUpdateDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </Typography>
                  )}
                </Stack>
                {loadingBA && (
                  <Box sx={{ px: 1.5, py: 0.3, borderRadius: 1, fontSize: "0.6rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', bgcolor: isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.06)", color: "primary.main" }}>LOADING...</Box>
                )}
              </Stack>
            </Box>

            <Box sx={{ px: 2.5, py: 1.25, borderBottom: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Box sx={{
                  display: "inline-flex", borderRadius: 2, overflow: "hidden",
                  border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                }}>
                  {BA_CATEGORIES.map((cat) => (
                    <Box key={cat.key} onClick={() => { setBaCategory(cat.key); setBaPage(0); setBaSearch(""); }} sx={{
                      px: 1.5, py: 0.5, cursor: "pointer", fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.65rem", fontWeight: 600, transition: "all 0.15s ease", whiteSpace: "nowrap",
                      color: baCategory === cat.key ? (isDark ? "#fff" : "#1c1c1a") : "text.secondary",
                      bgcolor: baCategory === cat.key
                        ? (cat.key === "foreign" ? (isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.1)") : (isDark ? "rgba(212,168,67,0.18)" : "rgba(161,124,47,0.12)"))
                        : "transparent",
                      borderRight: "1px solid", borderRightColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                      "&:last-child": { borderRight: "none" },
                      "&:hover": { bgcolor: baCategory === cat.key ? undefined : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") },
                    }}>{cat.label}</Box>
                  ))}
                </Box>
                <Box sx={{
                  display: "inline-flex", borderRadius: 2, overflow: "hidden",
                  border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                }}>
                  {BA_PERIOD_TOGGLE.map((p) => (
                    <Box key={p.key} onClick={() => { setBaDashPeriod(p.key); setBaPage(0); setBaSearch(""); }} sx={{
                      px: 1.25, py: 0.5, cursor: "pointer", fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.65rem", fontWeight: 600, transition: "all 0.15s ease", whiteSpace: "nowrap",
                      color: baDashPeriod === p.key ? (isDark ? "#fff" : "#1c1c1a") : "text.secondary",
                      bgcolor: baDashPeriod === p.key ? (isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.1)") : "transparent",
                      borderRight: "1px solid", borderRightColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                      "&:last-child": { borderRight: "none" },
                      "&:hover": { bgcolor: baDashPeriod === p.key ? undefined : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") },
                    }}>{p.label}</Box>
                  ))}
                </Box>
                <Box sx={{
                  display: "inline-flex", borderRadius: 2, overflow: "hidden",
                  border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                }}>
                  {BA_SIGNAL_FILTER.map((sf) => (
                    <Box key={sf.key} onClick={() => { setBaSignalFilter(sf.key); setBaPage(0); setBaSearch(""); }} sx={{
                      px: 1.25, py: 0.5, cursor: "pointer", fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.65rem", fontWeight: 600, transition: "all 0.15s ease", whiteSpace: "nowrap",
                      color: baSignalFilter === sf.key ? (isDark ? "#fff" : "#1c1c1a") : "text.secondary",
                      bgcolor: baSignalFilter === sf.key
                        ? (sf.key === "accumulation"
                          ? (isDark ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.1)")
                          : sf.key === "distribution"
                            ? (isDark ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.1)")
                            : (isDark ? "rgba(148,163,184,0.18)" : "rgba(100,116,139,0.1)"))
                        : "transparent",
                      borderRight: "1px solid", borderRightColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                      "&:last-child": { borderRight: "none" },
                      "&:hover": { bgcolor: baSignalFilter === sf.key ? undefined : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") },
                    }}>{sf.label}</Box>
                  ))}
                </Box>
              </Stack>
            </Box>

            <Box sx={{ px: 2.5, py: 1, borderBottom: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField size="small" placeholder="Cari ticker..." value={baSearch}
                    onChange={(e) => { setBaSearch(e.target.value); setBaPage(0); }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      width: 180,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2, height: 30, fontSize: "0.72rem",
                        bgcolor: isDark ? "rgba(13,20,37,0.8)" : "background.paper",
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" },
                      },
                      "& input": { fontFamily: '"JetBrains Mono", monospace', py: 0, px: 0.5, textTransform: "uppercase" },
                    }}
                  />
                  <Box sx={{
                    px: 1, py: 0.2, borderRadius: 1, fontSize: "0.6rem", fontWeight: 700,
                    fontFamily: '"JetBrains Mono", monospace',
                    bgcolor: isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.06)",
                    color: "primary.main",
                  }}>{baFiltered.length} saham</Box>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title={baCopied ? "Copied!" : "Copy all tickers"} arrow>
                    <IconButton size="small" onClick={handleCopyTickers} sx={{ color: baCopied ? "#22c55e" : "text.secondary" }}>
                      <ContentCopyIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download CSV" arrow>
                    <IconButton size="small" onClick={handleCsvDownload} sx={{ color: "text.secondary" }}>
                      <FileDownloadIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>

            {loadingBA ? (
              <Stack spacing={0} sx={{ px: 2.5, py: 1.5 }}>
                {Array.from({ length: BA_PAGE_SIZE }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={40} sx={{ borderRadius: 1.5, mb: 0.5 }} />
                ))}
              </Stack>
            ) : baFiltered.length === 0 ? (
              <Box sx={{ py: 5, textAlign: "center" }}>
                <Typography color="text.secondary" sx={{ fontSize: "0.82rem" }}>
                  {baSearch ? "Tidak ada ticker yang cocok" : "Tidak ada data akumulasi"}
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size="small" sx={{ "& th, & td": { fontFamily: '"JetBrains Mono", monospace', borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" } }}>
                    <TableHead>
                      <TableRow sx={{ "& th": { fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "text.secondary", py: 0.75, whiteSpace: "nowrap" } }}>
                        <TableCell sx={{ width: 36, pl: 2.5 }}>#</TableCell>
                        <TableCell sx={{ width: 30 }} />
                        <TableCell>Tick</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">%Chg</TableCell>
                        <TableCell align="center">
                          <Tooltip title="Top3 Buyers / Top3 Sellers. >1.5 = Accumulation, <0.7 = Distribution" arrow placement="top">
                            <span>Ratio</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                          <Tooltip title="Top buyer broker and their share of total buy-side activity" arrow placement="top">
                            <span>Top Buyer</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                          <Tooltip title="Number of net buyers / net sellers" arrow placement="top">
                            <span>B/S</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">Signal</TableCell>
                        <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                          <Tooltip title="Market regime: Accumulation / Markup / Distribution / Markdown" arrow placement="top">
                            <span>Regime</span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {baPageSlice.map((entry, idx) => {
                        const globalIdx = baPage * BA_PAGE_SIZE + idx;
                        const chgColor = entry.change_pct > 0 ? "#22c55e" : entry.change_pct < 0 ? "#ef4444" : "text.secondary";
                        const ratioColor = entry.accum_ratio >= 1.5 ? "#22c55e" : entry.accum_ratio >= 1.0 ? "#f59e0b" : "#ef4444";
                        const signalConfig = entry.signal === "accumulation"
                          ? { label: "Akumulasi", bg: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)", color: "#22c55e" }
                          : entry.signal === "distribution"
                          ? { label: "Distribusi", bg: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)", color: "#ef4444" }
                          : { label: "Netral", bg: isDark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.06)", color: "#94a3b8" };
                        const regime = regimeMap.get(entry.symbol);
                        const regimeConfig: Record<string, { label: string; color: string; bg: string }> = {
                          accumulation: { label: "Akumulasi", color: "#22c55e", bg: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)" },
                          markup: { label: "Markup", color: "#3b82f6", bg: isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)" },
                          distribution: { label: "Distribusi", color: "#ef4444", bg: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)" },
                          markdown: { label: "Markdown", color: "#f97316", bg: isDark ? "rgba(249,115,22,0.12)" : "rgba(249,115,22,0.08)" },
                          neutral: { label: "Netral", color: "#94a3b8", bg: isDark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.06)" },
                        };
                        const rc = regimeConfig[regime?.regime || "neutral"] || regimeConfig.neutral;
                        const cluster = clusterMap.get(entry.top_buyer);
                        return (
                          <TableRow key={entry.symbol} sx={{
                            cursor: "pointer", transition: "background 0.12s ease",
                            "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" },
                          }}>
                            <TableCell sx={{ pl: 2.5, fontSize: "0.7rem", color: globalIdx < 3 ? "primary.main" : "text.secondary", fontWeight: globalIdx < 3 ? 700 : 400 }}>
                              {globalIdx + 1}
                            </TableCell>
                            <TableCell sx={{ px: 0 }}>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleWatchlist(entry.symbol); }} sx={{ p: 0.25 }}>
                                {isWatched(entry.symbol) ? <StarIcon sx={{ fontSize: 14, color: "#c9a227" }} /> : <StarBorderIcon sx={{ fontSize: 14, color: "text.disabled" }} />}
                              </IconButton>
                            </TableCell>
                            <TableCell onClick={() => router.push(`/stock/${entry.symbol}`)} sx={{ fontWeight: 700, fontSize: "0.78rem", color: "primary.main" }}>
                              {entry.symbol}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: "0.72rem" }}>
                              {entry.price > 0 ? entry.price.toLocaleString("id-ID") : "-"}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: "0.72rem", color: chgColor, fontWeight: 600 }}>
                              {entry.change_pct !== 0 ? `${entry.change_pct > 0 ? "+" : ""}${entry.change_pct.toFixed(2)}%` : "0.00%"}
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{
                                display: "inline-flex", alignItems: "center", gap: 0.5,
                                px: 0.75, py: 0.2, borderRadius: 1,
                                bgcolor: isDark ? `${ratioColor}18` : `${ratioColor}12`,
                              }}>
                                <Box sx={{ width: 28, height: 4, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                                  <Box sx={{ width: `${Math.min((entry.accum_ratio / 3) * 100, 100)}%`, height: "100%", borderRadius: 2, bgcolor: ratioColor, transition: "width 0.3s ease" }} />
                                </Box>
                                <Typography component="span" sx={{ fontSize: "0.68rem", fontWeight: 700, color: ratioColor, fontFamily: '"JetBrains Mono", monospace' }}>
                                  {entry.accum_ratio >= 99 ? "99+" : entry.accum_ratio.toFixed(2)}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                              <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                <Tooltip title={cluster ? `${cluster.cluster_label} (${cluster.cluster_size} linked brokers)` : ""} arrow placement="top">
                                  <Box sx={{
                                    px: 0.75, py: 0.15, borderRadius: 0.75, fontSize: "0.62rem", fontWeight: 700,
                                    bgcolor: isDark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.06)", color: "#22c55e",
                                    border: cluster ? "1px dashed" : "none",
                                    borderColor: isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)",
                                  }}>{entry.top_buyer}{cluster ? ` [${cluster.cluster_label.replace("Cluster ", "")}]` : ""}</Box>
                                </Tooltip>
                                <Typography component="span" sx={{ fontSize: "0.58rem", color: "text.secondary" }}>
                                  {entry.top_buyer_share.toFixed(0)}%
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                              <Typography component="span" sx={{ fontSize: "0.68rem", fontWeight: 600 }}>
                                <Box component="span" sx={{ color: "#22c55e" }}>{entry.buyer_count}</Box>
                                <Box component="span" sx={{ color: "text.disabled", mx: 0.25 }}>/</Box>
                                <Box component="span" sx={{ color: "#ef4444" }}>{entry.seller_count}</Box>
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{
                                display: "inline-block", px: 0.75, py: 0.2, borderRadius: 1,
                                fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.02em",
                                bgcolor: signalConfig.bg, color: signalConfig.color,
                              }}>{signalConfig.label}</Box>
                            </TableCell>
                            <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                              <Tooltip title={regime ? `Confidence: ${(regime.confidence_score * 100).toFixed(0)}%` : "No regime data"} arrow placement="top">
                                <Box sx={{
                                  display: "inline-block", px: 0.75, py: 0.2, borderRadius: 0.75,
                                  fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.02em",
                                  bgcolor: rc.bg, color: rc.color,
                                  fontFamily: '"JetBrains Mono", monospace',
                                }}>{rc.label}</Box>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ px: 2.5, py: 1.25, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", fontFamily: '"JetBrains Mono", monospace' }}>
                    {baPage * BA_PAGE_SIZE + 1}-{Math.min((baPage + 1) * BA_PAGE_SIZE, baFiltered.length)} of {baFiltered.length}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconButton size="small" disabled={baPage === 0} onClick={() => setBaPage(0)} sx={{ p: 0.3 }}>
                      <ArrowBackIosNewIcon sx={{ fontSize: 11 }} />
                    </IconButton>
                    <IconButton size="small" disabled={baPage === 0} onClick={() => setBaPage(p => p - 1)} sx={{ p: 0.3 }}>
                      <ArrowBackIosNewIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                    {Array.from({ length: Math.min(5, baTotalPages) }, (_, i) => {
                      let pageNum: number;
                      if (baTotalPages <= 5) {
                        pageNum = i;
                      } else if (baPage < 3) {
                        pageNum = i;
                      } else if (baPage > baTotalPages - 4) {
                        pageNum = baTotalPages - 5 + i;
                      } else {
                        pageNum = baPage - 2 + i;
                      }
                      return (
                        <Box key={pageNum} onClick={() => setBaPage(pageNum)} sx={{
                          width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: 1, cursor: "pointer", fontSize: "0.65rem", fontWeight: 700,
                          fontFamily: '"JetBrains Mono", monospace', transition: "all 0.12s ease",
                          color: baPage === pageNum ? (isDark ? "#fff" : "#1c1c1a") : "text.secondary",
                          bgcolor: baPage === pageNum ? (isDark ? "rgba(212,168,67,0.18)" : "rgba(161,124,47,0.12)") : "transparent",
                          "&:hover": { bgcolor: baPage === pageNum ? undefined : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)") },
                        }}>{pageNum + 1}</Box>
                      );
                    })}
                    <IconButton size="small" disabled={baPage >= baTotalPages - 1} onClick={() => setBaPage(p => p + 1)} sx={{ p: 0.3 }}>
                      <ArrowForwardIosIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                    <IconButton size="small" disabled={baPage >= baTotalPages - 1} onClick={() => setBaPage(baTotalPages - 1)} sx={{ p: 0.3 }}>
                      <ArrowForwardIosIcon sx={{ fontSize: 11 }} />
                    </IconButton>
                  </Stack>
                </Box>
              </>
            )}
          </Paper>
          )}

          {baView === "network" && (
          <Paper sx={{ p: 0, borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: "-0.01em" }}>Broker Correlation Network</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.62rem", fontFamily: '"JetBrains Mono", monospace' }}>
                    Pearson correlation of net_value vectors across all symbols (1M period)
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem" }}>
                    Min Correlation:
                  </Typography>
                  {[0.3, 0.5, 0.7].map((v) => (
                    <Box key={v} onClick={() => setClusterMinCorr(v)} sx={{
                      px: 1, py: 0.3, cursor: "pointer", fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.62rem", fontWeight: 600, borderRadius: 1, transition: "all 0.15s ease",
                      color: clusterMinCorr === v ? (isDark ? "#fff" : "#1c1c1a") : "text.secondary",
                      bgcolor: clusterMinCorr === v ? (isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.1)") : "transparent",
                      border: "1px solid", borderColor: clusterMinCorr === v ? (isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)") : "transparent",
                      "&:hover": { bgcolor: clusterMinCorr === v ? undefined : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") },
                    }}>{v.toFixed(1)}</Box>
                  ))}
                </Stack>
              </Stack>
            </Box>

            {/* Beginner-friendly explainer */}
            <Box sx={{ px: 2.5, py: 1.2, bgcolor: isDark ? "rgba(99,102,241,0.04)" : "rgba(99,102,241,0.03)", borderBottom: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}>
              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.66rem", color: "text.secondary", lineHeight: 1.7 }}>
                This graph maps which brokers trade <strong style={{ color: isDark ? "#a5b4fc" : "#6366f1" }}>the same stocks in the same direction</strong> at the same time.
                Brokers connected by lines have highly correlated trading patterns -- they may represent <strong style={{ color: isDark ? "#a5b4fc" : "#6366f1" }}>the same institution</strong> splitting orders across multiple broker codes.
                Same-colored groups (&quot;clusters&quot;) are brokers that consistently move together. A higher correlation threshold filters out weaker connections.
                Hover over any node to see its relationships.
              </Typography>
            </Box>

            {loadingClusters ? (
              <Box sx={{ p: 3 }}>
                <Skeleton variant="rounded" height={500} sx={{ borderRadius: 2 }} />
              </Box>
            ) : clusterData && networkGraphData ? (() => {
              const { nodes } = networkGraphData;
              return (
                <Box>
                  <Box sx={{ height: 520, position: "relative" }}>
                    <ForceGraph2D
                      ref={graphRef}
                      graphData={networkGraphData}
                      width={typeof window !== "undefined" ? Math.min(window.innerWidth - 48, 1200) : 1200}
                      height={520}
                      backgroundColor="rgba(0,0,0,0)"
                      nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                        const hovered = hoveredBrokerRef.current;
                        const x = node.x as number;
                        const y = node.y as number;
                        const r = 3 + node.size * 1.5;
                        const isHovered = hovered === node.id;

                        let isNeighbor = false;
                        if (hovered) {
                          if (hovered === node.id) { isNeighbor = true; }
                          else {
                            const nbrs = neighborMapRef.current.get(hovered);
                            if (nbrs) isNeighbor = nbrs.some((n) => n.code === node.id);
                          }
                        }
                        const isDimmed = hovered && !isNeighbor;

                        ctx.globalAlpha = isDimmed ? 0.12 : 1;
                        ctx.beginPath();
                        ctx.arc(x, y, isHovered ? r + 2 : r, 0, 2 * Math.PI);
                        ctx.fillStyle = node.color;
                        ctx.fill();
                        if (node.isForeign) {
                          ctx.strokeStyle = isDark ? "#e0b83d" : "#c9a227";
                          ctx.lineWidth = 1.5;
                          ctx.stroke();
                        }
                        if (isHovered) {
                          ctx.strokeStyle = isDark ? "#fff" : "#1c1c1a";
                          ctx.lineWidth = 2;
                          ctx.stroke();
                        }
                        const fontSize = Math.max(10 / globalScale, 3);
                        ctx.font = `${isHovered || isNeighbor ? "700" : "500"} ${isHovered ? fontSize * 1.2 : fontSize}px "JetBrains Mono", monospace`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "top";
                        ctx.fillStyle = isDimmed
                          ? (isDark ? "rgba(232,237,245,0.15)" : "rgba(12,18,34,0.12)")
                          : (isDark ? "rgba(232,237,245,0.9)" : "rgba(12,18,34,0.85)");
                        ctx.fillText(node.id, x, y + (isHovered ? r + 4 : r + 2));
                        ctx.globalAlpha = 1;
                      }}
                      nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                        const r = 8 + node.size * 1.5;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                        ctx.fillStyle = color;
                        ctx.fill();
                      }}
                      linkCanvasObjectMode={() => "replace"}
                      linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
                        const hovered = hoveredBrokerRef.current;
                        const src = link.source;
                        const tgt = link.target;
                        if (!src || !tgt || src.x == null || tgt.x == null) return;

                        const srcId = typeof src === "string" ? src : src.id;
                        const tgtId = typeof tgt === "string" ? tgt : tgt.id;
                        const isActive = hovered && (srcId === hovered || tgtId === hovered);
                        const isDimmedEdge = hovered && !isActive;

                        if (isDimmedEdge) {
                          ctx.globalAlpha = 0.04;
                        }

                        const w = isActive ? 1.5 + link.value * 3 : 0.5 + link.value * 2;
                        const a = isActive ? 0.5 + link.value * 0.5 : 0.08 + link.value * 0.3;
                        ctx.beginPath();
                        ctx.moveTo(src.x, src.y);
                        ctx.lineTo(tgt.x, tgt.y);
                        ctx.strokeStyle = isActive
                          ? (isDark ? `rgba(165,180,252,${a})` : `rgba(99,102,241,${a})`)
                          : (isDark ? `rgba(107,127,163,${a})` : `rgba(84,98,128,${a})`);
                        ctx.lineWidth = w;
                        ctx.stroke();

                        if (isActive && link.value >= 0.6) {
                          const mx = (src.x + tgt.x) / 2;
                          const my = (src.y + tgt.y) / 2;
                          ctx.font = '600 8px "JetBrains Mono", monospace';
                          ctx.textAlign = "center";
                          ctx.textBaseline = "middle";
                          ctx.fillStyle = isDark ? "rgba(165,180,252,0.8)" : "rgba(99,102,241,0.7)";
                          ctx.fillText((link.value as number).toFixed(2), mx, my - 6);
                        }

                        ctx.globalAlpha = 1;
                      }}
                      onNodeHover={(node: any) => {
                        const id = node ? (node.id as string) : null;
                        const prev = hoveredBrokerRef.current;
                        hoveredBrokerRef.current = id;
                        if (id !== prev) {
                          setTooltipBroker(id);
                        }
                      }}
                      onNodeClick={(node: any) => {
                        if (node?.id) openBrokerModal(node.id as string);
                      }}
                      cooldownTicks={100}
                      enableZoomInteraction={true}
                      enablePanInteraction={true}
                      enableNodeDrag={true}
                      minZoom={0.3}
                      maxZoom={5}
                    />

                    {/* Tooltip overlay on hover */}
                    {tooltipBroker && (() => {
                      const nd = nodes.find((n) => n.id === tooltipBroker);
                      if (!nd) return null;
                      const meta = clusterData.brokerNames[tooltipBroker];
                      const nbrs = nd.topNeighbors;
                      const corrLabel = nd.avgCorr >= 0.8 ? "Very strong" : nd.avgCorr >= 0.6 ? "Strong" : nd.avgCorr >= 0.4 ? "Moderate" : "Weak";

                      return (
                        <Box sx={{
                          position: "absolute", top: 12, right: 12,
                          bgcolor: isDark ? "rgba(15,20,35,0.95)" : "rgba(255,255,255,0.97)",
                          border: `1px solid ${isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.1)"}`,
                          borderRadius: 2, px: 2, py: 1.5, maxWidth: 300, zIndex: 20,
                          backdropFilter: "blur(8px)",
                          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.08)",
                        }}>
                          <Stack spacing={1}>
                            <Box>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.82rem", color: nd.color }}>
                                {tooltipBroker}
                              </Typography>
                              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.66rem", color: "text.secondary", lineHeight: 1.3 }}>
                                {meta?.name || "Unknown broker"}{meta?.isForeign ? " (Foreign)" : " (Local)"}
                              </Typography>
                            </Box>

                            <Box sx={{ bgcolor: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.04)", borderRadius: 1.5, px: 1.2, py: 0.8 }}>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box>
                                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.56rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}>Cluster</Typography>
                                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", fontWeight: 700, color: nd.color }}>{nd.clusterLabel}</Typography>
                                </Box>
                                <Box>
                                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.56rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}>Connections</Typography>
                                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", fontWeight: 700 }}>{nd.neighborCount}</Typography>
                                </Box>
                                <Box>
                                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.56rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}>Avg Corr</Typography>
                                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", fontWeight: 700, color: nd.avgCorr >= 0.8 ? "#22c55e" : nd.avgCorr >= 0.6 ? "#f59e0b" : "text.primary" }}>
                                    {nd.avgCorr.toFixed(3)}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Box>

                            {nbrs.length > 0 && (
                              <Box>
                                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.56rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.5 }}>
                                  Top correlated brokers
                                </Typography>
                                <Stack spacing={0.3}>
                                  {nbrs.map((n) => {
                                    const nMeta = clusterData.brokerNames[n.code];
                                    const nCluster = clusterMap.get(n.code);
                                    const sameCluster = nCluster?.cluster_id === nd.cluster;
                                    return (
                                      <Stack key={n.code} direction="row" spacing={0.75} alignItems="center" sx={{ py: 0.15 }}>
                                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: nCluster ? CLUSTER_COLORS_STABLE[(nCluster.cluster_id - 1) % CLUSTER_COLORS_STABLE.length] : (isDark ? "#64748b" : "#94a3b8"), flexShrink: 0 }} />
                                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem", fontWeight: 700, minWidth: 20 }}>{n.code}</Typography>
                                        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.56rem", color: "text.secondary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {nMeta?.name || ""}
                                        </Typography>
                                        <Typography sx={{
                                          fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", fontWeight: 700,
                                          color: n.corr >= 0.9 ? "#22c55e" : n.corr >= 0.7 ? "#f59e0b" : "text.secondary",
                                        }}>
                                          {n.corr.toFixed(3)}
                                        </Typography>
                                        {sameCluster && (
                                          <Box sx={{ px: 0.5, py: 0.1, borderRadius: 0.5, bgcolor: isDark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.46rem", fontWeight: 700, color: "#22c55e" }}>SAME GROUP</Typography>
                                          </Box>
                                        )}
                                      </Stack>
                                    );
                                  })}
                                </Stack>
                              </Box>
                            )}

                            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.58rem", color: "text.secondary", fontStyle: "italic", lineHeight: 1.5, borderTop: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", pt: 0.8, mt: 0.3 }}>
                              {corrLabel} correlation pattern.
                              {nd.cluster > 0
                                ? ` This broker likely shares the same controlling entity as other ${nd.clusterLabel} members -- they buy and sell the same stocks together.`
                                : " This broker does not strongly cluster with others."}
                              {meta?.isForeign ? " As a foreign broker, it typically channels institutional or offshore capital." : ""}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })()}
                  </Box>

                  <Box sx={{ px: 2.5, py: 1.5, borderTop: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}>
                    <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                      {clusterData.clusters.reduce((acc, c) => {
                        if (!acc.find((x) => x.id === c.cluster_id)) {
                          acc.push({ id: c.cluster_id, label: c.cluster_label, size: c.cluster_size, corr: c.avg_internal_correlation });
                        }
                        return acc;
                      }, [] as { id: number; label: string; size: number; corr: number }[]).map((cl) => (
                        <Box key={cl.id} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: CLUSTER_COLORS_STABLE[(cl.id - 1) % CLUSTER_COLORS_STABLE.length] }} />
                          <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", color: "text.secondary" }}>
                            {cl.label} ({cl.size} brokers)
                          </Typography>
                        </Box>
                      ))}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, ml: "auto" }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid", borderColor: isDark ? "#e0b83d" : "#c9a227", bgcolor: "transparent" }} />
                        <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", color: "text.secondary" }}>
                          Foreign
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Box sx={{ px: 2.5, py: 1.5, borderTop: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem", mb: 1.5, display: "block" }}>
                      Cluster Details
                    </Typography>
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.62rem", color: "text.secondary", mb: 1.5, lineHeight: 1.6 }}>
                      Each cluster represents a group of broker codes that trade nearly identically. In Indonesian markets, large players (&quot;bandar&quot;) often split
                      orders across multiple broker codes to hide their true position. A cluster with high avg correlation (&gt;0.85) strongly suggests these brokers
                      are controlled by the same entity.
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", fontWeight: 700 }}>Cluster</TableCell>
                            <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", fontWeight: 700 }}>Members</TableCell>
                            <TableCell align="center" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", fontWeight: 700 }}>Size</TableCell>
                            <TableCell align="center" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", fontWeight: 700 }}>Avg Corr</TableCell>
                            <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", fontWeight: 700 }}>Interpretation</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {clusterData.clusters.reduce((acc, c) => {
                            if (!acc.find((x) => x.cluster_id === c.cluster_id)) {
                              acc.push(c);
                            }
                            return acc;
                          }, [] as typeof clusterData.clusters).map((cl) => {
                            const members = clusterData.clusters.filter((c) => c.cluster_id === cl.cluster_id);
                            const avgC = parseFloat(String(cl.avg_internal_correlation));
                            const hasForeign = members.some((m) => clusterData.brokerNames[m.broker_code]?.isForeign);
                            const interpretation = avgC >= 0.9
                              ? "Almost certainly the same entity"
                              : avgC >= 0.8
                              ? "Very likely the same entity"
                              : avgC >= 0.7
                              ? "Likely coordinated trading"
                              : "Possibly related";
                            return (
                              <TableRow key={cl.cluster_id}>
                                <TableCell>
                                  <Stack direction="row" spacing={0.75} alignItems="center">
                                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: CLUSTER_COLORS_STABLE[(cl.cluster_id - 1) % CLUSTER_COLORS_STABLE.length] }} />
                                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.65rem" }}>
                                      {cl.cluster_label}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                    {members.map((m) => {
                                      const meta = clusterData.brokerNames[m.broker_code];
                                      return (
                                        <Tooltip key={m.broker_code} title={`${meta?.name || m.broker_code}${meta?.isForeign ? " (Foreign)" : " (Local)"}`} arrow>
                                          <Chip
                                            size="small"
                                            label={m.broker_code}
                                            sx={{
                                              height: 20, fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", fontWeight: 600,
                                              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                              border: meta?.isForeign ? "1px solid" : "none",
                                              borderColor: isDark ? "rgba(232,196,104,0.3)" : "rgba(212,168,67,0.3)",
                                            }}
                                          />
                                        </Tooltip>
                                      );
                                    })}
                                  </Stack>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.62rem" }}>
                                    {cl.cluster_size}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="caption" sx={{
                                    fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.62rem",
                                    color: avgC >= 0.8 ? "#22c55e" : avgC >= 0.7 ? "#f59e0b" : "text.secondary",
                                  }}>
                                    {avgC.toFixed(3)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.6rem", color: "text.secondary" }}>
                                    {interpretation}{hasForeign ? " (includes foreign broker)" : ""}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Box>
              );
            })() : (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary">No cluster data available</Typography>
              </Box>
            )}
          </Paper>
          )}

          {/* Broker Detail Modal */}
          <Dialog
            open={!!brokerModalCode}
            onClose={() => setBrokerModalCode(null)}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: isDark ? "#0c1222" : "#f0eeeb",
                borderRadius: 3,
                border: `1px solid ${isDark ? "rgba(107,127,163,0.15)" : "rgba(12,18,34,0.08)"}`,
                maxHeight: "90vh",
              },
            }}
          >
            <DialogContent sx={{ p: 0 }}>
              {brokerModalLoading ? (
                <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: "#c9a227" }} />
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", color: "text.secondary", mt: 1.5 }}>
                    Loading broker data...
                  </Typography>
                </Stack>
              ) : brokerModalCode && brokerModalData ? (() => {
                const bCode = brokerModalCode;
                const meta = brokerModalData.meta?.[bCode];
                const cl = clusterMap.get(bCode);
                const nbrs = neighborMapRef.current.get(bCode) || [];
                const topNbr = nbrs.sort((a: any, b: any) => b.corr - a.corr)?.[0];
                const topNbrCode = topNbr?.code;
                const topNbrCorr = topNbr?.corr || 0;
                const topNbrMeta = topNbrCode ? brokerModalData.meta?.[topNbrCode] : null;

                const stocks = (brokerModalData.stocks?.[bCode] || []) as { symbol: string; netValue: number; buyVal: number; sellVal: number }[];
                const topBuys = stocks.filter((s: any) => s.netValue > 0).slice(0, 10);
                const topSells = [...stocks.filter((s: any) => s.netValue < 0)].sort((a: any, b: any) => a.netValue - b.netValue).slice(0, 10);
                const topAll = [...topBuys, ...topSells].sort((a: any, b: any) => b.netValue - a.netValue);

                const flow = (brokerModalData.flow?.[bCode] || []) as { date: string; netValue: number }[];
                const pairFlow = topNbrCode ? (brokerModalData.flow?.[topNbrCode] || []) as { date: string; netValue: number }[] : [];

                const flowChartData = (() => {
                  const dateMap = new Map<string, Record<string, number>>();
                  for (const f of flow) {
                    if (!dateMap.has(f.date)) dateMap.set(f.date, {});
                    dateMap.get(f.date)![bCode] = f.netValue;
                  }
                  for (const f of pairFlow) {
                    if (!dateMap.has(f.date)) dateMap.set(f.date, {});
                    dateMap.get(f.date)![topNbrCode || ""] = f.netValue;
                  }
                  return [...dateMap.entries()]
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([date, vals]) => ({ date: date.slice(5), ...vals }));
                })();

                const pairComparison = brokerModalData.pairComparison as { symbol: string; a: number; b: number }[] | null;
                const sameDir = pairComparison?.filter((p: any) => (p.a > 0 && p.b > 0) || (p.a < 0 && p.b < 0)).length || 0;
                const total = pairComparison?.length || 1;
                const sameDirPct = Math.round((sameDir / total) * 100);

                const totalNetBuy = stocks.filter((s: any) => s.netValue > 0).reduce((s: number, v: any) => s + v.netValue, 0);
                const totalNetSell = Math.abs(stocks.filter((s: any) => s.netValue < 0).reduce((s: number, v: any) => s + v.netValue, 0));

                return (
                  <Box>
                    {/* Header */}
                    <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "1.3rem", color: cl ? CLUSTER_COLORS_STABLE[(cl.cluster_id - 1) % CLUSTER_COLORS_STABLE.length] : "#c9a227" }}>
                              {bCode}
                            </Typography>
                            {meta?.isForeign && (
                              <Chip size="small" label="Foreign" sx={{ height: 18, fontFamily: '"JetBrains Mono", monospace', fontSize: "0.52rem", fontWeight: 700, bgcolor: "rgba(224,184,61,0.12)", color: "#e0b83d", border: "1px solid rgba(224,184,61,0.25)" }} />
                            )}
                            {cl && (
                              <Chip size="small" label={cl.cluster_label} sx={{ height: 18, fontFamily: '"JetBrains Mono", monospace', fontSize: "0.52rem", fontWeight: 700, bgcolor: `${CLUSTER_COLORS_STABLE[(cl.cluster_id - 1) % CLUSTER_COLORS_STABLE.length]}15`, color: CLUSTER_COLORS_STABLE[(cl.cluster_id - 1) % CLUSTER_COLORS_STABLE.length], border: `1px solid ${CLUSTER_COLORS_STABLE[(cl.cluster_id - 1) % CLUSTER_COLORS_STABLE.length]}30` }} />
                            )}
                          </Stack>
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem", color: "text.secondary", mt: 0.3 }}>
                            {meta?.name || "Unknown broker"}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.52rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}>Net Buying</Typography>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.82rem", fontWeight: 700, color: "#22c55e" }}>{formatValue(totalNetBuy)}</Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.52rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}>Net Selling</Typography>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.82rem", fontWeight: 700, color: "#ef4444" }}>{formatValue(totalNetSell)}</Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    </Box>

                    {/* Top Stocks Bar Chart */}
                    <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}` }}>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem", fontWeight: 700, color: "#c9a227", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1.5 }}>
                        Top Stocks by Net Value (1M)
                      </Typography>
                      {topAll.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={topAll} layout="vertical" margin={{ left: 40, right: 20, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', fill: isDark ? "#9ca3af" : "#6b7280" }} stroke={isDark ? "#333" : "#ccc"} tickFormatter={(v: number) => formatValue(v)} />
                            <YAxis type="category" dataKey="symbol" tick={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fill: isDark ? "#c8cdd5" : "#374151" }} stroke={isDark ? "#333" : "#ccc"} width={38} />
                            <RechartsTooltip
                              contentStyle={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem", backgroundColor: isDark ? "#111827" : "#f0eeeb", color: isDark ? "#e8edf5" : "#1a1a2e", border: `1px solid ${isDark ? "#333" : "#ddd"}`, borderRadius: 8 }}
                              formatter={(value: number) => [formatValue(value), "Net Value"]}
                            />
                            <Bar dataKey="netValue" radius={[0, 3, 3, 0]}>
                              {topAll.map((entry: any, idx: number) => (
                                <RechartsCell key={idx} fill={entry.netValue >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.66rem", color: "text.secondary", textAlign: "center", py: 3 }}>No stock data</Typography>
                      )}
                    </Box>

                    {/* Daily Net Flow Chart */}
                    <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}` }}>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem", fontWeight: 700, color: "#c9a227", textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.3 }}>
                        Daily Net Flow Comparison
                      </Typography>
                      {topNbrCode && (
                        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.58rem", color: "text.secondary", mb: 1.5 }}>
                          {bCode} vs {topNbrCode} ({topNbrMeta?.name || topNbrCode}) -- correlation: {topNbrCorr.toFixed(3)}
                        </Typography>
                      )}
                      {flowChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <ComposedChart data={flowChartData} margin={{ left: 10, right: 10, top: 5, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
                            <XAxis dataKey="date" tick={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', fill: isDark ? "#9ca3af" : "#6b7280" }} stroke={isDark ? "#333" : "#ccc"} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', fill: isDark ? "#9ca3af" : "#6b7280" }} stroke={isDark ? "#333" : "#ccc"} tickFormatter={(v: number) => formatValue(v)} />
                            <RechartsTooltip
                              contentStyle={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem", backgroundColor: isDark ? "#111827" : "#f0eeeb", color: isDark ? "#e8edf5" : "#1a1a2e", border: `1px solid ${isDark ? "#333" : "#ddd"}`, borderRadius: 8 }}
                              formatter={(value: number, name: string) => [formatValue(value), name]}
                            />
                            <Legend wrapperStyle={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", color: isDark ? "#c8cdd5" : "#4a5568" }} />
                            <Line type="monotone" dataKey={bCode} stroke={cl ? CLUSTER_COLORS_STABLE[(cl.cluster_id - 1) % CLUSTER_COLORS_STABLE.length] : "#c9a227"} strokeWidth={2} dot={false} connectNulls />
                            {topNbrCode && (
                              <Line type="monotone" dataKey={topNbrCode} stroke={isDark ? "#94a3b8" : "#64748b"} strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />
                            )}
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.66rem", color: "text.secondary", textAlign: "center", py: 3 }}>No flow data</Typography>
                      )}
                    </Box>

                    {/* Correlation Evidence */}
                    {pairComparison && topNbrCode && (
                      <Box sx={{ px: 3, py: 2 }}>
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem", fontWeight: 700, color: "#c9a227", textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.3 }}>
                          Why They Correlate
                        </Typography>
                        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.62rem", color: "text.secondary", mb: 1.5, lineHeight: 1.6 }}>
                          Across their top {total} shared stocks, <strong>{bCode}</strong> and <strong>{topNbrCode}</strong> traded
                          in the <strong style={{ color: sameDirPct >= 70 ? "#22c55e" : sameDirPct >= 50 ? "#f59e0b" : "#ef4444" }}>same direction {sameDirPct}% of the time</strong>.
                          {sameDirPct >= 70 ? " This is strong evidence they are controlled by the same entity." : sameDirPct >= 50 ? " This suggests coordinated activity." : " The correlation may be coincidental for some stocks."}
                        </Typography>

                        <ResponsiveContainer width="100%" height={Math.max(180, pairComparison.length * 24 + 30)}>
                          <BarChart data={pairComparison} layout="vertical" margin={{ left: 45, right: 20, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', fill: isDark ? "#9ca3af" : "#6b7280" }} stroke={isDark ? "#333" : "#ccc"} tickFormatter={(v: number) => formatValue(v)} />
                            <YAxis type="category" dataKey="symbol" tick={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fill: isDark ? "#c8cdd5" : "#374151" }} stroke={isDark ? "#333" : "#ccc"} width={42} />
                            <RechartsTooltip
                              contentStyle={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem", backgroundColor: isDark ? "#111827" : "#f0eeeb", color: isDark ? "#e8edf5" : "#1a1a2e", border: `1px solid ${isDark ? "#333" : "#ddd"}`, borderRadius: 8 }}
                              formatter={(value: number, name: string) => [formatValue(value), name]}
                            />
                            <Legend wrapperStyle={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.56rem", color: isDark ? "#c8cdd5" : "#4a5568" }} />
                            <Bar dataKey="a" name={bCode} fill={cl ? CLUSTER_COLORS_STABLE[(cl.cluster_id - 1) % CLUSTER_COLORS_STABLE.length] : "#c9a227"} fillOpacity={0.8} radius={[0, 2, 2, 0]} barSize={8} />
                            <Bar dataKey="b" name={topNbrCode} fill={isDark ? "#64748b" : "#94a3b8"} fillOpacity={0.7} radius={[0, 2, 2, 0]} barSize={8} />
                          </BarChart>
                        </ResponsiveContainer>

                        {/* Per-stock direction indicators */}
                        <Stack direction="row" spacing={0.4} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                          {pairComparison.map((p: any) => {
                            const same = (p.a > 0 && p.b > 0) || (p.a < 0 && p.b < 0);
                            return (
                              <Tooltip key={p.symbol} title={`${bCode}: ${formatValue(p.a)} | ${topNbrCode}: ${formatValue(p.b)}`} arrow>
                                <Chip
                                  size="small"
                                  label={p.symbol}
                                  sx={{
                                    height: 20, fontFamily: '"JetBrains Mono", monospace', fontSize: "0.52rem", fontWeight: 700,
                                    bgcolor: same ? (isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.06)") : (isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)"),
                                    border: `1px solid ${same ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                                    color: same ? "#22c55e" : "#ef4444",
                                  }}
                                />
                              </Tooltip>
                            );
                          })}
                        </Stack>

                        <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22c55e", opacity: 0.7 }} />
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.52rem", color: "text.secondary" }}>Same direction</Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ef4444", opacity: 0.7 }} />
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.52rem", color: "text.secondary" }}>Opposite direction</Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                );
              })() : (
                <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", color: "text.secondary" }}>
                    Click on a broker node to view details
                  </Typography>
                </Stack>
              )}
            </DialogContent>
          </Dialog>

          {baView === "lookup" && (
          <Paper sx={{ p: 0, borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Broker Lookup</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5, fontSize: "0.68rem" }}>
                Select a broker to see their top traded stocks for the {baPeriod} period
              </Typography>
              <Autocomplete
                options={brokers}
                getOptionLabel={(opt) => `${opt.code} -- ${opt.name}`}
                filterOptions={(options, { inputValue }) => {
                  const q = inputValue.toUpperCase();
                  return options.filter((o) => o.code.includes(q) || o.name.toUpperCase().includes(q)).slice(0, 30);
                }}
                onChange={(_e, val) => {
                  if (val) {
                    setBrokerLookup(val.code);
                    handleBrokerLookup(val.code);
                  }
                }}
                renderOption={({ key: _key, ...props }, opt) => (
                  <Box component="li" key={opt.code} {...props} sx={{ display: "flex", gap: 1, alignItems: "center", py: 0.5 }}>
                    <Box sx={{
                      px: 0.75, py: 0.15, borderRadius: 0.75, fontSize: "0.68rem", fontWeight: 700,
                      fontFamily: '"JetBrains Mono", monospace',
                      bgcolor: isDark ? "rgba(212,168,67,0.12)" : "rgba(161,124,47,0.08)",
                      color: "primary.main", minWidth: 28, textAlign: "center",
                    }}>{opt.code}</Box>
                    <Typography variant="body2" sx={{ fontSize: "0.78rem" }}>{opt.name}</Typography>
                    {opt.is_foreign && (
                      <Box sx={{
                        px: 0.5, py: 0.1, borderRadius: 0.5, fontSize: "0.5rem", fontWeight: 700,
                        bgcolor: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
                        color: "#3b82f6", ml: "auto",
                      }}>FOREIGN</Box>
                    )}
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField {...params} size="small" placeholder="Search by broker code or name..."
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      },
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2, fontSize: "0.82rem",
                        bgcolor: isDark ? "rgba(13,20,37,0.8)" : "background.paper",
                        transition: "all 0.2s ease",
                        "&:hover": { bgcolor: isDark ? "rgba(17,27,48,0.9)" : "background.paper" },
                        "&.Mui-focused": {
                          bgcolor: isDark ? "rgba(17,27,48,1)" : "background.paper",
                          boxShadow: isDark ? "0 0 0 2px rgba(212,168,67,0.15)" : "0 0 0 2px rgba(161,124,47,0.1)",
                        },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "primary.main", borderWidth: 1,
                        },
                      },
                      "& input": { fontFamily: '"JetBrains Mono", monospace' },
                    }}
                  />
                )}
                sx={{
                  maxWidth: 420,
                  "& .MuiAutocomplete-paper": {
                    bgcolor: isDark ? "rgba(13,20,37,0.98)" : "background.paper",
                    borderRadius: 2,
                    border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                  },
                }}
                noOptionsText="No brokers found"
                loading={loadingBrokers}
              />
            </Box>

            {loadingBrokerLookup && (
              <Stack spacing={0} sx={{ px: 2.5, py: 1.5 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={40} sx={{ borderRadius: 1.5, mb: 0.5 }} />
                ))}
              </Stack>
            )}

            {brokerLookupCode && !loadingBrokerLookup && (
              <Box>
                <Box sx={{ px: 2.5, py: 1.25, borderBottom: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{
                      fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>Top stocks for</Typography>
                    <Box sx={{
                      px: 0.75, py: 0.15, borderRadius: 0.75, fontSize: "0.7rem", fontWeight: 700,
                      fontFamily: '"JetBrains Mono", monospace',
                      bgcolor: isDark ? "rgba(212,168,67,0.12)" : "rgba(161,124,47,0.08)",
                      color: "primary.main",
                    }}>{brokerLookupCode}</Box>
                    {(() => {
                      const b = brokers.find((br) => br.code === brokerLookupCode);
                      return b ? (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                          {b.name}
                        </Typography>
                      ) : null;
                    })()}
                  </Stack>
                </Box>

                {brokerLookupStocks.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                      No activity found for broker {brokerLookupCode} in {baPeriod}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Box sx={{
                      display: "grid", gridTemplateColumns: { xs: "32px 1fr 90px 120px", sm: "32px 1fr 100px 90px 140px" },
                      px: 2.5, py: 0.75, borderBottom: "1px solid",
                      borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                    }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.58rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>#</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.58rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Symbol</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.58rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>Value (IDR)</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.58rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right", display: { xs: "none", sm: "block" } }}>Volume</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.58rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>Share</Typography>
                    </Box>

                    <Box sx={{ maxHeight: 440, overflowY: "auto" }}>
                      {brokerLookupStocks.map((bs: any) => {
                        const maxVal = (brokerLookupStocks[0] as any)?.total_value || 1;
                        const barPct = Math.min((bs.total_value / maxVal) * 100, 100);
                        return (
                          <Box key={bs.symbol} onClick={() => router.push(`/stock/${bs.symbol}`)} sx={{
                            display: "grid", gridTemplateColumns: { xs: "32px 1fr 90px 120px", sm: "32px 1fr 100px 90px 140px" },
                            px: 2.5, py: 0.9, cursor: "pointer", alignItems: "center", position: "relative",
                            transition: "background 0.12s ease",
                            "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" },
                            borderBottom: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                            "&::before": {
                              content: '""', position: "absolute", left: 0, top: 0, bottom: 0,
                              width: `${barPct}%`, bgcolor: isDark ? "rgba(212,168,67,0.04)" : "rgba(161,124,47,0.04)",
                              zIndex: 0, transition: "width 0.3s ease",
                            },
                          }}>
                            <Typography variant="caption" sx={{
                              fontFamily: '"JetBrains Mono", monospace', zIndex: 1,
                              color: bs.rank <= 3 ? "primary.main" : "text.secondary",
                              fontWeight: bs.rank <= 3 ? 700 : 400, fontSize: "0.72rem",
                            }}>{bs.rank}</Typography>

                            <Typography variant="body2" sx={{
                              fontWeight: 700, fontFamily: '"JetBrains Mono", monospace',
                              fontSize: "0.8rem", color: "primary.main", zIndex: 1,
                            }}>{bs.symbol}</Typography>

                            <Tooltip title={`IDR ${bs.total_value.toLocaleString()}`} arrow placement="left">
                              <Typography variant="caption" sx={{
                                fontFamily: '"JetBrains Mono", monospace', fontWeight: 600,
                                color: "text.primary", textAlign: "right", zIndex: 1,
                              }}>{formatValue(bs.total_value)}</Typography>
                            </Tooltip>

                            <Typography variant="caption" sx={{
                              fontFamily: '"JetBrains Mono", monospace', textAlign: "right",
                              zIndex: 1, display: { xs: "none", sm: "block" },
                            }}>{bs.total_volume > 0 ? formatShares(bs.total_volume) : "-"}</Typography>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, zIndex: 1, justifyContent: "flex-end" }}>
                              <Box sx={{ flex: 1, minWidth: 40, maxWidth: 80 }}>
                                <LinearProgress variant="determinate" value={barPct} sx={{
                                  height: 5, borderRadius: 3,
                                  bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                                  "& .MuiLinearProgress-bar": { borderRadius: 3, bgcolor: "#c9a227" },
                                }} />
                              </Box>
                              <Typography variant="caption" sx={{
                                fontFamily: '"JetBrains Mono", monospace', color: "text.secondary",
                                minWidth: 38, textAlign: "right", fontSize: "0.6rem",
                              }}>{bs.value_share.toFixed(1)}%</Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </>
                )}
              </Box>
            )}
          </Paper>
          )}
        </Stack>
        );
      })()}

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
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: isDark ? "rgba(13,20,37,0.8)" : "background.paper",
                  fontSize: "0.82rem",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: isDark ? "rgba(17,27,48,0.9)" : "background.paper",
                  },
                  "&.Mui-focused": {
                    bgcolor: isDark ? "rgba(17,27,48,1)" : "background.paper",
                    boxShadow: isDark
                      ? "0 0 0 2px rgba(212,168,67,0.15)"
                      : "0 0 0 2px rgba(161,124,47,0.1)",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: isDark ? "rgba(212,168,67,0.25)" : "rgba(161,124,47,0.2)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "primary.main",
                    borderWidth: 1,
                  },
                },
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
  "#c9a227",
  "#e0b83d",
  "#e0b83d",
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
                      alignItems: (isLarge || isMedium) ? "flex-start" : "center",
                      justifyContent: "center",
                      px: isLarge ? 1.5 : isMedium ? 1 : 0.5,
                      py: isLarge ? 0.75 : 0.5,
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
                        textAlign: (isLarge || isMedium) ? "left" : "center",
                        flexShrink: 0,
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
                          lineHeight: 1.2,
                          flexShrink: 0,
                        }}
                      >
                        {r.pct.toFixed(1)}%
                      </Typography>
                    )}
                    {(isLarge || isMedium) && (
                      <Typography
                        sx={{
                          fontSize: isLarge ? "0.55rem" : "0.5rem",
                          color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.38)",
                          lineHeight: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "100%",
                          flexShrink: 1,
                          minHeight: 0,
                        }}
                      >
                        {r.name}
                      </Typography>
                    )}
                    {isLarge && (
                      <>
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)",
                            mt: 0.25,
                            flexShrink: 0,
                          }}
                        >
                          {formatValue(r.value)}
                        </Typography>
                        {!isOthers && (
                          <Box
                            sx={{
                              mt: 0.25,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              flexShrink: 0,
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
