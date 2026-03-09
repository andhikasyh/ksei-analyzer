"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { useProContext } from "@/lib/pro-context";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Slider from "@mui/material/Slider";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import LinearProgress from "@mui/material/LinearProgress";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import ReplayIcon from "@mui/icons-material/Replay";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import TuneIcon from "@mui/icons-material/Tune";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import BarChartIcon from "@mui/icons-material/BarChart";
import TimelineIcon from "@mui/icons-material/Timeline";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";

interface TradeResult {
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

interface ExitRule {
  type: "tp_sl" | "holding_period" | "trailing_stop";
  tp?: number;
  sl?: number;
  days?: number;
  trailingPct?: number;
}

interface StockOption {
  code: string;
  name: string;
}

interface SavedExperiment {
  id: string;
  name: string;
  type: "manual" | "strategy";
  config: Record<string, unknown>;
  results: Record<string, unknown>;
  created_at: string;
}

const STOCK_COLORS = ["#c9a227", "#3b82f6", "#22c55e", "#f97316", "#a78bfa"];

const EXIT_REASON_LABEL: Record<string, string> = {
  tp: "Take Profit",
  sl: "Stop Loss",
  trailing: "Trailing Stop",
  expiry: "Period Expired",
  end_of_data: "End of Data",
};

const STRATEGIES = [
  { key: "buy_accumulation", label: "Buy on Accumulation", desc: "Enter when top 3 buyer/seller ratio >= 1.5 with structural asymmetry" },
  { key: "buy_markup", label: "Buy on Markup", desc: "Enter when accumulation ratio >= 1.3 with concentrated buying" },
  { key: "contrarian_markdown", label: "Contrarian Markdown", desc: "Enter during distribution (ratio <= 0.7) for mean reversion" },
];

const TABS = [
  { key: "manual", label: "Manual Backtest" },
  { key: "strategy", label: "Strategy Backtest" },
  { key: "saved", label: "Saved Experiments" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const CAPITAL_PRESETS = [10_000_000, 50_000_000, 100_000_000, 500_000_000, 1_000_000_000];

function formatRupiah(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `Rp${(n / 1_000).toFixed(0)}K`;
  return `Rp${n.toLocaleString()}`;
}

function formatFullRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function LabPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = isDark ? "#c9a227" : "#c9a227";
  const { user } = useProContext();

  const [tab, setTab] = useState<TabKey>("manual");

  const [allOptions, setAllOptions] = useState<StockOption[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("idx_financial_ratios")
        .select("code,stock_name")
        .order("code", { ascending: true })
        .order("fs_date", { ascending: false });
      if (data) {
        const seen = new Set<string>();
        const unique = data.filter((r: Record<string, unknown>) => {
          const c = r.code as string;
          if (seen.has(c)) return false;
          seen.add(c);
          return true;
        });
        setAllOptions(unique.map((r: Record<string, unknown>) => ({ code: r.code as string, name: r.stock_name as string })));
      }
    })();
  }, []);

  // Manual Backtest State
  const [manualStocks, setManualStocks] = useState<string[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [entryDate, setEntryDate] = useState("2025-06-01");
  const [exitType, setExitType] = useState<ExitRule["type"]>("tp_sl");
  const [tp, setTp] = useState("10");
  const [sl, setSl] = useState("5");
  const [holdDays, setHoldDays] = useState("20");
  const [trailingPct, setTrailingPct] = useState("8");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualTrades, setManualTrades] = useState<TradeResult[]>([]);
  const [manualCapital, setManualCapital] = useState("100000000");
  const [manualSizing, setManualSizing] = useState("equal");

  // Strategy Backtest State
  const [stratStocks, setStratStocks] = useState<string[]>([]);
  const [stratSearch, setStratSearch] = useState("");
  const [stratAddOpen, setStratAddOpen] = useState(false);
  const [strategy, setStrategy] = useState("buy_accumulation");
  const [stratExitType, setStratExitType] = useState<ExitRule["type"]>("tp_sl");
  const [stratTp, setStratTp] = useState("15");
  const [stratSl, setStratSl] = useState("7");
  const [stratHoldDays, setStratHoldDays] = useState("30");
  const [stratTrailingPct, setStratTrailingPct] = useState("10");
  const [lookbackMonths, setLookbackMonths] = useState("6");
  const [stratLoading, setStratLoading] = useState(false);
  const [stratTrades, setStratTrades] = useState<TradeResult[]>([]);
  const [stratStats, setStratStats] = useState<Record<string, number>>({});
  const [stratCapital, setStratCapital] = useState("100000000");
  const [stratSizing, setStratSizing] = useState("equal");
  const [monthlyReturns, setMonthlyReturns] = useState<Record<string, number>>({});
  const [drawdownCurve, setDrawdownCurve] = useState<{ date: string; dd: number; equity: number }[]>([]);
  const [stratResultTab, setStratResultTab] = useState(0);

  // Saved Experiments State
  const [savedExperiments, setSavedExperiments] = useState<SavedExperiment[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [expandedExp, setExpandedExp] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveSource, setSaveSource] = useState<"manual" | "strategy">("manual");

  const buildExitRule = useCallback((
    type: ExitRule["type"],
    tpVal: string, slVal: string, daysVal: string, trailVal: string
  ): ExitRule => {
    const rule: ExitRule = { type };
    if (type === "tp_sl") {
      rule.tp = parseFloat(tpVal) || 10;
      rule.sl = parseFloat(slVal) || 5;
    } else if (type === "holding_period") {
      rule.days = parseInt(daysVal) || 20;
      rule.tp = parseFloat(tpVal) || undefined;
      rule.sl = parseFloat(slVal) || undefined;
    } else {
      rule.trailingPct = parseFloat(trailVal) || 8;
    }
    return rule;
  }, []);

  const runManual = useCallback(async () => {
    if (!manualStocks.length || !entryDate) return;
    setManualLoading(true);
    setManualTrades([]);
    try {
      const exitRule = buildExitRule(exitType, tp, sl, holdDays, trailingPct);
      const res = await fetch("/api/lab/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          stocks: manualStocks,
          entryDate,
          exitRule,
          capital: parseInt(manualCapital) || 100_000_000,
          sizing: manualSizing,
        }),
      });
      const data = await res.json();
      setManualTrades(data.trades || []);
    } catch { /* ignore */ }
    setManualLoading(false);
  }, [manualStocks, entryDate, exitType, tp, sl, holdDays, trailingPct, manualCapital, manualSizing, buildExitRule]);

  const runStrategy = useCallback(async () => {
    if (!strategy) return;
    setStratLoading(true);
    setStratTrades([]);
    setStratStats({});
    setMonthlyReturns({});
    setDrawdownCurve([]);
    try {
      const exitRule = buildExitRule(stratExitType, stratTp, stratSl, stratHoldDays, stratTrailingPct);
      const res = await fetch("/api/lab/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "strategy",
          stocks: stratStocks,
          strategy,
          exitRule,
          lookbackMonths: parseInt(lookbackMonths) || 6,
          capital: parseInt(stratCapital) || 100_000_000,
          sizing: stratSizing,
        }),
      });
      const data = await res.json();
      setStratTrades(data.trades || []);
      setStratStats(data.stats || {});
      setMonthlyReturns(data.monthlyReturns || {});
      setDrawdownCurve(data.drawdownCurve || []);
    } catch { /* ignore */ }
    setStratLoading(false);
  }, [strategy, stratStocks, stratExitType, stratTp, stratSl, stratHoldDays, stratTrailingPct, lookbackMonths, stratCapital, stratSizing, buildExitRule]);

  // Saved Experiments
  const fetchSaved = useCallback(async () => {
    if (!user?.id) return;
    setSavedLoading(true);
    try {
      const res = await fetch("/api/lab/experiments");
      const data = await res.json();
      setSavedExperiments(data.experiments || []);
    } catch { /* ignore */ }
    setSavedLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (tab === "saved" && user?.id) fetchSaved();
  }, [tab, user?.id, fetchSaved]);

  const saveExperiment = useCallback(async (type: "manual" | "strategy") => {
    if (!user?.id || !saveName.trim()) return;
    const config = type === "manual"
      ? { stocks: manualStocks, entryDate, exitRule: buildExitRule(exitType, tp, sl, holdDays, trailingPct), capital: parseInt(manualCapital), sizing: manualSizing }
      : { stocks: stratStocks, strategy, exitRule: buildExitRule(stratExitType, stratTp, stratSl, stratHoldDays, stratTrailingPct), lookbackMonths: parseInt(lookbackMonths), capital: parseInt(stratCapital), sizing: stratSizing };
    const results = type === "manual"
      ? { trades: manualTrades }
      : { trades: stratTrades, stats: stratStats, monthlyReturns, drawdownCurve };

    await fetch("/api/lab/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName, type, config, results }),
    });
    setSaveDialogOpen(false);
    setSaveName("");
  }, [user?.id, saveName, manualStocks, entryDate, exitType, tp, sl, holdDays, trailingPct, manualTrades, manualCapital, manualSizing, stratStocks, strategy, stratExitType, stratTp, stratSl, stratHoldDays, stratTrailingPct, lookbackMonths, stratTrades, stratStats, stratCapital, stratSizing, monthlyReturns, drawdownCurve, buildExitRule]);

  const deleteExperiment = useCallback(async (id: string) => {
    if (!user?.id) return;
    await fetch(`/api/lab/experiments?id=${id}`, {
      method: "DELETE",
    });
    setSavedExperiments((prev) => prev.filter((e) => e.id !== id));
  }, [user?.id]);

  const loadExperiment = useCallback((exp: SavedExperiment) => {
    const c = exp.config as Record<string, unknown>;
    const r = exp.results as Record<string, unknown>;
    if (exp.type === "manual") {
      setManualStocks((c.stocks as string[]) || []);
      setEntryDate((c.entryDate as string) || "2025-06-01");
      const er = c.exitRule as ExitRule;
      if (er) {
        setExitType(er.type);
        setTp(String(er.tp ?? "10"));
        setSl(String(er.sl ?? "5"));
        setHoldDays(String(er.days ?? "20"));
        setTrailingPct(String(er.trailingPct ?? "8"));
      }
      if (c.capital) setManualCapital(String(c.capital));
      if (c.sizing) setManualSizing(c.sizing as string);
      setManualTrades((r.trades as TradeResult[]) || []);
      setTab("manual");
    } else {
      setStratStocks((c.stocks as string[]) || []);
      setStrategy((c.strategy as string) || "buy_accumulation");
      const er = c.exitRule as ExitRule;
      if (er) {
        setStratExitType(er.type);
        setStratTp(String(er.tp ?? "15"));
        setStratSl(String(er.sl ?? "7"));
        setStratHoldDays(String(er.days ?? "30"));
        setStratTrailingPct(String(er.trailingPct ?? "10"));
      }
      setLookbackMonths(String(c.lookbackMonths ?? "6"));
      if (c.capital) setStratCapital(String(c.capital));
      if (c.sizing) setStratSizing(c.sizing as string);
      setStratTrades((r.trades as TradeResult[]) || []);
      setStratStats((r.stats as Record<string, number>) || {});
      setMonthlyReturns((r.monthlyReturns as Record<string, number>) || {});
      setDrawdownCurve((r.drawdownCurve as { date: string; dd: number; equity: number }[]) || []);
      setTab("strategy");
    }
  }, []);

  const filterOptions = useCallback((query: string, selected: string[]) => {
    if (!query.trim()) return allOptions.filter((o) => !selected.includes(o.code)).slice(0, 8);
    const q = query.toUpperCase();
    return allOptions
      .filter((o) => !selected.includes(o.code) && (o.code.includes(q) || o.name.toUpperCase().includes(q)))
      .slice(0, 10);
  }, [allOptions]);

  const manualFilteredOptions = useMemo(() => filterOptions(manualSearch, manualStocks), [manualSearch, manualStocks, filterOptions]);
  const stratFilteredOptions = useMemo(() => filterOptions(stratSearch, stratStocks), [stratSearch, stratStocks, filterOptions]);

  const mergedEquityCurve = useMemo(() => {
    if (!manualTrades.length) return [];
    const dateMap = new Map<string, Record<string, number>>();
    for (const trade of manualTrades) {
      for (const pt of trade.equityCurve) {
        if (!dateMap.has(pt.date)) dateMap.set(pt.date, {});
        dateMap.get(pt.date)![trade.symbol] = pt.value;
      }
    }
    const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([date, vals]) => ({ date: date.slice(5), ...vals }));
  }, [manualTrades]);

  const mergedEquityAmount = useMemo(() => {
    if (!manualTrades.length) return [];
    const dateMap = new Map<string, Record<string, number>>();
    for (const trade of manualTrades) {
      for (const pt of trade.equityCurve) {
        if (!dateMap.has(pt.date)) dateMap.set(pt.date, {});
        dateMap.get(pt.date)![trade.symbol] = pt.amount;
      }
    }
    const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([date, vals]) => {
      const total = Object.values(vals).reduce((a, b) => a + b, 0);
      return { date: date.slice(5), ...vals, total };
    });
  }, [manualTrades]);

  const [manualChartMode, setManualChartMode] = useState<"pct" | "amount">("pct");

  const pnlHistogram = useMemo(() => {
    if (!stratTrades.length) return [];
    const bucketSize = 2;
    const buckets = new Map<number, number>();
    for (const t of stratTrades) {
      const b = Math.floor(t.pnlPct / bucketSize) * bucketSize;
      buckets.set(b, (buckets.get(b) || 0) + 1);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([range, count]) => ({
        range: `${range >= 0 ? "+" : ""}${range}%`,
        rangeVal: range,
        count,
      }));
  }, [stratTrades]);

  const cumulativeEquity = useMemo(() => {
    if (!stratTrades.length) return [];
    const sorted = [...stratTrades].sort((a, b) => a.exitDate.localeCompare(b.exitDate));
    let cumPnl = 0;
    let cumAmount = 0;
    return sorted.map((t) => {
      cumPnl += t.pnlPct;
      cumAmount += t.pnlAmount;
      return { date: t.exitDate.slice(5), cumPnl: Math.round(cumPnl * 100) / 100, cumAmount, symbol: t.symbol };
    });
  }, [stratTrades]);

  const waterfallData = useMemo(() => {
    if (!stratTrades.length) return [];
    const sorted = [...stratTrades].sort((a, b) => a.exitDate.localeCompare(b.exitDate));
    let running = 0;
    return sorted.slice(0, 50).map((t, i) => {
      const start = running;
      running += t.pnlAmount;
      return {
        name: `${t.symbol} (${t.exitDate.slice(5)})`,
        pnl: t.pnlAmount,
        start,
        end: running,
        pnlPct: t.pnlPct,
        idx: i,
      };
    });
  }, [stratTrades]);

  const monthlyHeatmapData = useMemo(() => {
    if (!Object.keys(monthlyReturns).length) return [];
    const months = Object.keys(monthlyReturns).sort();
    return months.map((m) => ({
      month: m,
      label: new Date(m + "-01").toLocaleDateString("en", { month: "short", year: "2-digit" }),
      value: monthlyReturns[m],
    }));
  }, [monthlyReturns]);

  const monoSx = { fontFamily: '"JetBrains Mono", monospace' };
  const labelSx = { fontSize: "0.7rem", fontWeight: 600, mb: 0.75, color: "text.secondary", ...monoSx, letterSpacing: "0.05em", textTransform: "uppercase" as const };
  const sectionTitleSx = { fontSize: "0.72rem", fontWeight: 700, mb: 1.5, ...monoSx, color: accent, textTransform: "uppercase" as const, letterSpacing: "0.06em" };

  function StockSelector({
    stocks, setStocks, search, setSearch, addOpen, setAddOpen, filteredOptions, max = 5,
  }: {
    stocks: string[];
    setStocks: (s: string[]) => void;
    search: string;
    setSearch: (s: string) => void;
    addOpen: boolean;
    setAddOpen: (o: boolean) => void;
    filteredOptions: StockOption[];
    max?: number;
  }) {
    return (
      <Box>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}>
          {stocks.map((code, i) => (
            <Chip
              key={code}
              label={code}
              size="small"
              onDelete={() => setStocks(stocks.filter((c) => c !== code))}
              sx={{
                ...monoSx, fontWeight: 700, fontSize: "0.72rem",
                bgcolor: `${STOCK_COLORS[i % STOCK_COLORS.length]}20`,
                color: STOCK_COLORS[i % STOCK_COLORS.length],
                border: `1px solid ${STOCK_COLORS[i % STOCK_COLORS.length]}40`,
                "& .MuiChip-deleteIcon": { color: STOCK_COLORS[i % STOCK_COLORS.length], fontSize: 14 },
              }}
            />
          ))}
          {stocks.length < max && (
            <Chip
              icon={<AddIcon sx={{ fontSize: 14 }} />}
              label="Add"
              size="small"
              onClick={() => setAddOpen(true)}
              variant="outlined"
              sx={{ ...monoSx, fontSize: "0.68rem", cursor: "pointer", borderStyle: "dashed" }}
            />
          )}
        </Stack>
        {addOpen && (
          <ClickAwayListener onClickAway={() => { setAddOpen(false); setSearch(""); }}>
            <Box sx={{ position: "relative" }}>
              <TextField
                autoFocus
                size="small"
                placeholder="Search ticker..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} />,
                    sx: { ...monoSx, fontSize: "0.75rem" },
                  },
                }}
                sx={{ width: "100%", mb: 0.5 }}
              />
              {filteredOptions.length > 0 && (
                <Paper
                  elevation={8}
                  sx={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                    maxHeight: 200, overflow: "auto",
                  }}
                >
                  {filteredOptions.map((opt) => (
                    <Box
                      key={opt.code}
                      onClick={() => {
                        setStocks([...stocks, opt.code]);
                        setSearch("");
                        setAddOpen(false);
                      }}
                      sx={{
                        px: 1.5, py: 0.75, cursor: "pointer", display: "flex", gap: 1, alignItems: "center",
                        "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" },
                      }}
                    >
                      <Typography sx={{ ...monoSx, fontWeight: 700, fontSize: "0.75rem", color: accent }}>{opt.code}</Typography>
                      <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.name}</Typography>
                    </Box>
                  ))}
                </Paper>
              )}
            </Box>
          </ClickAwayListener>
        )}
      </Box>
    );
  }

  function CapitalInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const numVal = parseInt(value) || 0;
    return (
      <Box>
        <Typography sx={labelSx}>
          <AccountBalanceWalletIcon sx={{ fontSize: 13, mr: 0.5, verticalAlign: "middle" }} />
          Starting Capital
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
          {CAPITAL_PRESETS.map((preset) => (
            <Box
              key={preset}
              onClick={() => onChange(String(preset))}
              sx={{
                px: 1.25, py: 0.4, cursor: "pointer", borderRadius: 1,
                ...monoSx, fontSize: "0.65rem", fontWeight: 600,
                transition: "all 0.15s",
                color: numVal === preset ? (isDark ? "#fff" : "#1c1c1a") : "text.secondary",
                bgcolor: numVal === preset ? `${accent}25` : "transparent",
                border: `1px solid ${numVal === preset ? accent + "50" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                "&:hover": { bgcolor: numVal === preset ? undefined : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") },
              }}
            >
              {formatRupiah(preset)}
            </Box>
          ))}
        </Stack>
        <TextField
          size="small"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="number"
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><Typography sx={{ ...monoSx, fontSize: "0.7rem", color: "text.secondary" }}>Rp</Typography></InputAdornment>,
              sx: { ...monoSx, fontSize: "0.75rem" },
            },
          }}
          sx={{ width: 220 }}
        />
        <Typography sx={{ fontSize: "0.62rem", color: "text.secondary", mt: 0.3, ...monoSx }}>
          {formatFullRupiah(numVal)}
        </Typography>
      </Box>
    );
  }

  function SizingSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <Box>
        <Typography sx={labelSx}>Position Sizing</Typography>
        <Stack direction="row" spacing={0.5}>
          {[
            { key: "equal", label: "Equal Weight", desc: "Split capital equally" },
            { key: "concentrated", label: "Concentrated", desc: "Full capital per trade" },
          ].map((opt) => (
            <Tooltip key={opt.key} title={opt.desc} placement="top" arrow>
              <Box
                onClick={() => onChange(opt.key)}
                sx={{
                  px: 1.25, py: 0.4, cursor: "pointer", borderRadius: 1,
                  ...monoSx, fontSize: "0.65rem", fontWeight: 600,
                  transition: "all 0.15s",
                  color: value === opt.key ? (isDark ? "#fff" : "#1c1c1a") : "text.secondary",
                  bgcolor: value === opt.key ? `${accent}25` : "transparent",
                  border: `1px solid ${value === opt.key ? accent + "50" : "transparent"}`,
                  "&:hover": { bgcolor: value === opt.key ? undefined : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") },
                }}
              >
                {opt.label}
              </Box>
            </Tooltip>
          ))}
        </Stack>
      </Box>
    );
  }

  function ExitRuleConfig({
    exitType: et, setExitType: setEt,
    tp: tpv, setTp: setTpv, sl: slv, setSl: setSlv,
    holdDays: hd, setHoldDays: setHd,
    trailingPct: trail, setTrailingPct: setTrail,
  }: {
    exitType: ExitRule["type"]; setExitType: (t: ExitRule["type"]) => void;
    tp: string; setTp: (v: string) => void;
    sl: string; setSl: (v: string) => void;
    holdDays: string; setHoldDays: (v: string) => void;
    trailingPct: string; setTrailingPct: (v: string) => void;
  }) {
    const tpNum = parseFloat(tpv) || 0;
    const slNum = parseFloat(slv) || 0;
    const riskReward = slNum > 0 ? (tpNum / slNum).toFixed(2) : "--";

    return (
      <Box>
        <Typography sx={labelSx}>
          <TuneIcon sx={{ fontSize: 13, mr: 0.5, verticalAlign: "middle" }} />
          Exit Rules
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
          {([
            { key: "tp_sl" as const, label: "TP / SL" },
            { key: "holding_period" as const, label: "Hold Period" },
            { key: "trailing_stop" as const, label: "Trailing Stop" },
          ]).map((opt) => (
            <Box
              key={opt.key}
              onClick={() => setEt(opt.key)}
              sx={{
                px: 1.25, py: 0.4, cursor: "pointer", borderRadius: 1,
                ...monoSx, fontSize: "0.65rem", fontWeight: 600,
                transition: "all 0.15s",
                color: et === opt.key ? (isDark ? "#fff" : "#1c1c1a") : "text.secondary",
                bgcolor: et === opt.key ? `${accent}25` : "transparent",
                border: `1px solid ${et === opt.key ? accent + "50" : "transparent"}`,
                "&:hover": { bgcolor: et === opt.key ? undefined : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") },
              }}
            >
              {opt.label}
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="flex-end">
          {(et === "tp_sl" || et === "holding_period") && (
            <>
              <Box>
                <Typography sx={{ ...monoSx, fontSize: "0.6rem", color: "#22c55e", mb: 0.25 }}>Take Profit</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Slider
                    value={parseFloat(tpv) || 0}
                    onChange={(_, v) => setTpv(String(v))}
                    min={1} max={50} step={1}
                    sx={{ width: 100, color: "#22c55e", "& .MuiSlider-thumb": { width: 14, height: 14 } }}
                  />
                  <TextField
                    size="small" value={tpv}
                    onChange={(e) => setTpv(e.target.value)} type="number"
                    sx={{ width: 70 }}
                    slotProps={{ input: { sx: { ...monoSx, fontSize: "0.75rem" }, endAdornment: <InputAdornment position="end"><Typography sx={{ ...monoSx, fontSize: "0.6rem" }}>%</Typography></InputAdornment> } }}
                  />
                </Stack>
              </Box>
              <Box>
                <Typography sx={{ ...monoSx, fontSize: "0.6rem", color: "#ef4444", mb: 0.25 }}>Stop Loss</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Slider
                    value={parseFloat(slv) || 0}
                    onChange={(_, v) => setSlv(String(v))}
                    min={1} max={30} step={1}
                    sx={{ width: 100, color: "#ef4444", "& .MuiSlider-thumb": { width: 14, height: 14 } }}
                  />
                  <TextField
                    size="small" value={slv}
                    onChange={(e) => setSlv(e.target.value)} type="number"
                    sx={{ width: 70 }}
                    slotProps={{ input: { sx: { ...monoSx, fontSize: "0.75rem" }, endAdornment: <InputAdornment position="end"><Typography sx={{ ...monoSx, fontSize: "0.6rem" }}>%</Typography></InputAdornment> } }}
                  />
                </Stack>
              </Box>
              {et === "tp_sl" && (
                <Box sx={{
                  px: 1.25, py: 0.6, borderRadius: 1.5,
                  bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                }}>
                  <Typography sx={{ ...monoSx, fontSize: "0.56rem", color: "text.secondary", textTransform: "uppercase" }}>R:R Ratio</Typography>
                  <Typography sx={{ ...monoSx, fontSize: "0.95rem", fontWeight: 800, color: parseFloat(riskReward) >= 2 ? "#22c55e" : parseFloat(riskReward) >= 1 ? accent : "#ef4444" }}>
                    {riskReward}
                  </Typography>
                </Box>
              )}
            </>
          )}
          {et === "holding_period" && (
            <Box>
              <Typography sx={{ ...monoSx, fontSize: "0.6rem", color: "text.secondary", mb: 0.25 }}>Max Days</Typography>
              <TextField
                size="small" value={hd}
                onChange={(e) => setHd(e.target.value)} type="number"
                sx={{ width: 80 }}
                slotProps={{ input: { sx: { ...monoSx, fontSize: "0.75rem" } } }}
              />
            </Box>
          )}
          {et === "trailing_stop" && (
            <Box>
              <Typography sx={{ ...monoSx, fontSize: "0.6rem", color: accent, mb: 0.25 }}>Trail Distance</Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Slider
                  value={parseFloat(trail) || 0}
                  onChange={(_, v) => setTrail(String(v))}
                  min={1} max={25} step={0.5}
                  sx={{ width: 120, color: accent, "& .MuiSlider-thumb": { width: 14, height: 14 } }}
                />
                <TextField
                  size="small" value={trail}
                  onChange={(e) => setTrail(e.target.value)} type="number"
                  sx={{ width: 70 }}
                  slotProps={{ input: { sx: { ...monoSx, fontSize: "0.75rem" }, endAdornment: <InputAdornment position="end"><Typography sx={{ ...monoSx, fontSize: "0.6rem" }}>%</Typography></InputAdornment> } }}
                />
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>
    );
  }

  function TradeCard({ trade, idx }: { trade: TradeResult; idx: number }) {
    const color = STOCK_COLORS[idx % STOCK_COLORS.length];
    const pnlColor = trade.pnlPct >= 0 ? "#22c55e" : "#ef4444";
    return (
      <Paper
        elevation={0}
        sx={{
          p: 1.75, borderRadius: 2, flex: "1 1 220px", minWidth: 220,
          border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
          transition: "transform 0.15s, box-shadow 0.15s",
          "&:hover": { transform: "translateY(-2px)", boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.3)" : "0 8px 24px rgba(0,0,0,0.08)" },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
          <Typography sx={{ ...monoSx, fontWeight: 800, fontSize: "0.9rem", color }}>{trade.symbol}</Typography>
          <Stack alignItems="flex-end" spacing={0.15}>
            <Box sx={{
              px: 1, py: 0.3, borderRadius: 1,
              bgcolor: `${pnlColor}15`, color: pnlColor,
              ...monoSx, fontWeight: 800, fontSize: "0.82rem",
            }}>
              {trade.pnlPct >= 0 ? "+" : ""}{trade.pnlPct.toFixed(2)}%
            </Box>
            <Typography sx={{ ...monoSx, fontSize: "0.62rem", fontWeight: 700, color: pnlColor }}>
              {trade.pnlAmount >= 0 ? "+" : ""}{formatRupiah(trade.pnlAmount)}
            </Typography>
          </Stack>
        </Stack>
        <Stack spacing={0.4}>
          {([
            ["Entry", `${trade.entryPrice.toLocaleString()} (${trade.entryDate})`],
            ["Exit", `${trade.exitPrice.toLocaleString()} (${trade.exitDate})`],
            ["Reason", EXIT_REASON_LABEL[trade.exitReason] || trade.exitReason],
            ["Shares", trade.shares.toLocaleString()],
            ["Capital", formatRupiah(trade.capitalUsed)],
            ["Hold", `${trade.holdingDays} days`],
            ["Max DD", `${trade.maxDrawdownPct.toFixed(2)}%`],
            ["Max Gain", `+${trade.maxGainPct.toFixed(2)}%`],
          ] as [string, string][]).map(([label, val]) => (
            <Stack key={label} direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: "0.64rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{label}</Typography>
              <Typography sx={{ fontSize: "0.66rem", fontWeight: 600, ...monoSx }}>{val}</Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>
    );
  }

  function StatCard({ label, value, color: c, sublabel }: { label: string; value: string; color?: string; sublabel?: string }) {
    return (
      <Box sx={{
        px: 1.5, py: 1, borderRadius: 1.5, flex: "1 1 120px", minWidth: 100, textAlign: "center",
        border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        transition: "transform 0.12s",
        "&:hover": { transform: "scale(1.03)" },
      }}>
        <Typography sx={{ fontSize: "0.56rem", color: "text.secondary", ...monoSx, textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.25 }}>{label}</Typography>
        <Typography sx={{ fontSize: "1rem", fontWeight: 800, ...monoSx, color: c || "text.primary" }}>{value}</Typography>
        {sublabel && <Typography sx={{ fontSize: "0.54rem", color: "text.secondary", ...monoSx, mt: 0.15 }}>{sublabel}</Typography>}
      </Box>
    );
  }

  const panelSx = {
    p: { xs: 2, sm: 2.5 }, borderRadius: 2.5, mb: 2.5,
    border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#f5f4f1",
  };

  const chartTooltipStyle = {
    ...monoSx, fontSize: "0.7rem",
    backgroundColor: isDark ? "#1a1a2e" : "#f0eeeb",
    border: `1px solid ${isDark ? "#333" : "#ddd"}`,
    borderRadius: 8,
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  };

  return (
    <Box sx={{ pb: 6, pt: 2 }}>
      <Box sx={{ mb: 3 }} className="animate-in">
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography sx={{
            fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: { xs: "1.4rem", md: "1.8rem" },
            background: `linear-gradient(135deg, ${accent}, ${isDark ? "#f0d78c" : "#6b4d1a"})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Strategy Lab
          </Typography>
          <Box
            sx={{
              px: 0.85,
              py: 0.35,
              borderRadius: "6px",
              fontSize: "0.58rem",
              fontWeight: 800,
              fontFamily: '"JetBrains Mono", monospace',
              letterSpacing: "0.06em",
              bgcolor: `${accent}20`,
              color: accent,
              border: `1px solid ${accent}50`,
            }}
          >
            BETA
          </Box>
        </Stack>
        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.secondary", mt: 0.5 }}>
          Backtest trading strategies against historical IDX data with capital simulation
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          display: "inline-flex", borderRadius: 2, mb: 3,
          border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
          overflow: "hidden",
        }}
        className="animate-in animate-in-delay-1"
      >
        {TABS.map((t) => (
          <Box
            key={t.key}
            onClick={() => setTab(t.key)}
            sx={{
              px: { xs: 1.5, sm: 2.5 }, py: 1, cursor: "pointer",
              ...monoSx, fontSize: { xs: "0.65rem", sm: "0.72rem" }, fontWeight: 700,
              transition: "all 0.15s",
              color: tab === t.key ? (isDark ? "#fff" : "#1c1c1a") : "text.secondary",
              bgcolor: tab === t.key ? `${accent}20` : "transparent",
              borderBottom: tab === t.key ? `2px solid ${accent}` : "2px solid transparent",
              "&:hover": { bgcolor: tab === t.key ? undefined : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)") },
            }}
          >
            {t.label}
          </Box>
        ))}
      </Paper>

      {/* MANUAL BACKTEST */}
      {tab === "manual" && (
        <Box className="animate-in animate-in-delay-2">
          <Paper elevation={0} sx={panelSx}>
            <Typography sx={sectionTitleSx}>Configuration</Typography>
            <Stack spacing={2}>
              <Box>
                <Typography sx={labelSx}>Stocks (up to 5)</Typography>
                <StockSelector
                  stocks={manualStocks} setStocks={setManualStocks}
                  search={manualSearch} setSearch={setManualSearch}
                  addOpen={manualAddOpen} setAddOpen={setManualAddOpen}
                  filteredOptions={manualFilteredOptions}
                />
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <CapitalInput value={manualCapital} onChange={setManualCapital} />
                <SizingSelector value={manualSizing} onChange={setManualSizing} />
              </Stack>

              <Box>
                <Typography sx={labelSx}>Entry Date</Typography>
                <TextField
                  size="small" type="date" value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  slotProps={{ htmlInput: { min: "2025-03-04", max: "2026-03-06", style: { ...monoSx, fontSize: "0.75rem" } } }}
                  sx={{ width: 180 }}
                />
              </Box>

              <ExitRuleConfig
                exitType={exitType} setExitType={setExitType}
                tp={tp} setTp={setTp} sl={sl} setSl={setSl}
                holdDays={holdDays} setHoldDays={setHoldDays}
                trailingPct={trailingPct} setTrailingPct={setTrailingPct}
              />

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained" size="small"
                  startIcon={<PlayArrowIcon />}
                  onClick={runManual}
                  disabled={manualLoading || !manualStocks.length}
                  sx={{
                    ...monoSx, fontWeight: 700, fontSize: "0.72rem",
                    bgcolor: accent, color: "#0c1222", textTransform: "none",
                    "&:hover": { bgcolor: isDark ? "#f0d78c" : "#8a6320" },
                    "&.Mui-disabled": { bgcolor: `${accent}40` },
                  }}
                >
                  {manualLoading ? "Running..." : "Run Backtest"}
                </Button>
                {manualTrades.length > 0 && user?.id && (
                  <Button
                    variant="outlined" size="small"
                    startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                    onClick={() => { setSaveSource("manual"); setSaveDialogOpen(true); }}
                    sx={{ ...monoSx, fontSize: "0.68rem", textTransform: "none", borderColor: `${accent}50`, color: accent }}
                  >
                    Save
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>

          {manualLoading && (
            <Stack spacing={1}>
              <LinearProgress sx={{ borderRadius: 2, bgcolor: `${accent}15`, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
              {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />)}
            </Stack>
          )}

          {!manualLoading && manualTrades.length > 0 && (
            <Stack spacing={2.5}>
              {/* Portfolio Summary */}
              {manualTrades.length > 1 && (
                <Paper elevation={0} sx={panelSx}>
                  <Typography sx={sectionTitleSx}>Portfolio Summary</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <StatCard
                      label="Total Capital"
                      value={formatRupiah(parseInt(manualCapital) || 0)}
                    />
                    <StatCard
                      label="Total P&L"
                      value={`${manualTrades.reduce((s, t) => s + t.pnlAmount, 0) >= 0 ? "+" : ""}${formatRupiah(manualTrades.reduce((s, t) => s + t.pnlAmount, 0))}`}
                      color={manualTrades.reduce((s, t) => s + t.pnlAmount, 0) >= 0 ? "#22c55e" : "#ef4444"}
                    />
                    <StatCard
                      label="Avg Return"
                      value={`${(manualTrades.reduce((s, t) => s + t.pnlPct, 0) / manualTrades.length).toFixed(2)}%`}
                      color={(manualTrades.reduce((s, t) => s + t.pnlPct, 0) / manualTrades.length) >= 0 ? "#22c55e" : "#ef4444"}
                    />
                    <StatCard
                      label="Win Rate"
                      value={`${Math.round((manualTrades.filter((t) => t.pnlPct > 0).length / manualTrades.length) * 100)}%`}
                      color={(manualTrades.filter((t) => t.pnlPct > 0).length / manualTrades.length) >= 0.5 ? "#22c55e" : "#ef4444"}
                    />
                    <StatCard
                      label="Final Value"
                      value={formatRupiah((parseInt(manualCapital) || 0) + manualTrades.reduce((s, t) => s + t.pnlAmount, 0))}
                      sublabel={`${((manualTrades.reduce((s, t) => s + t.pnlAmount, 0) / (parseInt(manualCapital) || 1)) * 100).toFixed(2)}% return`}
                    />
                  </Stack>
                </Paper>
              )}

              {/* Equity Curve */}
              <Paper elevation={0} sx={panelSx}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography sx={{ ...sectionTitleSx, mb: 0 }}>Equity Curve</Typography>
                  <Stack direction="row" spacing={0.5}>
                    {[
                      { key: "pct" as const, icon: <ShowChartIcon sx={{ fontSize: 14 }} />, label: "%" },
                      { key: "amount" as const, icon: <AccountBalanceWalletIcon sx={{ fontSize: 14 }} />, label: "Rp" },
                    ].map((opt) => (
                      <Box
                        key={opt.key}
                        onClick={() => setManualChartMode(opt.key)}
                        sx={{
                          px: 1, py: 0.3, cursor: "pointer", borderRadius: 1,
                          display: "flex", alignItems: "center", gap: 0.3,
                          ...monoSx, fontSize: "0.6rem", fontWeight: 600,
                          color: manualChartMode === opt.key ? accent : "text.secondary",
                          bgcolor: manualChartMode === opt.key ? `${accent}15` : "transparent",
                          border: `1px solid ${manualChartMode === opt.key ? accent + "40" : "transparent"}`,
                        }}
                      >
                        {opt.icon} {opt.label}
                      </Box>
                    ))}
                  </Stack>
                </Stack>
                <ResponsiveContainer width="100%" height={300}>
                  {manualChartMode === "pct" ? (
                    <LineChart data={mergedEquityCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} />
                      <YAxis tick={{ fontSize: 10, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} />
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                      <ReferenceLine y={100} stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"} strokeDasharray="5 5" />
                      <Legend wrapperStyle={{ ...monoSx, fontSize: "0.68rem" }} />
                      {manualTrades.map((t, i) => (
                        <Line key={t.symbol} type="monotone" dataKey={t.symbol} stroke={STOCK_COLORS[i % STOCK_COLORS.length]} strokeWidth={2} dot={false} connectNulls />
                      ))}
                    </LineChart>
                  ) : (
                    <AreaChart data={mergedEquityAmount}>
                      <defs>
                        {manualTrades.map((t, i) => (
                          <linearGradient key={t.symbol} id={`grad-${t.symbol}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={STOCK_COLORS[i % STOCK_COLORS.length]} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={STOCK_COLORS[i % STOCK_COLORS.length]} stopOpacity={0.02} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} />
                      <YAxis tick={{ fontSize: 9, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} tickFormatter={(v: number) => formatRupiah(v)} />
                      <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatFullRupiah(v)} />
                      <Legend wrapperStyle={{ ...monoSx, fontSize: "0.68rem" }} />
                      {manualTrades.map((t, i) => (
                        <Area key={t.symbol} type="monotone" dataKey={t.symbol} stroke={STOCK_COLORS[i % STOCK_COLORS.length]} strokeWidth={2} fill={`url(#grad-${t.symbol})`} connectNulls />
                      ))}
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </Paper>

              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                {manualTrades.map((t, i) => <TradeCard key={t.symbol} trade={t} idx={i} />)}
              </Stack>
            </Stack>
          )}
        </Box>
      )}

      {/* STRATEGY BACKTEST */}
      {tab === "strategy" && (
        <Box className="animate-in animate-in-delay-2">
          <Paper elevation={0} sx={panelSx}>
            <Typography sx={sectionTitleSx}>Strategy Configuration</Typography>
            <Stack spacing={2}>
              <Box>
                <Typography sx={labelSx}>Strategy</Typography>
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <Select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    sx={{ ...monoSx, fontSize: "0.75rem" }}
                  >
                    {STRATEGIES.map((s) => (
                      <MenuItem key={s.key} value={s.key} sx={{ ...monoSx, fontSize: "0.75rem" }}>{s.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography sx={{ fontSize: "0.64rem", color: "text.secondary", mt: 0.5, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  {STRATEGIES.find((s) => s.key === strategy)?.desc}
                </Typography>
              </Box>

              <Box>
                <Typography sx={labelSx}>Stock Universe (empty = all liquid stocks)</Typography>
                <StockSelector
                  stocks={stratStocks} setStocks={setStratStocks}
                  search={stratSearch} setSearch={setStratSearch}
                  addOpen={stratAddOpen} setAddOpen={setStratAddOpen}
                  filteredOptions={stratFilteredOptions}
                  max={20}
                />
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <CapitalInput value={stratCapital} onChange={setStratCapital} />
                <SizingSelector value={stratSizing} onChange={setStratSizing} />
              </Stack>

              <Stack direction="row" spacing={1} alignItems="flex-end">
                <Box>
                  <Typography sx={labelSx}>Lookback</Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={lookbackMonths}
                      onChange={(e) => setLookbackMonths(e.target.value)}
                      sx={{ ...monoSx, fontSize: "0.75rem" }}
                    >
                      {[{ v: "3", l: "3 months" }, { v: "6", l: "6 months" }, { v: "9", l: "9 months" }, { v: "12", l: "12 months" }].map((o) => (
                        <MenuItem key={o.v} value={o.v} sx={{ ...monoSx, fontSize: "0.75rem" }}>{o.l}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Stack>

              <ExitRuleConfig
                exitType={stratExitType} setExitType={setStratExitType}
                tp={stratTp} setTp={setStratTp} sl={stratSl} setSl={setStratSl}
                holdDays={stratHoldDays} setHoldDays={setStratHoldDays}
                trailingPct={stratTrailingPct} setTrailingPct={setStratTrailingPct}
              />

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained" size="small"
                  startIcon={<PlayArrowIcon />}
                  onClick={runStrategy}
                  disabled={stratLoading}
                  sx={{
                    ...monoSx, fontWeight: 700, fontSize: "0.72rem",
                    bgcolor: accent, color: "#0c1222", textTransform: "none",
                    "&:hover": { bgcolor: isDark ? "#f0d78c" : "#8a6320" },
                    "&.Mui-disabled": { bgcolor: `${accent}40` },
                  }}
                >
                  {stratLoading ? "Analyzing..." : "Run Strategy"}
                </Button>
                {stratTrades.length > 0 && user?.id && (
                  <Button
                    variant="outlined" size="small"
                    startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                    onClick={() => { setSaveSource("strategy"); setSaveDialogOpen(true); }}
                    sx={{ ...monoSx, fontSize: "0.68rem", textTransform: "none", borderColor: `${accent}50`, color: accent }}
                  >
                    Save
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>

          {stratLoading && (
            <Stack spacing={1}>
              <LinearProgress sx={{ borderRadius: 2, bgcolor: `${accent}15`, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={60} sx={{ borderRadius: 2 }} />)}
            </Stack>
          )}

          {!stratLoading && stratTrades.length > 0 && (
            <Stack spacing={2.5}>
              {/* Stats Row 1 */}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <StatCard label="Total Trades" value={String(stratStats.totalTrades || 0)} />
                <StatCard label="Win Rate" value={`${stratStats.winRate || 0}%`} color={(stratStats.winRate || 0) >= 50 ? "#22c55e" : "#ef4444"} />
                <StatCard label="Avg Return" value={`${(stratStats.avgReturn || 0) >= 0 ? "+" : ""}${(stratStats.avgReturn || 0).toFixed(2)}%`} color={(stratStats.avgReturn || 0) >= 0 ? "#22c55e" : "#ef4444"} />
                <StatCard label="Profit Factor" value={String(stratStats.profitFactor || 0)} color={(stratStats.profitFactor || 0) >= 1 ? "#22c55e" : "#ef4444"} />
                <StatCard
                  label="Total P&L"
                  value={`${(stratStats.totalPnlAmount || 0) >= 0 ? "+" : ""}${formatRupiah(stratStats.totalPnlAmount || 0)}`}
                  color={(stratStats.totalPnlAmount || 0) >= 0 ? "#22c55e" : "#ef4444"}
                />
              </Stack>

              {/* Stats Row 2 - Advanced Risk Metrics */}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <StatCard label="Sharpe Ratio" value={String(stratStats.sharpe || 0)} color={(stratStats.sharpe || 0) >= 1 ? "#22c55e" : (stratStats.sharpe || 0) >= 0.5 ? accent : "#ef4444"} sublabel="Risk-adj return" />
                <StatCard label="Sortino Ratio" value={String(stratStats.sortino || 0)} color={(stratStats.sortino || 0) >= 1.5 ? "#22c55e" : (stratStats.sortino || 0) >= 0.5 ? accent : "#ef4444"} sublabel="Downside risk" />
                <StatCard label="Calmar Ratio" value={String(stratStats.calmar || 0)} color={(stratStats.calmar || 0) >= 1 ? "#22c55e" : "#ef4444"} sublabel="Return / Max DD" />
                <StatCard label="Expectancy" value={`${(stratStats.expectancy || 0) >= 0 ? "+" : ""}${(stratStats.expectancy || 0).toFixed(2)}%`} color={(stratStats.expectancy || 0) >= 0 ? "#22c55e" : "#ef4444"} sublabel="Per trade edge" />
                <StatCard label="Max Drawdown" value={`${(stratStats.maxDrawdownPct || 0).toFixed(1)}%`} color="#ef4444" sublabel="Peak to trough" />
                <StatCard label="Final Equity" value={formatRupiah(stratStats.finalEquity || 0)} sublabel={`Started ${formatRupiah(parseInt(stratCapital) || 0)}`} />
              </Stack>

              {/* Stats Row 3 */}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <StatCard label="Max Win" value={`+${(stratStats.maxWin || 0).toFixed(1)}%`} color="#22c55e" />
                <StatCard label="Max Loss" value={`${(stratStats.maxLoss || 0).toFixed(1)}%`} color="#ef4444" />
                <StatCard label="Avg Hold" value={`${stratStats.avgHoldingDays || 0}d`} />
                <StatCard label="Consec W/L" value={`${stratStats.maxConsecWins || 0} / ${stratStats.maxConsecLosses || 0}`} />
              </Stack>

              {/* Tabbed Chart Area */}
              <Paper elevation={0} sx={panelSx}>
                <Tabs
                  value={stratResultTab}
                  onChange={(_, v) => setStratResultTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    mb: 2, minHeight: 32,
                    "& .MuiTab-root": { ...monoSx, fontSize: "0.65rem", fontWeight: 700, textTransform: "none", minHeight: 32, py: 0.5 },
                    "& .Mui-selected": { color: `${accent} !important` },
                    "& .MuiTabs-indicator": { bgcolor: accent },
                  }}
                >
                  <Tab icon={<TimelineIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="Equity Curve" />
                  <Tab icon={<BarChartIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="P&L Distribution" />
                  <Tab icon={<ShowChartIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="Drawdown" />
                  <Tab label="Monthly Heatmap" />
                  <Tab label="P&L Waterfall" />
                </Tabs>

                {/* Equity Curve */}
                {stratResultTab === 0 && (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={cumulativeEquity}>
                      <defs>
                        <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={accent} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} />
                      <YAxis tick={{ fontSize: 10, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} />
                      <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(v: number, name: string) => name === "cumAmount" ? formatFullRupiah(v) : `${v}%`} />
                      <ReferenceLine y={0} stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} strokeDasharray="5 5" />
                      <Area type="monotone" dataKey="cumPnl" stroke={accent} strokeWidth={2} fill="url(#cumGrad)" name="Cumulative P&L %" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {/* PnL Distribution */}
                {stratResultTab === 1 && (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={pnlHistogram}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                      <XAxis dataKey="range" tick={{ fontSize: 9, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} />
                      <YAxis tick={{ fontSize: 10, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} />
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                      <ReferenceLine x="0%" stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
                      <Bar dataKey="count" name="Trades" radius={[4, 4, 0, 0]}>
                        {pnlHistogram.map((entry, idx) => (
                          <Cell key={idx} fill={entry.rangeVal >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.75} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {/* Drawdown Chart */}
                {stratResultTab === 2 && (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={drawdownCurve}>
                      <defs>
                        <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.05} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.35} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} />
                      <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(v: number, name: string) => name === "equity" ? formatFullRupiah(v) : `${v}%`} />
                      <ReferenceLine y={0} stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"} />
                      <Area type="monotone" dataKey="dd" stroke="#ef4444" strokeWidth={2} fill="url(#ddGrad)" name="Drawdown %" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {/* Monthly Heatmap */}
                {stratResultTab === 3 && (
                  <Box>
                    {monthlyHeatmapData.length > 0 ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {monthlyHeatmapData.map((m) => {
                          const maxAbs = Math.max(...monthlyHeatmapData.map((x) => Math.abs(x.value)), 1);
                          const intensity = Math.min(Math.abs(m.value) / maxAbs, 1);
                          const bg = m.value >= 0
                            ? `rgba(34, 197, 94, ${0.08 + intensity * 0.55})`
                            : `rgba(239, 68, 68, ${0.08 + intensity * 0.55})`;
                          return (
                            <Tooltip key={m.month} title={`${m.month}: ${m.value >= 0 ? "+" : ""}${m.value.toFixed(2)}%`} arrow>
                              <Box sx={{
                                width: 80, py: 1.25, textAlign: "center", borderRadius: 1.5,
                                bgcolor: bg, cursor: "default",
                                transition: "transform 0.12s",
                                "&:hover": { transform: "scale(1.08)" },
                              }}>
                                <Typography sx={{ ...monoSx, fontSize: "0.6rem", color: "text.secondary", mb: 0.25 }}>{m.label}</Typography>
                                <Typography sx={{ ...monoSx, fontSize: "0.85rem", fontWeight: 800, color: m.value >= 0 ? "#22c55e" : "#ef4444" }}>
                                  {m.value >= 0 ? "+" : ""}{m.value.toFixed(1)}%
                                </Typography>
                              </Box>
                            </Tooltip>
                          );
                        })}
                      </Stack>
                    ) : (
                      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", textAlign: "center", py: 4 }}>No monthly data available</Typography>
                    )}
                  </Box>
                )}

                {/* P&L Waterfall */}
                {stratResultTab === 4 && (
                  <Box>
                    {waterfallData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={waterfallData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                          <XAxis dataKey="name" tick={{ fontSize: 7, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} interval={0} angle={-45} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 9, ...monoSx }} stroke={isDark ? "#555" : "#ccc"} tickFormatter={(v: number) => formatRupiah(v)} />
                          <RechartsTooltip
                            contentStyle={chartTooltipStyle}
                            formatter={(v: number) => formatFullRupiah(v)}
                            labelFormatter={(label: string) => label}
                          />
                          <Bar dataKey="pnl" name="P&L" radius={[3, 3, 0, 0]}>
                            {waterfallData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", textAlign: "center", py: 4 }}>No trade data</Typography>
                    )}
                  </Box>
                )}
              </Paper>

              {/* Trade Log */}
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                  bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#f5f4f1",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ px: 2, py: 1.25 }}>
                  <Typography sx={{ ...sectionTitleSx, mb: 0 }}>
                    Trade Log ({stratTrades.length} trades)
                  </Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {["#", "Symbol", "Entry", "Exit", "Shares", "P&L %", "P&L Rp", "Days", "Reason"].map((h) => (
                          <TableCell key={h} sx={{
                            ...monoSx, fontSize: "0.58rem", fontWeight: 700,
                            bgcolor: isDark ? "#0c1222" : "#f8f7f4", color: "text.secondary",
                            textTransform: "uppercase", letterSpacing: "0.05em", py: 0.75,
                          }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stratTrades.slice(0, 100).map((t, i) => (
                        <TableRow key={i} sx={{ "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" } }}>
                          <TableCell sx={{ ...monoSx, fontSize: "0.65rem", color: "text.secondary", py: 0.5 }}>{i + 1}</TableCell>
                          <TableCell sx={{ ...monoSx, fontSize: "0.7rem", fontWeight: 700, color: accent, py: 0.5 }}>{t.symbol}</TableCell>
                          <TableCell sx={{ ...monoSx, fontSize: "0.63rem", py: 0.5 }}>{t.entryPrice.toLocaleString()} ({t.entryDate.slice(5)})</TableCell>
                          <TableCell sx={{ ...monoSx, fontSize: "0.63rem", py: 0.5 }}>{t.exitPrice.toLocaleString()} ({t.exitDate.slice(5)})</TableCell>
                          <TableCell sx={{ ...monoSx, fontSize: "0.63rem", py: 0.5 }}>{t.shares.toLocaleString()}</TableCell>
                          <TableCell sx={{
                            ...monoSx, fontSize: "0.68rem", fontWeight: 700, py: 0.5,
                            color: t.pnlPct >= 0 ? "#22c55e" : "#ef4444",
                          }}>
                            {t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%
                          </TableCell>
                          <TableCell sx={{
                            ...monoSx, fontSize: "0.63rem", fontWeight: 600, py: 0.5,
                            color: t.pnlAmount >= 0 ? "#22c55e" : "#ef4444",
                          }}>
                            {t.pnlAmount >= 0 ? "+" : ""}{formatRupiah(t.pnlAmount)}
                          </TableCell>
                          <TableCell sx={{ ...monoSx, fontSize: "0.63rem", py: 0.5 }}>{t.holdingDays}d</TableCell>
                          <TableCell sx={{ fontSize: "0.62rem", py: 0.5 }}>
                            <Box sx={{
                              display: "inline-block", px: 0.75, py: 0.15, borderRadius: 0.75,
                              fontSize: "0.56rem", fontWeight: 700, ...monoSx,
                              bgcolor: t.exitReason === "tp" ? "rgba(34,197,94,0.1)" : t.exitReason === "sl" ? "rgba(239,68,68,0.1)" : "rgba(148,163,184,0.1)",
                              color: t.exitReason === "tp" ? "#22c55e" : t.exitReason === "sl" ? "#ef4444" : "#94a3b8",
                            }}>
                              {EXIT_REASON_LABEL[t.exitReason] || t.exitReason}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Stack>
          )}

          {!stratLoading && stratTrades.length === 0 && (stratStats.totalTrades === 0 || Object.keys(stratStats).length === 0) && (
            <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 2.5, border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 1 }}>
                No signal matches found for this strategy in the selected period
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", ...monoSx, opacity: 0.6 }}>
                Try a longer lookback, different strategy, or broader stock universe
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* SAVED EXPERIMENTS */}
      {tab === "saved" && (
        <Box className="animate-in animate-in-delay-2">
          {!user?.id ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 2.5, border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                Sign in to save and load experiments
              </Typography>
            </Paper>
          ) : savedLoading ? (
            <Stack spacing={1}>
              {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={60} sx={{ borderRadius: 2 }} />)}
            </Stack>
          ) : savedExperiments.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 2.5, border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                No saved experiments yet. Run a backtest and save it.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {savedExperiments.map((exp) => {
                const isExpanded = expandedExp === exp.id;
                const trades = ((exp.results as Record<string, unknown>).trades as TradeResult[]) || [];
                const stats = ((exp.results as Record<string, unknown>).stats as Record<string, number>) || null;
                const config = exp.config as Record<string, unknown>;
                return (
                  <Paper
                    key={exp.id}
                    elevation={0}
                    sx={{
                      borderRadius: 2, overflow: "hidden",
                      border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                      bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#f5f4f1",
                      transition: "transform 0.12s",
                    }}
                  >
                    <Box
                      onClick={() => setExpandedExp(isExpanded ? null : exp.id)}
                      sx={{
                        px: 2, py: 1.25, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                        "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography sx={{ ...monoSx, fontWeight: 700, fontSize: "0.78rem" }}>{exp.name}</Typography>
                        <Box sx={{
                          px: 0.75, py: 0.15, borderRadius: 0.75, fontSize: "0.56rem", fontWeight: 700,
                          ...monoSx, textTransform: "uppercase",
                          bgcolor: exp.type === "manual" ? `${accent}20` : "rgba(59,130,246,0.12)",
                          color: exp.type === "manual" ? accent : "#3b82f6",
                        }}>
                          {exp.type}
                        </Box>
                        <Typography sx={{ fontSize: "0.64rem", color: "text.secondary", ...monoSx }}>
                          {trades.length} trades
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography sx={{ fontSize: "0.62rem", color: "text.secondary", ...monoSx }}>
                          {new Date(exp.created_at).toLocaleDateString()}
                        </Typography>
                        {isExpanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                      </Stack>
                    </Box>

                    {isExpanded && (
                      <Box sx={{ px: 2, pb: 1.5, borderTop: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
                        <Stack direction="row" spacing={1.5} sx={{ mt: 1, mb: 1.5 }} flexWrap="wrap">
                          {Boolean(config.stocks) && (
                            <Typography sx={{ fontSize: "0.64rem", color: "text.secondary", ...monoSx }}>
                              Stocks: {(config.stocks as string[]).join(", ") || "All"}
                            </Typography>
                          )}
                          {Boolean(config.strategy) && (
                            <Typography sx={{ fontSize: "0.64rem", color: "text.secondary", ...monoSx }}>
                              Strategy: {STRATEGIES.find((s) => s.key === String(config.strategy))?.label || String(config.strategy)}
                            </Typography>
                          )}
                          {Boolean(config.entryDate) && (
                            <Typography sx={{ fontSize: "0.64rem", color: "text.secondary", ...monoSx }}>
                              Entry: {String(config.entryDate)}
                            </Typography>
                          )}
                          {Boolean(config.capital) && (
                            <Typography sx={{ fontSize: "0.64rem", color: "text.secondary", ...monoSx }}>
                              Capital: {formatRupiah(config.capital as number)}
                            </Typography>
                          )}
                        </Stack>

                        {stats && (
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                            <StatCard label="Win Rate" value={`${stats.winRate || 0}%`} color={(stats.winRate || 0) >= 50 ? "#22c55e" : "#ef4444"} />
                            <StatCard label="Avg Return" value={`${(stats.avgReturn || 0).toFixed(2)}%`} color={(stats.avgReturn || 0) >= 0 ? "#22c55e" : "#ef4444"} />
                            <StatCard label="Profit Factor" value={String(stats.profitFactor || 0)} />
                            {Boolean(stats.sharpe) && <StatCard label="Sharpe" value={String(stats.sharpe)} />}
                          </Stack>
                        )}

                        {!stats && trades.length > 0 && (
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                            {trades.map((t, i) => (
                              <Box key={i} sx={{ fontSize: "0.66rem", ...monoSx }}>
                                <Box component="span" sx={{ fontWeight: 700, color: STOCK_COLORS[i % STOCK_COLORS.length] }}>{t.symbol}</Box>
                                {" "}
                                <Box component="span" sx={{ fontWeight: 700, color: t.pnlPct >= 0 ? "#22c55e" : "#ef4444" }}>
                                  {t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%
                                </Box>
                                {t.pnlAmount !== undefined && (
                                  <Box component="span" sx={{ fontSize: "0.58rem", color: "text.secondary", ml: 0.5 }}>
                                    ({formatRupiah(t.pnlAmount)})
                                  </Box>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        )}

                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small" variant="outlined"
                            startIcon={<ReplayIcon sx={{ fontSize: 14 }} />}
                            onClick={() => loadExperiment(exp)}
                            sx={{ ...monoSx, fontSize: "0.64rem", textTransform: "none", borderColor: `${accent}50`, color: accent }}
                          >
                            Load
                          </Button>
                          <Button
                            size="small" variant="outlined" color="error"
                            startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
                            onClick={() => deleteExperiment(exp.id)}
                            sx={{ ...monoSx, fontSize: "0.64rem", textTransform: "none" }}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      )}

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1rem" }}>Save Experiment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth size="small"
            label="Experiment Name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            sx={{ mt: 1 }}
            slotProps={{ input: { sx: { ...monoSx, fontSize: "0.8rem" } } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} sx={{ ...monoSx, fontSize: "0.72rem", textTransform: "none" }}>Cancel</Button>
          <Button
            onClick={() => saveExperiment(saveSource)}
            disabled={!saveName.trim()}
            variant="contained"
            sx={{ ...monoSx, fontSize: "0.72rem", textTransform: "none", bgcolor: accent, color: "#0c1222", "&:hover": { bgcolor: isDark ? "#f0d78c" : "#8a6320" } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
