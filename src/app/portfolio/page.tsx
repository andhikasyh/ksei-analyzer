"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { useProContext } from "@/lib/pro-context";
import { supabase } from "@/lib/supabase";
import { formatValue } from "@/lib/types";
import { computeFinancialScore } from "@/lib/scoring";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Divider from "@mui/material/Divider";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PieChartIcon from "@mui/icons-material/PieChart";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import HistoryIcon from "@mui/icons-material/History";
import RefreshIcon from "@mui/icons-material/Refresh";
import Collapse from "@mui/material/Collapse";
import SendIcon from "@mui/icons-material/Send";
import SaveIcon from "@mui/icons-material/Save";
import SellIcon from "@mui/icons-material/Sell";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip as RTooltip, CartesianGrid } from "recharts";

const SHARES_PER_LOT = 100;

interface BrokerFee {
  name: string;
  buyPct: number;
  sellPct: number;
}

const BROKERS: Record<string, BrokerFee> = {
  stockbit: { name: "Stockbit", buyPct: 0.0015, sellPct: 0.0025 },
  ajaib: { name: "Ajaib", buyPct: 0.0015, sellPct: 0.0025 },
  ipot: { name: "Indo Premier (IPOT)", buyPct: 0.0019, sellPct: 0.0029 },
  mirae: { name: "Mirae Asset", buyPct: 0.0015, sellPct: 0.0025 },
  mandiri: { name: "Mandiri Sekuritas", buyPct: 0.0018, sellPct: 0.0028 },
  bni: { name: "BNI Sekuritas", buyPct: 0.0018, sellPct: 0.0028 },
  philip: { name: "Philip Sekuritas", buyPct: 0.0018, sellPct: 0.0028 },
  custom: { name: "Custom", buyPct: 0.0015, sellPct: 0.0025 },
};

const BROKER_STORAGE_KEY = "gunaa_portfolio_broker";
const REPORT_STORAGE_KEY = "gunaa_portfolio_reports";

interface PortfolioHolding {
  id: string;
  stock_code: string;
  shares: number;
  avg_price: number;
  notes: string | null;
  entry_date: string | null;
  closed_at: string | null;
  close_price: number | null;
  created_at?: string;
}

interface EnrichedHolding extends PortfolioHolding {
  stock_name: string;
  sector: string;
  lots: number;
  close: number;
  change_pct: number;
  market_value: number;
  cost_basis: number;
  buy_fee: number;
  sell_fee: number;
  net_pnl: number;
  net_pnl_pct: number;
  break_even: number;
  pnl: number;
  pnl_pct: number;
  score: number;
  weight: number;
}

interface GrowthPoint {
  date: string;
  value: number;
  cost: number;
  realized: number;
}

interface PositionEvent {
  date: string;
  type: "open" | "close";
  stock_code: string;
  lots: number;
  price: number;
  pnl?: number;
  pnlPct?: number;
}

interface StockHistory {
  date: string;
  close: number;
}

interface StockOption {
  code: string;
  name: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SavedReport {
  id: string;
  date: string;
  broker: string;
  content: string;
  holdingCount: number;
  messages?: ChatMessage[];
}

const SECTOR_COLORS: Record<string, string> = {
  Financials: "#3b82f6",
  "Basic Materials": "#f97316",
  "Consumer Cyclicals": "#a855f7",
  "Consumer Non-Cyclicals": "#22c55e",
  Energy: "#ef4444",
  Healthcare: "#06b6d4",
  Industrials: "#eab308",
  Infrastructures: "#8b5cf6",
  "Properties & Real Estate": "#ec4899",
  Technology: "#14b8a6",
  "Transportation & Logistic": "#f59e0b",
};

function getSectorColor(sector: string, index: number): string {
  return (
    SECTOR_COLORS[sector] ||
    ["#6366f1", "#84cc16", "#f43f5e", "#0ea5e9", "#d946ef", "#fb923c", "#2dd4bf", "#a3e635"][index % 8]
  );
}

function loadSavedReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(REPORT_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveReport(report: SavedReport) {
  if (typeof window === "undefined") return;
  const existing = loadSavedReports();
  const updated = [report, ...existing].slice(0, 10);
  localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(updated));
}

function deleteReport(id: string) {
  if (typeof window === "undefined") return;
  const existing = loadSavedReports();
  localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(existing.filter((r) => r.id !== id)));
}

function renderFormattedText(text: string, isDark: boolean) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (trimmed === "---" || trimmed === "***") {
      return <Divider key={i} sx={{ my: 2, borderColor: isDark ? "rgba(201,162,39,0.18)" : "rgba(201,162,39,0.12)" }} />;
    }
    const isSectionHeader = /^\*\*[A-Z\s&:\/()0-9-]+\*\*$/.test(trimmed);
    const formatted = trimmed.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    if (isSectionHeader) {
      return (
        <Typography
          key={i}
          component="div"
          dangerouslySetInnerHTML={{ __html: formatted }}
          sx={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 800,
            fontSize: "1rem",
            color: "#c9a227",
            mt: i > 0 ? 2.5 : 0,
            mb: 1,
            letterSpacing: "-0.01em",
          }}
        />
      );
    }
    if (trimmed.startsWith("- ")) {
      const bulletContent = formatted.slice(2);
      return (
        <Box key={i} sx={{ display: "flex", gap: 1, pl: 0.5, py: 0.2 }}>
          <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "#c9a227", mt: "9px", flexShrink: 0 }} />
          <Typography
            component="span"
            dangerouslySetInnerHTML={{ __html: bulletContent }}
            sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", lineHeight: 1.7, color: "text.primary", "& b": { fontWeight: 700 } }}
          />
        </Box>
      );
    }
    if (!trimmed) return <Box key={i} sx={{ height: 8 }} />;
    return (
      <Typography
        key={i}
        component="div"
        dangerouslySetInnerHTML={{ __html: formatted }}
        sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", lineHeight: 1.75, color: "text.primary", "& b": { fontWeight: 700 } }}
      />
    );
  });
}

export default function PortfolioPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = "#c9a227";
  const router = useRouter();
  const { user, loading: proLoading } = useProContext();

  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [enriched, setEnriched] = useState<EnrichedHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestDate, setLatestDate] = useState("");
  const [allOptions, setAllOptions] = useState<StockOption[]>([]);

  const [brokerId, setBrokerId] = useState("stockbit");
  const broker = BROKERS[brokerId] || BROKERS.stockbit;

  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockOption | null>(null);
  const [formLots, setFormLots] = useState("");
  const [formAvgPrice, setFormAvgPrice] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formEntryDate, setFormEntryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const [editHolding, setEditHolding] = useState<PortfolioHolding | null>(null);
  const [editLots, setEditLots] = useState("");
  const [editAvgPrice, setEditAvgPrice] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editEntryDate, setEditEntryDate] = useState("");

  const [closeHolding, setCloseHolding] = useState<EnrichedHolding | null>(null);
  const [closeDate, setCloseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [closePrice, setClosePrice] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [growthData, setGrowthData] = useState<GrowthPoint[]>([]);
  const [growthTimeframe, setGrowthTimeframe] = useState("ALL");
  const [stockHistories, setStockHistories] = useState<Record<string, StockHistory[]>>({});

  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [conversationSaved, setConversationSaved] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const reportEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(BROKER_STORAGE_KEY);
      if (stored && BROKERS[stored]) setBrokerId(stored);
      setSavedReports(loadSavedReports());
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleBrokerChange = useCallback((id: string) => {
    setBrokerId(id);
    if (typeof window !== "undefined") localStorage.setItem(BROKER_STORAGE_KEY, id);
  }, []);

  useEffect(() => {
    async function fetchOptions() {
      const { data } = await supabase
        .from("idx_financial_ratios")
        .select("code,stock_name")
        .order("code", { ascending: true })
        .order("fs_date", { ascending: false });
      if (data) {
        const seen = new Set<string>();
        const unique = data.filter((r: any) => {
          if (seen.has(r.code)) return false;
          seen.add(r.code);
          return true;
        });
        setAllOptions(unique.map((r: any) => ({ code: r.code, name: r.stock_name })));
      }
    }
    fetchOptions();
  }, []);

  const fetchHoldings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/user/portfolio");
      if (res.ok) {
        const data = await res.json();
        setHoldings(data.holdings || []);
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchHoldings();
    else setLoading(false);
  }, [user, fetchHoldings]);

  useEffect(() => {
    if (holdings.length === 0) {
      setEnriched([]);
      setLoading(false);
      return;
    }
    const codes = holdings.map((h) => h.stock_code);
    setLoading(true);

    async function enrich() {
      const [{ data: ratios }, { data: dateRow }] = await Promise.all([
        supabase.from("idx_financial_ratios").select("*").in("code", codes).order("fs_date", { ascending: false }),
        supabase.from("idx_stock_summary").select("date").order("date", { ascending: false }).limit(1).single(),
      ]);
      const date = dateRow?.date ?? "";
      setLatestDate(date);

      const { data: summaries } = await supabase
        .from("idx_stock_summary")
        .select("stock_code,close,change,volume,value,foreign_buy,foreign_sell")
        .eq("date", date)
        .in("stock_code", codes);

      const sumMap: Record<string, any> = {};
      (summaries ?? []).forEach((s: any) => {
        sumMap[s.stock_code] = s;
      });
      const ratioMap: Record<string, any> = {};
      (ratios ?? []).forEach((r: any) => {
        if (!ratioMap[r.code]) ratioMap[r.code] = r;
      });

      let totalMV = 0;
      const built: EnrichedHolding[] = holdings.map((h) => {
        const r = ratioMap[h.stock_code] || {};
        const s = sumMap[h.stock_code] || {};
        const isClosed = !!h.closed_at;
        const close = isClosed ? (h.close_price || 0) : (parseFloat(s.close) || 0);
        const previous = close - (parseFloat(s.change) || 0);
        const change_pct = isClosed ? 0 : (previous > 0 ? ((close - previous) / previous) * 100 : 0);
        const market_value = close * h.shares;
        const cost_basis = h.avg_price * h.shares;
        const buy_fee = cost_basis * broker.buyPct;
        const sell_fee = market_value * broker.sellPct;
        const net_cost = cost_basis + buy_fee;
        const net_mv = market_value - sell_fee;
        const net_pnl = net_mv - net_cost;
        const net_pnl_pct = net_cost > 0 ? (net_pnl / net_cost) * 100 : 0;
        const break_even = Math.ceil(h.avg_price * (1 + broker.buyPct) / (1 - broker.sellPct));
        const pnl = market_value - cost_basis;
        const pnl_pct = cost_basis > 0 ? (pnl / cost_basis) * 100 : 0;
        if (!isClosed) totalMV += market_value;
        return {
          ...h,
          stock_name: r.stock_name || h.stock_code,
          sector: r.sector || "Unknown",
          lots: Math.round(h.shares / SHARES_PER_LOT),
          close,
          change_pct,
          market_value,
          cost_basis,
          buy_fee,
          sell_fee,
          net_pnl,
          net_pnl_pct,
          break_even,
          pnl,
          pnl_pct,
          score: r.code ? computeFinancialScore(r) : 0,
          weight: 0,
        };
      });
      const active = built.filter((b) => !b.closed_at);
      const closed = built.filter((b) => !!b.closed_at);
      active.forEach((b) => { b.weight = totalMV > 0 ? (b.market_value / totalMV) * 100 : 0; });
      active.sort((a, b) => b.market_value - a.market_value);
      closed.sort((a, b) => (b.closed_at || "").localeCompare(a.closed_at || ""));
      const sorted = [...active, ...closed];
      setEnriched(sorted);
      setLoading(false);
    }
    enrich();
  }, [holdings, broker.buyPct, broker.sellPct]);

  const activeHoldings = useMemo(() => enriched.filter((e) => !e.closed_at), [enriched]);
  const closedHoldings = useMemo(() => enriched.filter((e) => !!e.closed_at), [enriched]);

  const totals = useMemo(() => {
    const mv = activeHoldings.reduce((s, e) => s + e.market_value, 0);
    const cb = activeHoldings.reduce((s, e) => s + e.cost_basis, 0);
    const totalBuyFee = activeHoldings.reduce((s, e) => s + e.buy_fee, 0);
    const totalSellFee = activeHoldings.reduce((s, e) => s + e.sell_fee, 0);
    const totalFees = totalBuyFee + totalSellFee;
    const pnl = mv - cb;
    const pnlPct = cb > 0 ? (pnl / cb) * 100 : 0;
    const netPnl = mv - totalSellFee - (cb + totalBuyFee);
    const netPnlPct = cb + totalBuyFee > 0 ? (netPnl / (cb + totalBuyFee)) * 100 : 0;
    const dailyChange = activeHoldings.reduce((s, e) => {
      const prev = e.close / (1 + e.change_pct / 100);
      return s + (e.close - prev) * e.shares;
    }, 0);
    const realizedPnl = closedHoldings.reduce((s, e) => s + e.net_pnl, 0);
    return { mv, cb, pnl, pnlPct, netPnl, netPnlPct, totalFees, totalBuyFee, totalSellFee, dailyChange, realizedPnl };
  }, [activeHoldings, closedHoldings]);

  const sectorAllocation = useMemo(() => {
    const map: Record<string, number> = {};
    activeHoldings.forEach((e) => {
      map[e.sector] = (map[e.sector] || 0) + e.market_value;
    });
    return Object.entries(map)
      .map(([sector, value]) => ({ sector, value, pct: totals.mv > 0 ? (value / totals.mv) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [activeHoldings, totals.mv]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.toUpperCase().trim();
    const existingCodes = new Set(holdings.map((h) => h.stock_code));
    const notAdded = allOptions.filter((o) => !existingCodes.has(o.code));
    if (!q) return notAdded.slice(0, 8);
    return notAdded.filter((o) => o.code.includes(q) || o.name.toUpperCase().includes(q)).slice(0, 10);
  }, [searchQuery, allOptions, holdings]);

  const handleAddHolding = useCallback(async () => {
    if (!selectedStock || !formLots || !formAvgPrice) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock_code: selectedStock.code,
          shares: Math.round(parseFloat(formLots) * SHARES_PER_LOT),
          avg_price: parseFloat(formAvgPrice),
          notes: formNotes || undefined,
          entry_date: formEntryDate || undefined,
        }),
      });
      if (res.ok) {
        await fetchHoldings();
        setAddOpen(false);
        setSelectedStock(null);
        setFormLots("");
        setFormAvgPrice("");
        setFormNotes("");
        setFormEntryDate(new Date().toISOString().split("T")[0]);
        setSearchQuery("");
      }
    } catch {
      /* ignore */
    }
    setSaving(false);
  }, [selectedStock, formLots, formAvgPrice, formNotes, formEntryDate, fetchHoldings]);

  const handleEditHolding = useCallback(async () => {
    if (!editHolding || !editLots || !editAvgPrice) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editHolding.id,
          shares: Math.round(parseFloat(editLots) * SHARES_PER_LOT),
          avg_price: parseFloat(editAvgPrice),
          notes: editNotes || undefined,
          entry_date: editEntryDate || undefined,
        }),
      });
      if (res.ok) {
        await fetchHoldings();
        setEditHolding(null);
      }
    } catch {
      /* ignore */
    }
    setSaving(false);
  }, [editHolding, editLots, editAvgPrice, editNotes, editEntryDate, fetchHoldings]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/user/portfolio?id=${id}`, { method: "DELETE" });
        if (res.ok) await fetchHoldings();
      } catch {
        /* ignore */
      }
    },
    [fetchHoldings]
  );

  const handleClosePosition = useCallback(async () => {
    if (!closeHolding || !closePrice) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: closeHolding.id,
          closed_at: closeDate,
          close_price: parseFloat(closePrice),
        }),
      });
      if (res.ok) {
        await fetchHoldings();
        setCloseHolding(null);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }, [closeHolding, closeDate, closePrice, fetchHoldings]);

  const handleReopenPosition = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/user/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, closed_at: null, close_price: null }),
      });
      if (res.ok) await fetchHoldings();
    } catch { /* ignore */ }
  }, [fetchHoldings]);

  const brokerBuyPct = broker.buyPct;
  const brokerSellPct = broker.sellPct;

  useEffect(() => {
    if (enriched.length === 0) { setGrowthData([]); return; }

    const codes = [...new Set(enriched.map((e) => e.stock_code))];
    const fallbackDate = new Date();
    fallbackDate.setMonth(fallbackDate.getMonth() - 6);
    const fallbackStr = fallbackDate.toISOString().split("T")[0];

    const allWithDates = enriched.map((e) => ({
      ...e,
      effective_entry: e.entry_date || e.created_at?.split("T")[0] || fallbackStr,
    }));
    const earliest = allWithDates.reduce((min, e) => (e.effective_entry < min ? e.effective_entry : min), allWithDates[0].effective_entry);

    async function fetchGrowth() {
      const { data: prices } = await supabase
        .from("idx_stock_summary")
        .select("stock_code, date, close")
        .in("stock_code", codes)
        .gte("date", earliest)
        .order("date", { ascending: true });

      if (!prices || prices.length === 0) return;

      const dateMap: Record<string, Record<string, number>> = {};
      const histMap: Record<string, StockHistory[]> = {};
      prices.forEach((p: any) => {
        if (!dateMap[p.date]) dateMap[p.date] = {};
        dateMap[p.date][p.stock_code] = parseFloat(p.close) || 0;
        if (!histMap[p.stock_code]) histMap[p.stock_code] = [];
        histMap[p.stock_code].push({ date: p.date, close: parseFloat(p.close) || 0 });
      });
      setStockHistories(histMap);

      const closedPnlMap: Record<string, number> = {};
      let cumulativeRealized = 0;
      const closedSorted = allWithDates
        .filter((h) => h.closed_at)
        .sort((a, b) => (a.closed_at || "").localeCompare(b.closed_at || ""));
      for (const h of closedSorted) {
        const sellValue = (h.close_price || 0) * h.shares;
        const sellFee = sellValue * brokerSellPct;
        const buyCost = h.cost_basis + h.buy_fee;
        cumulativeRealized += (sellValue - sellFee) - buyCost;
        closedPnlMap[h.closed_at!] = cumulativeRealized;
      }

      const dates = Object.keys(dateMap).sort();
      const points: GrowthPoint[] = [];
      let runningRealized = 0;
      for (const date of dates) {
        let value = 0;
        let cost = 0;
        for (const h of allWithDates) {
          if (h.effective_entry > date) continue;
          if (h.closed_at && h.closed_at < date) continue;
          const usePrice = h.closed_at === date ? (h.close_price || 0) : dateMap[date][h.stock_code];
          if (usePrice !== undefined) {
            value += usePrice * h.shares;
            cost += h.avg_price * h.shares;
          }
        }
        if (closedPnlMap[date] !== undefined) runningRealized = closedPnlMap[date];
        if (value > 0 || runningRealized !== 0) {
          points.push({ date, value: Math.round(value), cost: Math.round(cost), realized: Math.round(runningRealized) });
        }
      }
      setGrowthData(points);
    }
    fetchGrowth();
  }, [enriched, brokerBuyPct, brokerSellPct]);

  const filteredGrowth = useMemo(() => {
    if (growthData.length === 0) return [];
    if (growthTimeframe === "ALL") return growthData;
    const now = new Date();
    const offsets: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
    const days = offsets[growthTimeframe] || 365;
    const cutoff = new Date(now.getTime() - days * 86400000).toISOString().split("T")[0];
    return growthData.filter((p) => p.date >= cutoff);
  }, [growthData, growthTimeframe]);

  const streamResponse = useCallback(async (
    body: Record<string, unknown>,
    onText: (full: string) => void,
    onError: (msg: string) => void,
  ) => {
    const res = await fetch("/api/portfolio-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      onError(err.error || "Analysis failed");
      return "";
    }
    const reader = res.body?.getReader();
    if (!reader) return "";
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) { full += parsed.text; onText(full); }
          } catch { /* skip */ }
        }
      }
    }
    return full;
  }, []);

  const handleAiAnalysis = useCallback(async () => {
    if (enriched.length === 0) return;
    setAiLoading(true);
    setAiReport("");
    setAiModalOpen(true);
    setViewingReport(null);
    setChatMessages([]);
    setFollowUpInput("");
    setConversationSaved(false);

    try {
      const body = {
        holdings: enriched.map((e) => ({ stock_code: e.stock_code, lots: e.lots, shares: e.shares, avg_price: e.avg_price })),
        broker: { name: broker.name, buyPct: broker.buyPct, sellPct: broker.sellPct },
      };
      const fullReport = await streamResponse(
        body,
        (txt) => setAiReport(txt),
        (msg) => setAiReport(`Error: ${msg}`),
      );
      if (fullReport && !fullReport.startsWith("Error")) {
        setChatMessages([
          { role: "user", content: "Analyze my portfolio and provide a comprehensive report." },
          { role: "assistant", content: fullReport },
        ]);
      }
    } catch {
      setAiReport("Error: Gagal terhubung ke layanan analisis.");
    }
    setAiLoading(false);
  }, [enriched, broker, streamResponse]);

  const handleFollowUp = useCallback(async () => {
    const question = followUpInput.trim();
    if (!question || followUpLoading || chatMessages.length < 2) return;
    setFollowUpLoading(true);
    setFollowUpInput("");

    const updatedMessages: ChatMessage[] = [...chatMessages, { role: "user", content: question }];
    setChatMessages(updatedMessages);

    try {
      const body = {
        holdings: enriched.map((e) => ({ stock_code: e.stock_code, lots: e.lots, shares: e.shares, avg_price: e.avg_price })),
        broker: { name: broker.name, buyPct: broker.buyPct, sellPct: broker.sellPct },
        messages: updatedMessages,
      };
      const fullReply = await streamResponse(
        body,
        (txt) => setChatMessages([...updatedMessages, { role: "assistant", content: txt }]),
        (msg) => setChatMessages([...updatedMessages, { role: "assistant", content: `Error: ${msg}` }]),
      );
      if (fullReply) {
        setChatMessages([...updatedMessages, { role: "assistant", content: fullReply }]);
        setConversationSaved(false);
      }
    } catch {
      setChatMessages([...updatedMessages, { role: "assistant", content: "Error: Gagal terhubung." }]);
    }
    setFollowUpLoading(false);
  }, [followUpInput, followUpLoading, chatMessages, enriched, broker, streamResponse]);

  const handleSaveConversation = useCallback(() => {
    if (chatMessages.length < 2) return;
    const report: SavedReport = {
      id: Date.now().toString(),
      date: new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
      broker: broker.name,
      content: chatMessages.find((m) => m.role === "assistant")?.content || "",
      holdingCount: enriched.length,
      messages: chatMessages,
    };
    saveReport(report);
    setSavedReports(loadSavedReports());
    setConversationSaved(true);
  }, [chatMessages, broker.name, enriched.length]);

  const positionHistory = useMemo<PositionEvent[]>(() => {
    const events: PositionEvent[] = [];
    for (const h of enriched) {
      if (h.entry_date) {
        events.push({ date: h.entry_date, type: "open", stock_code: h.stock_code, lots: h.lots, price: h.avg_price });
      }
      if (h.closed_at && h.close_price) {
        const sellVal = h.close_price * h.shares;
        const sellFee = sellVal * broker.sellPct;
        const buyCost = h.cost_basis + h.buy_fee;
        const pnl = (sellVal - sellFee) - buyCost;
        const pnlPct = buyCost > 0 ? (pnl / buyCost) * 100 : 0;
        events.push({ date: h.closed_at, type: "close", stock_code: h.stock_code, lots: h.lots, price: h.close_price, pnl, pnlPct });
      }
    }
    return events.sort((a, b) => b.date.localeCompare(a.date));
  }, [enriched, broker.sellPct]);

  const pnlChartData = useMemo(() =>
    enriched.map((e) => ({ name: e.stock_code, pnl: Math.round(e.net_pnl), weight: Math.round(e.weight * 10) / 10 }))
      .sort((a, b) => b.pnl - a.pnl),
    [enriched]
  );

  const scoreColor = (s: number) => (s >= 70 ? "#22c55e" : s >= 45 ? "#f59e0b" : "#ef4444");
  const pnlColor = (v: number) => (v >= 0 ? "#22c55e" : "#ef4444");

  const headerCell = (label: string, align: "left" | "right" = "right") => (
    <TableCell
      align={align}
      sx={{
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontWeight: 600,
        fontSize: "0.64rem",
        color: "text.secondary",
        py: 1.25,
        px: 1.25,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </TableCell>
  );

  const formCalc = useMemo(() => {
    const lots = parseFloat(formLots) || 0;
    const price = parseFloat(formAvgPrice) || 0;
    const shares = lots * SHARES_PER_LOT;
    const tradingValue = shares * price;
    const buyFee = tradingValue * broker.buyPct;
    const totalCost = tradingValue + buyFee;
    const breakEven = price > 0 ? Math.ceil(price * (1 + broker.buyPct) / (1 - broker.sellPct)) : 0;
    return { shares, tradingValue, buyFee, totalCost, breakEven };
  }, [formLots, formAvgPrice, broker]);

  if (!proLoading && !user) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#050505" : "#e8e6e3", pt: { xs: 8, md: 12 }, pb: 6 }}>
        <Container maxWidth="sm" sx={{ textAlign: "center" }}>
          <AccountBalanceWalletIcon sx={{ fontSize: 56, color: isDark ? "rgba(201,162,39,0.2)" : "rgba(201,162,39,0.18)", mb: 2 }} />
          <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: "1.5rem", color: "text.primary", mb: 1 }}>
            Portfolio Tracker
          </Typography>
          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.88rem", color: "text.secondary", mb: 3 }}>
            Masuk untuk melacak portfolio saham, pantau P&L, dan dapatkan analisis AI.
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#050505" : "#e8e6e3", pt: { xs: 3, md: 4 }, pb: 6 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: { xs: "1.6rem", md: "2rem" }, color: "text.primary", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Portfolio
            </Typography>
            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.secondary", mt: 0.5 }}>
              {activeHoldings.length} saham aktif{closedHoldings.length > 0 ? ` + ${closedHoldings.length} ditutup` : ""}{latestDate ? ` -- harga per ${latestDate}` : ""}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {/* Broker selector */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem" }}>Broker</InputLabel>
              <Select
                value={brokerId}
                label="Broker"
                onChange={(e) => handleBrokerChange(e.target.value)}
                sx={{
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  fontSize: "0.8rem",
                  borderRadius: "8px",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
                }}
              >
                {Object.entries(BROKERS).map(([id, b]) => (
                  <MenuItem key={id} value={id} sx={{ fontSize: "0.8rem", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ width: "100%" }} spacing={2}>
                      <span>{b.name}</span>
                      <Typography component="span" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem", color: "text.secondary" }}>
                        {(b.buyPct * 100).toFixed(2)}% / {(b.sellPct * 100).toFixed(2)}%
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => setAddOpen(true)}
              sx={{
                fontSize: "0.78rem", fontWeight: 600, color: accent,
                border: `1px solid ${isDark ? "rgba(201,162,39,0.25)" : "rgba(201,162,39,0.2)"}`,
                borderRadius: "8px", px: 2, py: 0.75,
                bgcolor: isDark ? "rgba(201,162,39,0.05)" : "rgba(201,162,39,0.04)",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                "&:hover": { bgcolor: isDark ? "rgba(201,162,39,0.1)" : "rgba(201,162,39,0.08)" },
              }}
            >
              Tambah Saham
            </Button>

            {enriched.length > 0 && (
              <Stack direction="row" spacing={0.5}>
                <Button
                  startIcon={aiLoading ? <CircularProgress size={14} sx={{ color: accent }} /> : <AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                  onClick={handleAiAnalysis}
                  disabled={aiLoading}
                  sx={{
                    fontSize: "0.78rem", fontWeight: 600, color: isDark ? "#e2e8f0" : "#1e293b",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                    borderRadius: "8px", px: 2, py: 0.75,
                    bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    "&:hover": { bgcolor: isDark ? "rgba(201,162,39,0.08)" : "rgba(201,162,39,0.06)" },
                    "&.Mui-disabled": { opacity: 0.6 },
                  }}
                >
                  {aiLoading ? "Analyzing..." : "AI Report"}
                </Button>
                {savedReports.length > 0 && (
                  <Tooltip title="Riwayat Report" arrow>
                    <IconButton
                      size="small"
                      onClick={() => setHistoryOpen(true)}
                      sx={{ border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: "8px", width: 36, height: 36, color: "text.secondary", "&:hover": { color: accent } }}
                    >
                      <HistoryIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}
          </Stack>
        </Stack>

        {/* Summary Cards */}
        {!loading && enriched.length > 0 && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: { xs: 1.5, md: 2 }, mb: 3 }}>
            {[
              { label: "Nilai Pasar", value: `Rp ${formatValue(totals.mv)}`, sub: `${enriched.length} saham` },
              { label: "P&L (Gross)", value: `${totals.pnl >= 0 ? "+" : ""}Rp ${formatValue(totals.pnl)}`, sub: `${totals.pnlPct >= 0 ? "+" : ""}${totals.pnlPct.toFixed(2)}%`, color: pnlColor(totals.pnl) },
              { label: "P&L (Net Fee)", value: `${totals.netPnl >= 0 ? "+" : ""}Rp ${formatValue(totals.netPnl)}`, sub: `${totals.netPnlPct >= 0 ? "+" : ""}${totals.netPnlPct.toFixed(2)}% (after fees)`, color: pnlColor(totals.netPnl) },
              { label: "Total Fee", value: `Rp ${formatValue(totals.totalFees)}`, sub: `Buy ${formatValue(totals.totalBuyFee)} + Sell ${formatValue(totals.totalSellFee)}` },
              { label: "Hari Ini", value: `${totals.dailyChange >= 0 ? "+" : ""}Rp ${formatValue(totals.dailyChange)}`, sub: broker.name, color: pnlColor(totals.dailyChange) },
            ].map(({ label, value, sub, color }) => (
              <Paper key={label} elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: "14px", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.5)" }}>
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.68rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.75 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: { xs: "0.92rem", md: "1.15rem" }, fontWeight: 700, color: color || "text.primary", lineHeight: 1.2 }}>
                  {value}
                </Typography>
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.68rem", color: color || "text.secondary", mt: 0.25 }}>
                  {sub}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}

        {/* Sector Allocation */}
        {!loading && sectorAllocation.length > 1 && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: "14px", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.5)", mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <PieChartIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem", fontWeight: 700, color: "text.primary" }}>Alokasi Sektor</Typography>
            </Stack>
            <Box sx={{ display: "flex", height: 10, borderRadius: 2, overflow: "hidden", mb: 2 }}>
              {sectorAllocation.map((s, i) => (
                <Tooltip key={s.sector} title={`${s.sector}: ${s.pct.toFixed(1)}%`} arrow>
                  <Box sx={{ width: `${s.pct}%`, bgcolor: getSectorColor(s.sector, i), transition: "width 0.4s ease" }} />
                </Tooltip>
              ))}
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              {sectorAllocation.map((s, i) => (
                <Stack key={s.sector} direction="row" alignItems="center" spacing={0.75}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: getSectorColor(s.sector, i), flexShrink: 0 }} />
                  <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary" }}>{s.sector}</Typography>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", fontWeight: 600, color: "text.primary" }}>{s.pct.toFixed(1)}%</Typography>
                </Stack>
              ))}
            </Box>
          </Paper>
        )}

        {/* Portfolio Growth Chart */}
        {!loading && filteredGrowth.length > 1 && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: "14px", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.5)", mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUpIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem", fontWeight: 700, color: "text.primary" }}>Pertumbuhan Portfolio</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5}>
                {["1W", "1M", "3M", "6M", "1Y", "ALL"].map((tf) => (
                  <Chip
                    key={tf}
                    label={tf}
                    size="small"
                    onClick={() => setGrowthTimeframe(tf)}
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      height: 24,
                      bgcolor: growthTimeframe === tf ? accent : "transparent",
                      color: growthTimeframe === tf ? "#050505" : "text.secondary",
                      border: growthTimeframe === tf ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                      "&:hover": { bgcolor: growthTimeframe === tf ? accent : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" },
                    }}
                  />
                ))}
              </Stack>
            </Stack>
            <Box sx={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredGrowth} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accent} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fill: isDark ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fill: isDark ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} width={45} />
                  <RTooltip
                    contentStyle={{ background: isDark ? "#1a1a1a" : "#fff", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 10, fontSize: 12, fontFamily: '"JetBrains Mono", monospace' }}
                    formatter={(val: number, name: string) => {
                      const labels: Record<string, string> = { value: "Nilai Pasar", cost: "Modal", realized: "Realized P&L" };
                      return [`Rp ${val.toLocaleString()}`, labels[name] || name];
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Area type="monotone" dataKey="cost" stroke={isDark ? "#4b5563" : "#9ca3af"} strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} name="cost" />
                  <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2} fill="url(#growthFill)" dot={false} name="value" />
                  {filteredGrowth.some((p) => p.realized !== 0) && (
                    <Line type="stepAfter" dataKey="realized" stroke="#22c55e" strokeWidth={1.5} dot={false} name="realized" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </Box>
            <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 1 }}>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <Box sx={{ width: 16, height: 2, bgcolor: accent, borderRadius: 1 }} />
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.68rem", color: "text.secondary" }}>Nilai Pasar</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <Box sx={{ width: 16, height: 0, borderTop: `2px dashed ${isDark ? "#4b5563" : "#9ca3af"}` }} />
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.68rem", color: "text.secondary" }}>Modal</Typography>
              </Stack>
              {filteredGrowth.some((p) => p.realized !== 0) && (
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Box sx={{ width: 16, height: 2, bgcolor: "#22c55e", borderRadius: 1 }} />
                  <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.68rem", color: "text.secondary" }}>Realized P&L</Typography>
                </Stack>
              )}
            </Stack>
          </Paper>
        )}

        {/* Empty State */}
        {!loading && enriched.length === 0 && (
          <Paper elevation={0} sx={{ border: `1px dashed ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: "16px", p: { xs: 5, md: 8 }, textAlign: "center", bgcolor: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)" }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 48, color: isDark ? "rgba(201,162,39,0.2)" : "rgba(201,162,39,0.18)", mb: 2 }} />
            <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1.1rem", color: "text.primary", mb: 1 }}>Belum ada saham</Typography>
            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.secondary", mb: 3, maxWidth: 420, mx: "auto" }}>
              Tambahkan saham yang kamu miliki untuk memantau performa portfolio, lihat P&L secara real-time, dan dapatkan analisis AI untuk investasimu.
            </Typography>
            <Button startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ fontSize: "0.82rem", fontWeight: 600, color: accent, border: `1px solid ${isDark ? "rgba(201,162,39,0.3)" : "rgba(201,162,39,0.25)"}`, borderRadius: "8px", px: 2.5, py: 1, bgcolor: isDark ? "rgba(201,162,39,0.06)" : "rgba(201,162,39,0.05)", fontFamily: '"Plus Jakarta Sans", sans-serif', "&:hover": { bgcolor: isDark ? "rgba(201,162,39,0.12)" : "rgba(201,162,39,0.1)" } }}>
              Tambah Saham Pertama
            </Button>
          </Paper>
        )}

        {/* Loading */}
        {loading && (
          <Paper elevation={0} sx={{ border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, borderRadius: "14px", overflow: "hidden" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} sx={{ display: "flex", gap: 2, px: 3, py: 1.75, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                <Skeleton variant="text" width={60} height={20} />
                <Skeleton variant="text" width={140} height={20} />
                <Skeleton variant="text" width={80} height={20} sx={{ ml: "auto" }} />
                <Skeleton variant="text" width={60} height={20} />
              </Box>
            ))}
          </Paper>
        )}

        {/* Holdings Table */}
        {!loading && enriched.length > 0 && (
          <Paper elevation={0} sx={{ border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, borderRadius: "14px", overflow: "hidden" }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)" }}>
                    <TableCell sx={{ width: 28, p: 0 }} />
                    {headerCell("Saham", "left")}
                    {headerCell("Lot")}
                    {headerCell("Harga Avg")}
                    {headerCell("Terakhir")}
                    {headerCell("BEP")}
                    {headerCell("Hari Ini")}
                    {headerCell("Nilai Pasar")}
                    {headerCell("P&L Net")}
                    {headerCell("Bobot")}
                    {headerCell("Skor")}
                    {headerCell("", "left")}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enriched.map((row) => {
                    const isClosed = !!row.closed_at;
                    const isExpanded = expandedId === row.id;
                    const rowOpacity = isClosed ? 0.5 : 1;
                    const stockHist = stockHistories[row.stock_code] || [];
                    const entryFilteredHist = row.entry_date ? stockHist.filter((h) => h.date >= row.entry_date!) : stockHist;
                    return (
                      <React.Fragment key={row.id}>
                        <TableRow
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                          sx={{
                            cursor: "pointer",
                            opacity: rowOpacity,
                            "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)" },
                            "& td": { borderBottom: isExpanded ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` },
                          }}
                        >
                          <TableCell sx={{ p: 0, pl: 0.5, width: 28 }}>
                            {isExpanded ? <KeyboardArrowUpIcon sx={{ fontSize: 16, color: "text.secondary" }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 16, color: "text.secondary" }} />}
                          </TableCell>

                          <TableCell sx={{ py: 1.25, px: 1.25, minWidth: 130 }}>
                            <Stack direction="row" alignItems="center" spacing={0.75}>
                              <Box>
                                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.8rem", color: isClosed ? "text.secondary" : accent }}>{row.stock_code}</Typography>
                                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.66rem", color: "text.secondary", mt: 0.1, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.stock_name}</Typography>
                              </Box>
                              {isClosed && <Chip label="CLOSED" size="small" sx={{ height: 18, fontSize: "0.58rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', bgcolor: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)", color: "#ef4444", border: "none" }} />}
                            </Stack>
                          </TableCell>

                          <TableCell align="right" sx={{ py: 1.25, px: 1.25 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", fontWeight: 600, color: "text.primary" }}>{row.lots.toLocaleString()}</Typography>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", color: "text.secondary" }}>{row.shares.toLocaleString()} lbr</Typography>
                          </TableCell>

                          <TableCell align="right" sx={{ py: 1.25, px: 1.25 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", color: "text.secondary" }}>{row.avg_price.toLocaleString()}</Typography>
                          </TableCell>

                          <TableCell align="right" sx={{ py: 1.25, px: 1.25 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", fontWeight: 700, color: "text.primary" }}>{row.close > 0 ? row.close.toLocaleString() : "-"}</Typography>
                            {isClosed && <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.58rem", color: "text.secondary" }}>sold</Typography>}
                          </TableCell>

                          <TableCell align="right" sx={{ py: 1.25, px: 1.25 }}>
                            <Tooltip title="Break-even price (incl. buy+sell fees)" arrow>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", color: row.close >= row.break_even ? "#22c55e" : "#f59e0b" }}>{row.break_even.toLocaleString()}</Typography>
                            </Tooltip>
                          </TableCell>

                          <TableCell align="right" sx={{ py: 1.25, px: 1.25 }}>
                            {isClosed ? (
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.73rem", color: "text.secondary" }}>-</Typography>
                            ) : (
                              <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                                {row.change_pct !== 0 && (row.change_pct >= 0 ? <TrendingUpIcon sx={{ fontSize: 11, color: "#22c55e" }} /> : <TrendingDownIcon sx={{ fontSize: 11, color: "#ef4444" }} />)}
                                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.73rem", fontWeight: 600, color: row.change_pct >= 0 ? "#22c55e" : "#ef4444" }}>
                                  {row.change_pct >= 0 ? "+" : ""}{row.change_pct.toFixed(2)}%
                                </Typography>
                              </Stack>
                            )}
                          </TableCell>

                          <TableCell align="right" sx={{ py: 1.25, px: 1.25 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.76rem", fontWeight: 600, color: "text.primary" }}>{formatValue(row.market_value)}</Typography>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", color: "text.secondary" }}>fee: {formatValue(row.buy_fee + row.sell_fee)}</Typography>
                          </TableCell>

                          <TableCell align="right" sx={{ py: 1.25, px: 1.25 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.76rem", fontWeight: 700, color: pnlColor(row.net_pnl) }}>
                              {row.net_pnl >= 0 ? "+" : ""}{formatValue(row.net_pnl)}
                            </Typography>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem", color: pnlColor(row.net_pnl_pct) }}>
                              {row.net_pnl_pct >= 0 ? "+" : ""}{row.net_pnl_pct.toFixed(2)}%
                            </Typography>
                          </TableCell>

                          <TableCell align="right" sx={{ py: 1.25, px: 1.25 }}>
                            <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.75}>
                              <Box sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                                <Box sx={{ height: "100%", width: `${Math.min(row.weight, 100)}%`, bgcolor: accent, borderRadius: 2 }} />
                              </Box>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", color: "text.secondary", minWidth: 28, textAlign: "right" }}>{row.weight.toFixed(1)}%</Typography>
                            </Stack>
                          </TableCell>

                          <TableCell align="right" sx={{ py: 1.25, px: 1.25, minWidth: 65 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
                              <Box sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                                <Box sx={{ height: "100%", width: `${row.score}%`, bgcolor: scoreColor(row.score), borderRadius: 2 }} />
                              </Box>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", fontWeight: 700, color: scoreColor(row.score), minWidth: 18 }}>{row.score}</Typography>
                            </Box>
                          </TableCell>

                          <TableCell sx={{ px: 0.75, py: 1.25, width: 90 }}>
                            <Stack direction="row" spacing={0.25}>
                              {!isClosed && (
                                <Tooltip title="Tutup posisi" arrow><IconButton size="small" onClick={(e) => { e.stopPropagation(); setCloseHolding(row); setCloseDate(new Date().toISOString().split("T")[0]); setClosePrice(String(row.close || "")); }} sx={{ color: "text.secondary", p: 0.5, "&:hover": { color: "#f59e0b" } }}><SellIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                              )}
                              {isClosed && (
                                <Tooltip title="Buka kembali" arrow><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleReopenPosition(row.id); }} sx={{ color: "text.secondary", p: 0.5, "&:hover": { color: "#22c55e" } }}><RefreshIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                              )}
                              <Tooltip title="Edit" arrow><IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditHolding(row); setEditLots(String(row.lots)); setEditAvgPrice(String(row.avg_price)); setEditNotes(row.notes || ""); setEditEntryDate(row.entry_date || ""); }} sx={{ color: "text.secondary", p: 0.5, "&:hover": { color: accent } }}><EditIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                              <Tooltip title="Hapus" arrow><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }} sx={{ color: "text.secondary", p: 0.5, "&:hover": { color: "#ef4444" } }}><DeleteOutlineIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                              <Tooltip title="Lihat saham" arrow><IconButton size="small" onClick={(e) => { e.stopPropagation(); window.open(`/stock/${row.stock_code}`, "_blank"); }} sx={{ color: "text.secondary", p: 0.5, "&:hover": { color: "text.primary" } }}><OpenInNewIcon sx={{ fontSize: 12 }} /></IconButton></Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>

                        {/* Expandable Detail Row */}
                        <TableRow>
                          <TableCell colSpan={12} sx={{ p: 0, borderBottom: isExpanded ? `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` : "none" }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ px: 3, py: 2.5, bgcolor: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)" }}>
                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
                                  {/* Left: Details */}
                                  <Box>
                                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1.5 }}>Detail Posisi</Typography>
                                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                                      {[
                                        { l: "Entry Date", v: row.entry_date || "-" },
                                        { l: "Modal", v: `Rp ${formatValue(row.cost_basis)}` },
                                        { l: "Harga Avg", v: `Rp ${row.avg_price.toLocaleString()}` },
                                        { l: "BEP", v: `Rp ${row.break_even.toLocaleString()}` },
                                        { l: "Fee Beli", v: `Rp ${formatValue(row.buy_fee)}` },
                                        { l: "Fee Jual", v: `Rp ${formatValue(row.sell_fee)}` },
                                        { l: "P&L Gross", v: `${row.pnl >= 0 ? "+" : ""}Rp ${formatValue(row.pnl)} (${row.pnl_pct >= 0 ? "+" : ""}${row.pnl_pct.toFixed(2)}%)` },
                                        { l: "P&L Net", v: `${row.net_pnl >= 0 ? "+" : ""}Rp ${formatValue(row.net_pnl)} (${row.net_pnl_pct >= 0 ? "+" : ""}${row.net_pnl_pct.toFixed(2)}%)` },
                                        ...(isClosed ? [{ l: "Ditutup", v: `${row.closed_at} @ Rp ${(row.close_price || 0).toLocaleString()}` }] : []),
                                      ].map(({ l, v }) => (
                                        <Box key={l}>
                                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.66rem", color: "text.secondary" }}>{l}</Typography>
                                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.74rem", fontWeight: 600, color: "text.primary" }}>{v}</Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                    {row.notes && (
                                      <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.74rem", color: "text.secondary", mt: 1.5, fontStyle: "italic" }}>
                                        {row.notes}
                                      </Typography>
                                    )}
                                  </Box>

                                  {/* Right: Mini Chart */}
                                  <Box>
                                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1.5 }}>
                                      Pergerakan Harga {row.entry_date ? `sejak ${row.entry_date}` : ""}
                                    </Typography>
                                    {entryFilteredHist.length > 2 ? (
                                      <Box sx={{ height: 140 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={entryFilteredHist} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
                                            <XAxis dataKey="date" tick={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', fill: isDark ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', fill: isDark ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} width={40} />
                                            <RTooltip contentStyle={{ background: isDark ? "#1a1a1a" : "#fff", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, fontSize: 11, fontFamily: '"JetBrains Mono", monospace' }} formatter={(val: number) => [`Rp ${val.toLocaleString()}`, "Close"]} />
                                            {row.avg_price > 0 && <CartesianGrid y={row.avg_price} />}
                                            <Line type="monotone" dataKey="close" stroke={accent} strokeWidth={1.5} dot={false} />
                                          </LineChart>
                                        </ResponsiveContainer>
                                      </Box>
                                    ) : (
                                      <Box sx={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem", color: "text.secondary" }}>
                                          {row.entry_date ? "Data harga belum tersedia" : "Set tanggal entry untuk melihat chart"}
                                        </Typography>
                                      </Box>
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Position History */}
        {!loading && positionHistory.length > 0 && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: "14px", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.5)", mt: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <HistoryIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem", fontWeight: 700, color: "text.primary" }}>Riwayat Posisi</Typography>
              </Stack>
              {closedHoldings.length > 0 && (
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", color: pnlColor(totals.realizedPnl) }}>
                  Realized: {totals.realizedPnl >= 0 ? "+" : ""}Rp {formatValue(totals.realizedPnl)}
                </Typography>
              )}
            </Stack>
            <Box sx={{ position: "relative", pl: 3 }}>
              <Box sx={{ position: "absolute", left: 10, top: 4, bottom: 4, width: 2, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 1 }} />
              {positionHistory.map((ev, i) => (
                <Box key={`${ev.stock_code}-${ev.date}-${ev.type}-${i}`} sx={{ position: "relative", mb: i < positionHistory.length - 1 ? 1.5 : 0 }}>
                  <Box sx={{
                    position: "absolute", left: -22, top: 4,
                    width: 10, height: 10, borderRadius: "50%",
                    bgcolor: ev.type === "open" ? "#22c55e" : "#ef4444",
                    border: `2px solid ${isDark ? "#0a0a0a" : "#faf9f7"}`,
                  }} />
                  <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap">
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem", color: "text.secondary", minWidth: 72 }}>{ev.date}</Typography>
                    <Chip
                      label={ev.type === "open" ? "BUY" : "SELL"}
                      size="small"
                      sx={{
                        height: 18, fontSize: "0.58rem", fontWeight: 700,
                        fontFamily: '"JetBrains Mono", monospace',
                        bgcolor: ev.type === "open"
                          ? (isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)")
                          : (isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)"),
                        color: ev.type === "open" ? "#22c55e" : "#ef4444",
                        border: "none",
                      }}
                    />
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.76rem", fontWeight: 700, color: accent }}>{ev.stock_code}</Typography>
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.74rem", color: "text.primary" }}>
                      {ev.lots} lot @ Rp {ev.price.toLocaleString()}
                    </Typography>
                    {ev.type === "close" && ev.pnl !== undefined && (
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", fontWeight: 700, color: pnlColor(ev.pnl) }}>
                        {ev.pnl >= 0 ? "+" : ""}Rp {formatValue(ev.pnl)} ({ev.pnlPct !== undefined ? `${ev.pnlPct >= 0 ? "+" : ""}${ev.pnlPct.toFixed(1)}%` : ""})
                      </Typography>
                    )}
                  </Stack>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* Add Holding Dialog */}
        <Dialog open={addOpen} onClose={() => { setAddOpen(false); setSelectedStock(null); setSearchQuery(""); setFormLots(""); setFormAvgPrice(""); }} maxWidth={selectedStock ? "sm" : "xs"} fullWidth slotProps={{ paper: { sx: { borderRadius: "16px", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, bgcolor: isDark ? "#0d0d0d" : "#f5f4f1", backgroundImage: "none" } } }}>
          <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1rem", pb: 0.5 }}>Tambah Saham</DialogTitle>
          <DialogContent sx={{ pt: "12px !important" }}>
            {!selectedStock ? (
              <Box>
                <TextField autoFocus fullWidth size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari kode atau nama saham..." slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} /></InputAdornment> } }} sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.85rem", borderRadius: "10px", "& fieldset": { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }, "&.Mui-focused fieldset": { borderColor: accent } } }} />
                <Box sx={{ maxHeight: 280, overflow: "auto" }}>
                  {filteredOptions.map((opt) => (
                    <Box key={opt.code} onClick={() => setSelectedStock(opt)} sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 1, cursor: "pointer", borderRadius: "8px", "&:hover": { bgcolor: isDark ? "rgba(201,162,39,0.06)" : "rgba(201,162,39,0.04)" } }}>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.82rem", color: accent, minWidth: 50 }}>{opt.code}</Typography>
                      <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.name}</Typography>
                    </Box>
                  ))}
                  {filteredOptions.length === 0 && searchQuery.trim() && <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.secondary", py: 3, textAlign: "center" }}>Tidak ditemukan untuk "{searchQuery}"</Typography>}
                </Box>
              </Box>
            ) : (
              <Stack spacing={2}>
                <Chip label={`${selectedStock.code} - ${selectedStock.name}`} onDelete={() => setSelectedStock(null)} sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.8rem", fontWeight: 600, bgcolor: isDark ? "rgba(201,162,39,0.08)" : "rgba(201,162,39,0.06)", color: accent, border: `1px solid ${isDark ? "rgba(201,162,39,0.2)" : "rgba(201,162,39,0.15)"}`, "& .MuiChip-deleteIcon": { color: accent, "&:hover": { color: "#ef4444" } } }} />

                {/* TradingView Chart */}
                <Box sx={{ borderRadius: "10px", overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, height: 280 }}>
                  <iframe
                    key={selectedStock.code}
                    src={`https://s.tradingview.com/widgetembed/?symbol=IDX:${selectedStock.code}&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=${isDark ? "1a1a1a" : "f5f4f1"}&theme=${isDark ? "dark" : "light"}&style=1&timezone=Asia/Jakarta&withdateranges=1&showpopupbutton=0&studies=[]&locale=id_ID&utm_source=&utm_medium=widget&utm_campaign=chart`}
                    style={{ width: "100%", height: "100%", border: "none" }}
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  />
                </Box>

                <TextField label="Tanggal Entry" type="date" size="small" value={formEntryDate} onChange={(e) => setFormEntryDate(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarTodayIcon sx={{ fontSize: 14, color: "text.secondary" }} /></InputAdornment> } }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.85rem" } }} />
                <TextField label="Jumlah Lot" type="number" size="small" value={formLots} onChange={(e) => setFormLots(e.target.value)} placeholder="cth: 10" helperText={formLots ? `= ${formCalc.shares.toLocaleString()} lembar saham` : "1 lot = 100 lembar saham"} fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.88rem" }, "& .MuiFormHelperText-root": { fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem" } }} />
                <TextField label="Harga Rata-rata Beli (Rp)" type="number" size="small" value={formAvgPrice} onChange={(e) => setFormAvgPrice(e.target.value)} placeholder="cth: 4500" helperText="Harga per lembar saham" fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.88rem" }, "& .MuiFormHelperText-root": { fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem" } }} />

                {formLots && formAvgPrice && (
                  <Paper elevation={0} sx={{ p: 1.75, borderRadius: "10px", bgcolor: isDark ? "rgba(201,162,39,0.04)" : "rgba(201,162,39,0.03)", border: `1px solid ${isDark ? "rgba(201,162,39,0.12)" : "rgba(201,162,39,0.08)"}` }}>
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.7rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1 }}>Kalkulasi ({broker.name})</Typography>
                    {[
                      { l: "Nilai Trading", v: `Rp ${formCalc.tradingValue.toLocaleString()}` },
                      { l: `Fee Beli (${(broker.buyPct * 100).toFixed(2)}%)`, v: `Rp ${Math.round(formCalc.buyFee).toLocaleString()}` },
                      { l: "Total Modal", v: `Rp ${Math.round(formCalc.totalCost).toLocaleString()}`, bold: true },
                      { l: "Harga BEP (incl. fees)", v: `Rp ${formCalc.breakEven.toLocaleString()}`, bold: true },
                    ].map(({ l, v, bold }) => (
                      <Stack key={l} direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary" }}>{l}</Typography>
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", fontWeight: bold ? 700 : 500, color: bold ? "text.primary" : "text.secondary" }}>{v}</Typography>
                      </Stack>
                    ))}
                  </Paper>
                )}

                <TextField label="Catatan (opsional)" size="small" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="cth: Hold jangka panjang" fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontSize: "0.85rem" } }} />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => { setAddOpen(false); setSelectedStock(null); setSearchQuery(""); }} sx={{ fontSize: "0.8rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Batal</Button>
            {selectedStock && (
              <Button onClick={handleAddHolding} disabled={saving || !formLots || !formAvgPrice} sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#050505", bgcolor: accent, borderRadius: "8px", px: 3, fontFamily: '"Plus Jakarta Sans", sans-serif', "&:hover": { bgcolor: "#d4aa30" }, "&.Mui-disabled": { bgcolor: isDark ? "rgba(201,162,39,0.3)" : "rgba(201,162,39,0.4)", color: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.3)" } }}>
                {saving ? "Menambah..." : "Tambah"}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Edit Holding Dialog */}
        <Dialog open={!!editHolding} onClose={() => setEditHolding(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: "16px", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, bgcolor: isDark ? "#0d0d0d" : "#f5f4f1", backgroundImage: "none" } } }}>
          <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1rem", pb: 0.5 }}>Edit {editHolding?.stock_code}</DialogTitle>
          <DialogContent sx={{ pt: "12px !important" }}>
            <Stack spacing={2}>
              <TextField label="Tanggal Entry" type="date" size="small" value={editEntryDate} onChange={(e) => setEditEntryDate(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarTodayIcon sx={{ fontSize: 14, color: "text.secondary" }} /></InputAdornment> } }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.85rem" } }} />
              <TextField label="Jumlah Lot" type="number" size="small" value={editLots} onChange={(e) => setEditLots(e.target.value)} helperText={editLots ? `= ${(parseFloat(editLots) * SHARES_PER_LOT).toLocaleString()} lembar saham` : "1 lot = 100 lembar"} fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.88rem" }, "& .MuiFormHelperText-root": { fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem" } }} />
              <TextField label="Harga Rata-rata Beli (Rp)" type="number" size="small" value={editAvgPrice} onChange={(e) => setEditAvgPrice(e.target.value)} helperText={editLots && editAvgPrice ? `Total modal: Rp ${(parseFloat(editLots) * SHARES_PER_LOT * parseFloat(editAvgPrice)).toLocaleString()}` : "Harga per lembar saham"} fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.88rem" }, "& .MuiFormHelperText-root": { fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem" } }} />
              <TextField label="Catatan (opsional)" size="small" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontSize: "0.85rem" } }} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setEditHolding(null)} sx={{ fontSize: "0.8rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Batal</Button>
            <Button onClick={handleEditHolding} disabled={saving || !editLots || !editAvgPrice} sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#050505", bgcolor: accent, borderRadius: "8px", px: 3, fontFamily: '"Plus Jakarta Sans", sans-serif', "&:hover": { bgcolor: "#d4aa30" }, "&.Mui-disabled": { bgcolor: isDark ? "rgba(201,162,39,0.3)" : "rgba(201,162,39,0.4)", color: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.3)" } }}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Close Position Dialog */}
        <Dialog open={!!closeHolding} onClose={() => setCloseHolding(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: "16px", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, bgcolor: isDark ? "#0d0d0d" : "#f5f4f1", backgroundImage: "none" } } }}>
          <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1rem", pb: 0.5 }}>
            Tutup Posisi {closeHolding?.stock_code}
          </DialogTitle>
          <DialogContent sx={{ pt: "12px !important" }}>
            {closeHolding && (
              <Stack spacing={2}>
                <Paper elevation={0} sx={{ p: 1.75, borderRadius: "10px", bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary" }}>Posisi</Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", fontWeight: 600, color: "text.primary" }}>{closeHolding.lots} lot @ Rp {closeHolding.avg_price.toLocaleString()}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary" }}>Modal</Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", fontWeight: 600, color: "text.primary" }}>Rp {formatValue(closeHolding.cost_basis)}</Typography>
                  </Stack>
                </Paper>
                <TextField label="Tanggal Tutup" type="date" size="small" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarTodayIcon sx={{ fontSize: 14, color: "text.secondary" }} /></InputAdornment> } }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.85rem" } }} />
                <TextField label="Harga Jual (Rp)" type="number" size="small" value={closePrice} onChange={(e) => setClosePrice(e.target.value)} placeholder={`Harga terakhir: ${closeHolding.close.toLocaleString()}`} helperText="Harga per lembar saham saat dijual" fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.88rem" }, "& .MuiFormHelperText-root": { fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem" } }} />
                {closePrice && (
                  <Paper elevation={0} sx={{ p: 1.75, borderRadius: "10px", bgcolor: isDark ? "rgba(201,162,39,0.04)" : "rgba(201,162,39,0.03)", border: `1px solid ${isDark ? "rgba(201,162,39,0.12)" : "rgba(201,162,39,0.08)"}` }}>
                    {(() => {
                      const sellVal = parseFloat(closePrice) * closeHolding.shares;
                      const sellFee = sellVal * broker.sellPct;
                      const netProceeds = sellVal - sellFee;
                      const netCost = closeHolding.cost_basis + closeHolding.buy_fee;
                      const realizedPnl = netProceeds - netCost;
                      return (
                        <>
                          {[
                            { l: "Nilai Jual", v: `Rp ${Math.round(sellVal).toLocaleString()}` },
                            { l: `Fee Jual (${(broker.sellPct * 100).toFixed(2)}%)`, v: `Rp ${Math.round(sellFee).toLocaleString()}` },
                            { l: "Realized P&L (Net)", v: `${realizedPnl >= 0 ? "+" : ""}Rp ${Math.round(realizedPnl).toLocaleString()}`, bold: true, color: pnlColor(realizedPnl) },
                          ].map(({ l, v, bold, color }) => (
                            <Stack key={l} direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary" }}>{l}</Typography>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", fontWeight: bold ? 700 : 500, color: color || (bold ? "text.primary" : "text.secondary") }}>{v}</Typography>
                            </Stack>
                          ))}
                        </>
                      );
                    })()}
                  </Paper>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setCloseHolding(null)} sx={{ fontSize: "0.8rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Batal</Button>
            <Button onClick={handleClosePosition} disabled={saving || !closePrice} sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff", bgcolor: "#ef4444", borderRadius: "8px", px: 3, fontFamily: '"Plus Jakarta Sans", sans-serif', "&:hover": { bgcolor: "#dc2626" }, "&.Mui-disabled": { bgcolor: "rgba(239,68,68,0.3)", color: "rgba(255,255,255,0.3)" } }}>
              {saving ? "Menutup..." : "Tutup Posisi"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* AI Report Modal */}
        <Dialog
          open={aiModalOpen}
          onClose={() => { if (!aiLoading && !followUpLoading) { setAiModalOpen(false); setViewingReport(null); } }}
          maxWidth="md"
          fullWidth
          slotProps={{ paper: { sx: {
            borderRadius: "18px",
            border: `1px solid ${isDark ? "rgba(201,162,39,0.15)" : "rgba(201,162,39,0.1)"}`,
            bgcolor: isDark ? "#0a0a0a" : "#faf9f7",
            backgroundImage: "none",
            height: "85vh",
            display: "flex",
            flexDirection: "column",
          } } }}
        >
          {/* Modal Header */}
          <Box sx={{ flexShrink: 0, px: { xs: 2, md: 3 }, pt: 2, pb: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: isDark ? "rgba(201,162,39,0.1)" : "rgba(201,162,39,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AutoAwesomeIcon sx={{ fontSize: 18, color: accent }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1.05rem", color: "text.primary", lineHeight: 1.2 }}>
                    {viewingReport ? "Laporan Tersimpan" : "AI Portfolio Analysis"}
                  </Typography>
                  <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.7rem", color: "text.secondary" }}>
                    {viewingReport ? `${viewingReport.date} -- ${viewingReport.broker}` : `${enriched.length} saham -- ${broker.name}`}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.5}>
                {!viewingReport && !aiLoading && chatMessages.length >= 2 && !conversationSaved && (
                  <Tooltip title="Simpan percakapan" arrow>
                    <IconButton size="small" onClick={handleSaveConversation} sx={{ color: "text.secondary", "&:hover": { color: "#22c55e" } }}>
                      <SaveIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                )}
                {!viewingReport && !aiLoading && !followUpLoading && aiReport && (
                  <Tooltip title="Regenerate" arrow>
                    <IconButton size="small" onClick={handleAiAnalysis} sx={{ color: "text.secondary", "&:hover": { color: accent } }}>
                      <RefreshIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton size="small" onClick={() => { if (!aiLoading && !followUpLoading) { setAiModalOpen(false); setViewingReport(null); } }} sx={{ color: "text.secondary" }}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Stack>
            </Stack>

            {/* Stat Cards Row */}
            {!viewingReport && enriched.length > 0 && (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, mb: 1.5 }}>
                {[
                  { label: "Total Nilai", value: `Rp ${formatValue(totals.mv)}`, color: "text.primary" },
                  { label: "P&L Net", value: `${totals.netPnl >= 0 ? "+" : ""}${totals.netPnlPct.toFixed(1)}%`, color: pnlColor(totals.netPnl) },
                  { label: "Holdings", value: `${enriched.length} saham`, color: "text.primary" },
                  { label: "Fee Impact", value: `${totals.mv > 0 ? ((totals.totalFees / totals.mv) * 100).toFixed(2) : "0"}%`, color: "#f59e0b" },
                ].map(({ label, value, color }) => (
                  <Box key={label} sx={{ px: 1.5, py: 1, borderRadius: "10px", bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)", border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.6rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.82rem", fontWeight: 700, color, mt: 0.25 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* P&L Chart */}
            {!viewingReport && pnlChartData.length > 1 && (
              <Box sx={{ height: 80, mb: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlChartData} layout="horizontal" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fill: isDark ? "#9ca3af" : "#6b7280" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <RTooltip
                      contentStyle={{ background: isDark ? "#1a1a1a" : "#fff", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, fontSize: 12, fontFamily: '"JetBrains Mono", monospace' }}
                      formatter={(val: number) => [`Rp ${val.toLocaleString()}`, "P&L Net"]}
                    />
                    <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={28}>
                      {pnlChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}

            <Divider sx={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
          </Box>

          {(aiLoading || followUpLoading) && <LinearProgress sx={{ flexShrink: 0, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />}

          {/* Scrollable Chat Area */}
          <Box sx={{ flex: 1, overflow: "auto", px: { xs: 2, md: 3 }, py: 2 }}>
            {viewingReport ? (
              <>
                {(viewingReport.messages || [{ role: "assistant" as const, content: viewingReport.content }]).map((msg, idx) =>
                  msg.role === "user" && idx === 0 ? null : (
                    <Box key={idx} sx={{ mb: 2.5 }}>
                      {msg.role === "user" ? (
                        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
                          <Box sx={{ maxWidth: "80%", px: 2.5, py: 1.5, borderRadius: "14px 14px 4px 14px", bgcolor: isDark ? "rgba(201,162,39,0.12)" : "rgba(201,162,39,0.08)", border: `1px solid ${isDark ? "rgba(201,162,39,0.2)" : "rgba(201,162,39,0.12)"}` }}>
                            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.primary", lineHeight: 1.6 }}>{msg.content}</Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Box sx={{ maxWidth: "100%" }}>
                          {renderFormattedText(msg.content, isDark)}
                        </Box>
                      )}
                    </Box>
                  )
                )}
              </>
            ) : (
              <>
                {chatMessages.length < 2 && aiLoading && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 4, justifyContent: "center" }}>
                    <CircularProgress size={18} sx={{ color: accent }} />
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.84rem", color: "text.secondary" }}>
                      Menganalisis portfolio...
                    </Typography>
                  </Box>
                )}
                {chatMessages.slice(1).map((msg, idx) => (
                  <Box key={idx} sx={{ mb: 2.5 }}>
                    {msg.role === "user" ? (
                      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
                        <Box sx={{ maxWidth: "80%", px: 2.5, py: 1.5, borderRadius: "14px 14px 4px 14px", bgcolor: isDark ? "rgba(201,162,39,0.12)" : "rgba(201,162,39,0.08)", border: `1px solid ${isDark ? "rgba(201,162,39,0.2)" : "rgba(201,162,39,0.12)"}` }}>
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.primary", lineHeight: 1.6 }}>{msg.content}</Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ maxWidth: "100%" }}>
                        {renderFormattedText(msg.content, isDark)}
                      </Box>
                    )}
                  </Box>
                ))}
              </>
            )}
            <div ref={chatEndRef} />
          </Box>

          {/* Follow-up Input */}
          {!viewingReport && chatMessages.length >= 2 && (
            <Box sx={{ flexShrink: 0, px: { xs: 2, md: 3 }, pb: 2, pt: 1 }}>
              <Divider sx={{ mb: 1.5, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  maxRows={3}
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleFollowUp(); } }}
                  placeholder="Tanya lebih lanjut tentang portfolio..."
                  disabled={followUpLoading || aiLoading}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      fontSize: "0.84rem",
                      bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                      "& fieldset": { borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
                      "&.Mui-focused fieldset": { borderColor: accent },
                    },
                  }}
                />
                <IconButton
                  onClick={handleFollowUp}
                  disabled={!followUpInput.trim() || followUpLoading || aiLoading}
                  sx={{
                    width: 40, height: 40, borderRadius: "10px",
                    bgcolor: followUpInput.trim() ? accent : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                    color: followUpInput.trim() ? "#050505" : "text.secondary",
                    "&:hover": { bgcolor: "#d4aa30" },
                    "&.Mui-disabled": { bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" },
                  }}
                >
                  {followUpLoading ? <CircularProgress size={16} sx={{ color: accent }} /> : <SendIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </Stack>
              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.65rem", color: "text.secondary", mt: 0.75, textAlign: "center" }}>
                {conversationSaved ? "Percakapan tersimpan" : "Tekan Enter untuk kirim. Shift+Enter untuk baris baru."}
              </Typography>
            </Box>
          )}
        </Dialog>

        {/* Report History Dialog */}
        <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: "16px", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, bgcolor: isDark ? "#0d0d0d" : "#f5f4f1", backgroundImage: "none" } } }}>
          <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1rem" }}>Riwayat Report</DialogTitle>
          <DialogContent>
            {savedReports.length === 0 ? (
              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.secondary", py: 3, textAlign: "center" }}>Belum ada report tersimpan.</Typography>
            ) : (
              <Stack spacing={1}>
                {savedReports.map((r) => (
                  <Paper
                    key={r.id}
                    elevation={0}
                    onClick={() => { setViewingReport(r); setAiReport(""); setAiModalOpen(true); setHistoryOpen(false); }}
                    sx={{ p: 1.75, borderRadius: "10px", cursor: "pointer", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, "&:hover": { borderColor: accent, bgcolor: isDark ? "rgba(201,162,39,0.04)" : "rgba(201,162,39,0.03)" } }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.8rem", fontWeight: 600, color: "text.primary" }}>{r.date}</Typography>
                        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.7rem", color: "text.secondary" }}>
                          {r.holdingCount} saham -- {r.broker}
                          {r.messages && r.messages.length > 2 ? ` -- ${Math.floor((r.messages.length - 1) / 2)} tanya jawab` : ""}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.25} alignItems="center">
                        <Tooltip title="Hapus report" arrow>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteReport(r.id); setSavedReports(loadSavedReports()); }} sx={{ color: "text.secondary", p: 0.5, "&:hover": { color: "#ef4444" } }}>
                            <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                        <OpenInNewIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setHistoryOpen(false)} sx={{ fontSize: "0.8rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Tutup</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
