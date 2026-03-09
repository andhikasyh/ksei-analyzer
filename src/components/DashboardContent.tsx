"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import {
  KSEIRecord,
  IDXStockSummary,
  IDXIndexSummary,
  IDXDividend,
  IDXCorporateAction,
  IDXStockSplit,
  IDXCalendarEvent,
  formatShares,
  formatValue,
  formatRatio,
} from "@/lib/types";
import { INDEX_LABELS } from "@/lib/index-constituents";
import { useWatchlist } from "@/lib/watchlist";
import { GlobalSearch } from "@/components/SearchInput";
import { InvestorTypeBadge, LocalForeignBadge } from "@/components/Badge";
import { EventCalendar } from "@/components/EventCalendar";
import { StockTreemap, StockTreemapSkeleton } from "@/components/StockTreemap";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import Link from "next/link";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface TopInvestor {
  name: string;
  type: string;
  stocks: string[];
  totalShares: number;
  maxPct: number;
}

interface Conglomerate {
  name: string;
  stockCount: number;
  stocks: string[];
  totalShares: number;
  maxPct: number;
  type: string;
  origin: string;
}

interface DashboardData {
  topForeignInvestors: TopInvestor[];
  topLocalInvestors: TopInvestor[];
  conglomerates: Conglomerate[];
}

function aggregateInvestors(records: KSEIRecord[]): TopInvestor[] {
  const grouped: Record<
    string,
    { stocks: Set<string>; records: KSEIRecord[] }
  > = {};
  records.forEach((r) => {
    if (!grouped[r.INVESTOR_NAME]) {
      grouped[r.INVESTOR_NAME] = { stocks: new Set(), records: [] };
    }
    grouped[r.INVESTOR_NAME].stocks.add(r.SHARE_CODE);
    grouped[r.INVESTOR_NAME].records.push(r);
  });

  return Object.entries(grouped)
    .map(([name, d]) => ({
      name,
      type: d.records[0].INVESTOR_TYPE,
      stocks: [...d.stocks],
      totalShares: d.records.reduce(
        (s, r) => s + parseInt(r.TOTAL_HOLDING_SHARES || "0", 10),
        0
      ),
      maxPct: Math.max(...d.records.map((r) => r.PERCENTAGE)),
    }))
    .sort((a, b) => b.totalShares - a.totalShares)
    .slice(0, 10);
}

interface MarketMover {
  code: string;
  name: string;
  close: number;
  change: number;
  changePct: number;
  volume: number;
  value: number;
  foreignNet: number;
}

export function DashboardContent() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [data, setData] = useState<DashboardData | null>(null);
  const [movers, setMovers] = useState<{
    gainers: MarketMover[];
    losers: MarketMover[];
    active: MarketMover[];
  } | null>(null);
  const [indexes, setIndexes] = useState<
    { code: string; close: number; change: number; changePct: number; history: number[] }[]
  >([]);
  const [upcomingEvents, setUpcomingEvents] = useState<{ code: string; name: string; type: string; detail: string; date: string }[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<IDXCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treemapStocks, setTreemapStocks] = useState<{ code: string; stock_name: string; sector: string; market_cap: number; change_pct: number }[]>([]);
  const [foreignFlowDays, setForeignFlowDays] = useState<{ date: string; net: number }[]>([]);
  const [foreignFlowRange, setForeignFlowRange] = useState<"1M" | "3M" | "6M">("1M");
  const [foreignFlowLoading, setForeignFlowLoading] = useState(false);
  const [allTradingDates, setAllTradingDates] = useState<string[]>([]);
  const [latestNews, setLatestNews] = useState<{ id: number; stock_code: string; headline: string; source: string; url: string; published_at: string | null }[]>([]);
  const [moverTab, setMoverTab] = useState<"gain" | "loss" | "active">("gain");
  const [playerTab, setPlayerTab] = useState<"foreign" | "local" | "conglom">("foreign");
  const router = useRouter();
  const { isWatched, toggle: toggleWatchlist } = useWatchlist();

  useEffect(() => {
    async function fetchData() {
      try {
        const [kseiRes, stockRes, indexRes] = await Promise.all([
          supabase
            .from(TABLE_NAME)
            .select("*")
            .order("PERCENTAGE", { ascending: false }),
          supabase
            .from("idx_stock_summary")
            .select("*")
            .order("date", { ascending: false })
            .limit(2000),
          supabase
            .from("idx_index_summary")
            .select("*")
            .in("index_code", ["COMPOSITE", "LQ45", "IDX30", "IDXHIDIV20", "IDXBUMN20", "IDX80", "IDXV30", "IDXQ30", "JII70", "SRIKEHATI", "BISNIS27", "IDXESGL", "IDXG30", "PEFINDO25"])
            .order("date", { ascending: false })
            .limit(800),
        ]);

        if (stockRes.data) {
          const latestMap = new Map<string, IDXStockSummary>();
          (stockRes.data as IDXStockSummary[]).forEach((r) => {
            const existing = latestMap.get(r.stock_code);
            if (!existing || r.date > existing.date)
              latestMap.set(r.stock_code, r);
          });
          const all: MarketMover[] = Array.from(latestMap.values()).map((r) => {
            const close = parseFloat(r.close) || 0;
            const prev = parseFloat(r.previous) || 0;
            const change = parseFloat(r.change) || 0;
            return {
              code: r.stock_code,
              name: r.stock_name,
              close,
              change,
              changePct: prev > 0 ? (change / prev) * 100 : 0,
              volume: parseFloat(r.volume) || 0,
              value: parseFloat(r.value) || 0,
              foreignNet:
                (parseFloat(r.foreign_buy) || 0) -
                (parseFloat(r.foreign_sell) || 0),
            };
          });
          const gainers = [...all]
            .filter((m) => m.changePct > 0)
            .sort((a, b) => b.changePct - a.changePct)
            .slice(0, 8);
          const losers = [...all]
            .filter((m) => m.changePct < 0)
            .sort((a, b) => a.changePct - b.changePct)
            .slice(0, 8);
          const active = [...all]
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
          setMovers({ gainers, losers, active });

          // Build treemap data from stock summaries (top 100 by value)
          const treemapData = all
            .filter((m) => m.close > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 100)
            .map((m) => {
              const stk = latestMap.get(m.code);
              const listed = stk ? parseFloat(stk.listed_shares) || 0 : 0;
              return {
                code: m.code,
                stock_name: m.name,
                sector: "Market",
                market_cap: m.close * listed,
                change_pct: m.changePct,
              };
            })
            .filter((s) => s.market_cap > 0);
          setTreemapStocks(treemapData);

          // Seed the 1M foreign flow from already-fetched data (no extra request)
          const byDate: Record<string, { buy: number; sell: number }> = {};
          (stockRes.data as IDXStockSummary[]).forEach((r) => {
            const buy = parseFloat(r.foreign_buy) || 0;
            const sell = parseFloat(r.foreign_sell) || 0;
            if (buy === 0 && sell === 0) return;
            if (!byDate[r.date]) byDate[r.date] = { buy: 0, sell: 0 };
            byDate[r.date].buy += buy;
            byDate[r.date].sell += sell;
          });
          const seedDays = Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-22)
            .map(([date, { buy, sell }]) => ({ date, net: buy - sell }));
          setForeignFlowDays(seedDays);

          // Also record distinct trading dates from this data for use by range selector
          const distinctDates = [...new Set((stockRes.data as IDXStockSummary[]).map((r) => r.date))]
            .sort((a, b) => b.localeCompare(a));
          setAllTradingDates(distinctDates);
        }

        if (indexRes.data) {
          const raw = indexRes.data as IDXIndexSummary[];
          const byCode = new Map<string, IDXIndexSummary[]>();
          raw.forEach((r) => {
            const arr = byCode.get(r.index_code) || [];
            arr.push(r);
            byCode.set(r.index_code, arr);
          });
          const priority = ["COMPOSITE", "LQ45", "IDX30", "IDXHIDIV20", "IDXBUMN20", "IDX80", "IDXV30", "IDXQ30", "JII70", "SRIKEHATI", "BISNIS27", "IDXESGL", "IDXG30", "PEFINDO25"];
          const parsed = priority
            .filter((c) => byCode.has(c))
            .map((code) => {
              const rows = byCode.get(code)!.sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              );
              const latest = rows[0];
              const close = parseFloat(latest.close) || 0;
              const prev = parseFloat(latest.previous) || 0;
              const change = parseFloat(latest.change) || 0;
              const changePct = prev > 0 ? (change / prev) * 100 : 0;
              const history = rows
                .slice(0, 20)
                .map((r) => parseFloat(r.close) || 0)
                .reverse();
              return { code, close, change, changePct, history };
            });
          setIndexes(parsed);
        }

        const [calendarRes] = await Promise.all([
          supabase
            .from("idx_calendar_events")
            .select("*")
            .gte("event_date", new Date().toISOString().split("T")[0])
            .order("event_date", { ascending: true })
            .limit(100),
        ]);

        if (calendarRes.data) {
          setCalendarEvents(calendarRes.data as IDXCalendarEvent[]);
        }

        const { data: records, error: fetchError } = kseiRes;

        if (fetchError) throw fetchError;
        if (!records || records.length === 0) {
          setError(
            "No data found. Check your table name in src/lib/supabase.ts"
          );
          setLoading(false);
          return;
        }

        const typed = records as KSEIRecord[];

        const foreignRecords = typed.filter((r) => r.LOCAL_FOREIGN === "A");
        const localRecords = typed.filter((r) => r.LOCAL_FOREIGN === "L");
        const topForeignInvestors = aggregateInvestors(foreignRecords);
        const topLocalInvestors = aggregateInvestors(localRecords);

        const investorHoldings: Record<
          string,
          { stocks: Set<string>; records: KSEIRecord[] }
        > = {};
        typed.forEach((r) => {
          if (!investorHoldings[r.INVESTOR_NAME]) {
            investorHoldings[r.INVESTOR_NAME] = {
              stocks: new Set(),
              records: [],
            };
          }
          investorHoldings[r.INVESTOR_NAME].stocks.add(r.SHARE_CODE);
          investorHoldings[r.INVESTOR_NAME].records.push(r);
        });
        const conglomerates = Object.entries(investorHoldings)
          .filter(([, d]) => d.stocks.size >= 2)
          .map(([name, d]) => ({
            name,
            stockCount: d.stocks.size,
            stocks: [...d.stocks],
            totalShares: d.records.reduce(
              (s, r) => s + parseInt(r.TOTAL_HOLDING_SHARES || "0", 10),
              0
            ),
            maxPct: Math.max(...d.records.map((r) => r.PERCENTAGE)),
            type: d.records[0].INVESTOR_TYPE,
            origin: d.records[0].LOCAL_FOREIGN,
          }))
          .sort((a, b) => b.totalShares - a.totalShares)
          .slice(0, 15);

        setData({
          topForeignInvestors,
          topLocalInvestors,
          conglomerates,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch data"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Fetch latest market news independently
  useEffect(() => {
    async function fetchLatestNews() {
      const { data } = await supabase
        .from("stock_news")
        .select("id,stock_code,headline,source,url,published_at")
        .order("published_at", { ascending: false })
        .limit(20);
      if (data) setLatestNews(data);
    }
    fetchLatestNews();
  }, []);
  useEffect(() => {
    if (foreignFlowRange === "1M" && foreignFlowDays.length > 0) return; // already seeded from main fetch

    async function fetchFlowRange() {
      setForeignFlowLoading(true);

      // Get distinct trading dates via BBCA proxy
      let tradingDates = allTradingDates;
      if (tradingDates.length < 66) {
        const { data } = await supabase
          .from("idx_stock_summary")
          .select("date")
          .eq("stock_code", "BBCA")
          .order("date", { ascending: false })
          .limit(180);
        if (data) {
          tradingDates = data.map((r) => r.date);
          setAllTradingDates(tradingDates);
        }
      }

      const rangeDays = foreignFlowRange === "1M" ? 22 : foreignFlowRange === "3M" ? 66 : 132;
      const datesInRange = tradingDates.slice(0, rangeDays);
      if (datesInRange.length === 0) { setForeignFlowLoading(false); return; }

      const oldestDate = datesInRange[datesInRange.length - 1];
      const newestDate = datesInRange[0];

      const { data } = await supabase
        .from("idx_stock_summary")
        .select("date,foreign_buy,foreign_sell")
        .gte("date", oldestDate)
        .lte("date", newestDate)
        .order("date", { ascending: true });

      if (!data) { setForeignFlowLoading(false); return; }

      const byDate: Record<string, { buy: number; sell: number }> = {};
      data.forEach((r) => {
        const buy = parseFloat(r.foreign_buy) || 0;
        const sell = parseFloat(r.foreign_sell) || 0;
        if (buy === 0 && sell === 0) return;
        if (!byDate[r.date]) byDate[r.date] = { buy: 0, sell: 0 };
        byDate[r.date].buy += buy;
        byDate[r.date].sell += sell;
      });

      const flows = datesInRange
        .slice()
        .reverse()
        .filter((d) => byDate[d])
        .map((date) => ({ date, net: byDate[date].buy - byDate[date].sell }));

      setForeignFlowDays(flows);
      setForeignFlowLoading(false);
    }

    fetchFlowRange();
  }, [foreignFlowRange]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "40vh",
        }}
      >
        <Paper
          sx={{ p: { xs: 2, sm: 4 }, textAlign: "center", maxWidth: 420, mx: 1, borderRadius: 3 }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 700,
            }}
            gutterBottom
          >
            Connection Error
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (loading) {
    return (
      <Stack spacing={1.5}>
        <Box className="animate-in animate-in-delay-1">
          <GlobalSearch />
        </Box>
        <Skeleton variant="rounded" height={40} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={52} sx={{ borderRadius: 2 }} />
        <StockTreemapSkeleton />
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Skeleton variant="rounded" height={340} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Skeleton variant="rounded" height={340} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  if (!data) return null;

  const activeMoverList = moverTab === "gain"
    ? movers?.gainers
    : moverTab === "loss"
      ? movers?.losers
      : movers?.active;

  const activePlayerList = playerTab === "foreign"
    ? data.topForeignInvestors
    : playerTab === "local"
      ? data.topLocalInvestors
      : null;

  return (
    <Stack spacing={1.5}>
      <Box className="animate-in animate-in-delay-1">
        <GlobalSearch />
      </Box>

      {indexes.length > 0 && (
        <Box
          className="animate-in animate-in-delay-2"
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            pb: 0.5,
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {indexes.map((idx) => (
            <IndexCard
              key={idx.code}
              idx={idx}
              onClick={() => router.push(`/screener?index=${idx.code}`)}
            />
          ))}
        </Box>
      )}

      {/* ── Market Heatmap ── */}
      {treemapStocks.length > 0 && (
        <Box className="animate-in animate-in-delay-3">
          <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ px: 1.5, pt: 1.25, pb: 0.75, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "0.85rem", letterSpacing: "-0.02em" }}>
                  Market Heatmap
                </Typography>
                <Chip label={`${treemapStocks.length} stocks`} size="small" sx={{ height: 18, fontSize: "0.55rem", fontWeight: 700, bgcolor: isDark ? "rgba(212,168,67,0.08)" : "rgba(161,124,47,0.05)", color: "primary.main" }} />
              </Stack>
              <Typography sx={{ fontSize: "0.6rem", color: "text.secondary", fontStyle: "italic" }}>
                Size = Market Cap &middot; Color = Daily Change
              </Typography>
            </Box>
            <StockTreemap data={treemapStocks} onStockClick={(code) => router.push(`/stock/${code}`)} />
          </Paper>
        </Box>
      )}

      {/* ── Foreign Flow ── */}
      {(foreignFlowDays.length > 0 || foreignFlowLoading) && (
        <Box className="animate-in animate-in-delay-3">
          <Paper sx={{ borderRadius: 2, px: 2, pt: 1.5, pb: 2 }}>
            {/* Header row */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "0.85rem", letterSpacing: "-0.02em" }}>
                  Foreign Flow
                </Typography>
                {/* Range pills */}
                <Box
                  sx={{
                    display: "flex",
                    bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                    borderRadius: "7px",
                    p: 0.3,
                    gap: 0.25,
                  }}
                >
                  {(["1M", "3M", "6M"] as const).map((r) => (
                    <Box
                      key={r}
                      onClick={() => setForeignFlowRange(r)}
                      sx={{
                        px: 1.25,
                        py: 0.35,
                        borderRadius: "5px",
                        cursor: "pointer",
                        bgcolor: foreignFlowRange === r
                          ? isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.12)"
                          : "transparent",
                        border: `1px solid ${foreignFlowRange === r
                          ? isDark ? "rgba(212,168,67,0.28)" : "rgba(161,124,47,0.22)"
                          : "transparent"}`,
                        transition: "all 0.12s ease",
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: "0.65rem",
                          fontWeight: foreignFlowRange === r ? 700 : 500,
                          color: foreignFlowRange === r
                            ? isDark ? "#d4a843" : "#a17c2f"
                            : "text.secondary",
                        }}
                      >
                        {r}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Stack>
              <Box
                component={Link}
                href="/foreign-flow"
                sx={{
                  fontSize: "0.68rem",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  fontWeight: 600,
                  color: isDark ? "rgba(212,168,67,0.7)" : "rgba(161,124,47,0.8)",
                  textDecoration: "none",
                  "&:hover": { color: "primary.main" },
                }}
              >
                Full Dashboard →
              </Box>
            </Stack>

            {/* Cumulative summary strip */}
            {!foreignFlowLoading && foreignFlowDays.length > 0 && (() => {
              const cumNet = foreignFlowDays.reduce((s, d) => s + d.net, 0);
              const inflows = foreignFlowDays.filter((d) => d.net > 0).length;
              const outflows = foreignFlowDays.filter((d) => d.net < 0).length;
              const isPos = cumNet >= 0;
              return (
                <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.62rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                      Cumulative Net
                    </Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.92rem", color: isPos ? "#22c55e" : "#ef4444", letterSpacing: "-0.02em" }}>
                      {isPos ? "+" : ""}{formatValue(cumNet)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.62rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                      Inflow Days
                    </Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.88rem", color: "#22c55e" }}>
                      {inflows}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.62rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                      Outflow Days
                    </Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.88rem", color: "#ef4444" }}>
                      {outflows}
                    </Typography>
                  </Box>
                </Stack>
              );
            })()}

            {foreignFlowLoading ? (
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: "8px" }} />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={foreignFlowDays} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="18%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.07)"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => {
                      const dt = new Date(d);
                      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                    tick={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 10,
                      fill: isDark ? "rgba(107,127,163,0.65)" : "rgba(12,18,34,0.42)",
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => formatValue(v)}
                    tick={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 10,
                      fill: isDark ? "rgba(107,127,163,0.55)" : "rgba(12,18,34,0.38)",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <ReferenceLine
                    y={0}
                    stroke={isDark ? "rgba(107,127,163,0.3)" : "rgba(12,18,34,0.15)"}
                    strokeWidth={1}
                  />
                  <RechartsTooltip
                    cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
                    contentStyle={{
                      background: isDark ? "#0d1425" : "#ffffff",
                      border: `1px solid ${isDark ? "rgba(107,127,163,0.22)" : "rgba(12,18,34,0.12)"}`,
                      borderRadius: "10px",
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 11,
                      padding: "8px 12px",
                      boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.1)",
                    }}
                    labelStyle={{
                      color: isDark ? "rgba(107,127,163,0.8)" : "rgba(12,18,34,0.55)",
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      fontSize: 10,
                      marginBottom: 4,
                    }}
                    itemStyle={{
                      color: isDark ? "#e2e8f0" : "#0c1222",
                      padding: 0,
                    }}
                    formatter={(value: number) => [
                      (value >= 0 ? "+" : "") + formatValue(value),
                      "Net Flow",
                    ]}
                  />
                  <Bar dataKey="net" radius={[3, 3, 0, 0]} maxBarSize={18}>
                    {foreignFlowDays.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.net >= 0 ? "#22c55e" : "#ef4444"}
                        fillOpacity={0.82}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Box>
      )}

      <Box
        sx={{
          display: { xs: "block", lg: "flex" },
          gap: 1.5,
          alignItems: "stretch",
        }}
      >
        <Box sx={{ flex: "7 1 0%", minWidth: 0, mb: { xs: 1.5, lg: 0 }, display: "flex" }}>
            {movers ? (
              <Paper
                className="animate-in animate-in-delay-3"
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  position: "relative",
                  flex: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: "space-between",
                    gap: 0.75,
                    px: 1.5,
                    pt: 1.25,
                    pb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Outfit", sans-serif',
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Market Movers
                  </Typography>
                  <Stack direction="row" spacing={0} flexWrap="wrap" useFlexGap>
                    {([
                      { key: "gain" as const, label: "Gainers", color: theme.palette.success.main },
                      { key: "loss" as const, label: "Losers", color: theme.palette.error.main },
                      { key: "active" as const, label: "Active", color: theme.palette.warning.main },
                    ]).map((tab) => (
                      <Box
                        key={tab.key}
                        onClick={() => setMoverTab(tab.key)}
                        sx={{
                          px: 1.25,
                          py: 0.5,
                          cursor: "pointer",
                          borderRadius: 1,
                          fontSize: "0.68rem",
                          fontWeight: moverTab === tab.key ? 700 : 500,
                          fontFamily: '"Outfit", sans-serif',
                          color: moverTab === tab.key ? tab.color : "text.secondary",
                          bgcolor: moverTab === tab.key
                            ? isDark ? `${tab.color}14` : `${tab.color}0a`
                            : "transparent",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            bgcolor: isDark ? `${tab.color}0c` : `${tab.color}06`,
                          },
                        }}
                      >
                        {tab.label}
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <TableContainer sx={{ overflowX: "auto", maxHeight: 360, overflowY: "auto" }}>
                  <Table size="small" sx={{ minWidth: 320 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, minWidth: 120 }}>Stock</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>Price</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>
                          {moverTab === "active" ? "Value" : "Chg%"}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>Vol</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, display: { xs: "none", md: "table-cell" } }}>
                          Foreign Net
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeMoverList?.map((m) => {
                        const changeColor =
                          m.change > 0
                            ? theme.palette.success.main
                            : m.change < 0
                              ? theme.palette.error.main
                              : "text.secondary";
                        const foreignColor =
                          m.foreignNet > 0
                            ? theme.palette.success.main
                            : m.foreignNet < 0
                              ? theme.palette.error.main
                              : "text.secondary";
                        return (
                          <TableRow
                            key={m.code}
                            hover
                            sx={{
                              cursor: "pointer",
                              "&:last-child td": { borderBottom: 0 },
                              "&:hover": {
                                bgcolor: isDark
                                  ? "rgba(212,168,67,0.03)"
                                  : "rgba(161,124,47,0.02)",
                              },
                            }}
                            onClick={() => router.push(`/stock/${m.code}`)}
                          >
                            <TableCell sx={{ py: 0.4 }}>
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    fontFamily: '"JetBrains Mono", monospace',
                                    color: "primary.main",
                                    fontSize: "0.73rem",
                                  }}
                                >
                                  {m.code}
                                </Typography>
                                <Typography
                                  sx={{
                                    color: "text.secondary",
                                    fontSize: "0.55rem",
                                    opacity: 0.6,
                                    maxWidth: 80,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {m.name}
                                </Typography>
                                <Tooltip title={isWatched(m.code) ? "Remove from watchlist" : "Add to watchlist"} arrow>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); toggleWatchlist(m.code); }}
                                    sx={{
                                      p: 0.2,
                                      color: isWatched(m.code) ? (isDark ? "#d4a843" : "#a17c2f") : "text.secondary",
                                      opacity: isWatched(m.code) ? 1 : 0.4,
                                      "&:hover": { opacity: 1, color: isDark ? "#d4a843" : "#a17c2f" },
                                    }}
                                  >
                                    {isWatched(m.code)
                                      ? <StarIcon sx={{ fontSize: 13 }} />
                                      : <StarBorderIcon sx={{ fontSize: 13 }} />
                                    }
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 0.4 }}>
                              <Typography
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontWeight: 600,
                                  fontSize: "0.73rem",
                                }}
                              >
                                {m.close.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 0.4 }}>
                              {moverTab === "active" ? (
                                <Typography
                                  sx={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontWeight: 600,
                                    fontSize: "0.73rem",
                                  }}
                                >
                                  {formatValue(m.value)}
                                </Typography>
                              ) : (
                                <Typography
                                  sx={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontWeight: 700,
                                    fontSize: "0.73rem",
                                    color: changeColor,
                                  }}
                                >
                                  {m.changePct > 0 ? "+" : ""}
                                  {m.changePct.toFixed(2)}%
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 0.4 }}>
                              <Typography
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: "0.68rem",
                                  color: "text.secondary",
                                }}
                              >
                                {formatValue(m.volume)}
                              </Typography>
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ py: 0.4, display: { xs: "none", md: "table-cell" } }}
                            >
                              <Typography
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: "0.68rem",
                                  fontWeight: 600,
                                  color: foreignColor,
                                }}
                              >
                                {m.foreignNet > 0 ? "+" : ""}
                                {formatValue(m.foreignNet)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ) : (
              <Paper className="animate-in animate-in-delay-3" sx={{ borderRadius: 2, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", py: 6 }}>
                <Stack alignItems="center" spacing={0.5}>
                  <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>Market data loading...</Typography>
                  <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", opacity: 0.6 }}>Market movers will appear when data is available</Typography>
                </Stack>
              </Paper>
            )}
        </Box>

        <Box sx={{ flex: "5 1 0%", minWidth: 0 }}>
          <Paper
            className="animate-in animate-in-delay-3"
            sx={{ borderRadius: 2, overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            {/* Header */}
            <Box
              sx={{
                px: 1.5,
                pt: 1.25,
                pb: 0.75,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.05)"}`,
                flexShrink: 0,
              }}
            >
              <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "0.85rem", letterSpacing: "-0.02em" }}>
                Latest News
              </Typography>
              {latestNews.length > 0 && (
                <Chip
                  label={`${latestNews.length} articles`}
                  size="small"
                  sx={{ height: 18, fontSize: "0.55rem", fontWeight: 700, bgcolor: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.05)", color: isDark ? "#60a5fa" : "#3b82f6" }}
                />
              )}
            </Box>

            {/* News list — fixed height to match ~Market Movers height, scrollable inside */}
            <Box sx={{ height: 360, overflowY: "auto", px: 0.5, py: 0.5 }}>
              {latestNews.length === 0 ? (
                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }} spacing={0.5}>
                  <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>No recent news</Typography>
                  <Typography sx={{ fontSize: "0.62rem", color: "text.secondary", opacity: 0.6 }}>News is updated daily after market close</Typography>
                </Stack>
              ) : (
                latestNews.map((item, i) => {
                  const dateLabel = item.published_at
                    ? new Date(item.published_at + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                    : null;
                  return (
                    <Box
                      key={item.id}
                      component={item.url ? "a" : "div"}
                      {...(item.url ? { href: item.url, target: "_blank", rel: "noopener noreferrer" } : {})}
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1,
                        px: 1,
                        py: 0.9,
                        borderRadius: 1.5,
                        textDecoration: "none",
                        color: "inherit",
                        borderBottom: i < latestNews.length - 1
                          ? `1px solid ${isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.04)"}`
                          : "none",
                        transition: "background 0.12s ease",
                        "&:hover": {
                          bgcolor: isDark ? "rgba(212,168,67,0.04)" : "rgba(161,124,47,0.03)",
                          "& .news-code": { color: "primary.main" },
                          "& .news-headline": { color: isDark ? "#e2e8f0" : "#0c1222" },
                        },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} alignItems="baseline" sx={{ mb: 0.2 }}>
                          <Typography
                            className="news-code"
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontWeight: 700,
                              fontSize: "0.68rem",
                              color: isDark ? "#93c5fd" : "#3b82f6",
                              flexShrink: 0,
                            }}
                          >
                            {item.stock_code}
                          </Typography>
                          {item.source && (
                            <Typography
                              sx={{
                                fontSize: "0.55rem",
                                color: "text.secondary",
                                opacity: 0.6,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.source}
                            </Typography>
                          )}
                          {dateLabel && (
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.55rem",
                                color: "text.secondary",
                                opacity: 0.55,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                ml: "auto !important",
                              }}
                            >
                              {dateLabel}
                            </Typography>
                          )}
                        </Stack>
                        <Typography
                          className="news-headline"
                          sx={{
                            fontSize: "0.72rem",
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            fontWeight: 500,
                            lineHeight: 1.45,
                            color: isDark ? "rgba(255,255,255,0.75)" : "rgba(12,18,34,0.78)",
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            transition: "color 0.12s ease",
                          }}
                        >
                          {item.headline}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Paper>
        </Box>
      </Box>

      {calendarEvents.length > 0 && (
        <Box className="animate-in animate-in-delay-4">
          <EventCalendar events={calendarEvents} />
        </Box>
      )}

      <Paper
        className="animate-in animate-in-delay-5"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: 0.75,
            px: 1.5,
            pt: 1.25,
            pb: 0.5,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 700,
              fontSize: "0.85rem",
              letterSpacing: "-0.02em",
            }}
          >
            Power Players
          </Typography>
          <Stack direction="row" spacing={0} flexWrap="wrap" useFlexGap>
            {([
              { key: "foreign" as const, label: "Foreign" },
              { key: "local" as const, label: "Local" },
              { key: "conglom" as const, label: "Multi-Stock" },
            ]).map((tab) => (
              <Box
                key={tab.key}
                onClick={() => setPlayerTab(tab.key)}
                sx={{
                  px: 1.25,
                  py: 0.5,
                  cursor: "pointer",
                  borderRadius: 1,
                  fontSize: "0.68rem",
                  fontWeight: playerTab === tab.key ? 700 : 500,
                  fontFamily: '"Outfit", sans-serif',
                  color: playerTab === tab.key ? "primary.main" : "text.secondary",
                  bgcolor: playerTab === tab.key
                    ? isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.06)"
                    : "transparent",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: isDark ? "rgba(212,168,67,0.06)" : "rgba(161,124,47,0.04)",
                  },
                }}
              >
                {tab.label}
              </Box>
            ))}
          </Stack>
        </Box>

        {playerTab !== "conglom" && activePlayerList && (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 480 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 0.5, width: 28 }}>#</TableCell>
                  <TableCell sx={{ py: 0.5, minWidth: 100 }}>Investor</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Type</TableCell>
                  <TableCell sx={{ py: 0.5, minWidth: 90 }}>Stocks</TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>Holdings</TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>Max %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activePlayerList.map((inv, i) => (
                  <TableRow
                    key={inv.name}
                    hover
                    sx={{
                      cursor: "pointer",
                      "&:last-child td": { borderBottom: 0 },
                      "&:hover": {
                        bgcolor: isDark ? "rgba(212,168,67,0.03)" : "rgba(161,124,47,0.02)",
                      },
                    }}
                    onClick={() => router.push(`/investor/${encodeURIComponent(inv.name)}`)}
                  >
                    <TableCell sx={{ py: 0.4 }}>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: "0.65rem",
                          color: "text.secondary",
                        }}
                      >
                        {i + 1}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.4 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                        {inv.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.4 }}>
                      <InvestorTypeBadge type={inv.type} />
                    </TableCell>
                    <TableCell sx={{ py: 0.4 }}>
                      <Stack direction="row" spacing={0.4} sx={{ flexWrap: "wrap", maxWidth: 180 }}>
                        {inv.stocks.slice(0, 3).map((s) => (
                          <Chip
                            key={s}
                            label={s}
                            size="small"
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: "0.6rem",
                              height: 18,
                              bgcolor: isDark ? "rgba(212,168,67,0.07)" : "rgba(161,124,47,0.05)",
                              color: "primary.main",
                              fontWeight: 600,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/stock/${s}`);
                            }}
                          />
                        ))}
                        {inv.stocks.length > 3 && (
                          <Typography
                            sx={{
                              color: "text.secondary",
                              alignSelf: "center",
                              fontSize: "0.55rem",
                            }}
                          >
                            +{inv.stocks.length - 3}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.4 }}>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          fontSize: "0.73rem",
                        }}
                      >
                        {formatShares(inv.totalShares)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.4 }}>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: "0.73rem",
                        }}
                      >
                        {inv.maxPct.toFixed(2)}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {playerTab === "conglom" && (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 0.5, width: 28 }}>#</TableCell>
                  <TableCell sx={{ py: 0.5, minWidth: 100 }}>Investor</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Origin</TableCell>
                  <TableCell align="center" sx={{ py: 0.5 }}>N</TableCell>
                  <TableCell sx={{ py: 0.5, minWidth: 100 }}>Tickers</TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>Holdings</TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>Max %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.conglomerates.map((g, i) => (
                  <TableRow
                    key={g.name}
                    hover
                    sx={{
                      cursor: "pointer",
                      "&:last-child td": { borderBottom: 0 },
                      "&:hover": {
                        bgcolor: isDark ? "rgba(212,168,67,0.03)" : "rgba(161,124,47,0.02)",
                      },
                    }}
                    onClick={() => router.push(`/investor/${encodeURIComponent(g.name)}`)}
                  >
                    <TableCell sx={{ py: 0.4 }}>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: "0.65rem",
                          color: "text.secondary",
                        }}
                      >
                        {i + 1}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.4 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                        {g.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.4 }}>
                      <LocalForeignBadge type={g.origin} />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.4 }}>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          color: "primary.main",
                        }}
                      >
                        {g.stockCount}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.4 }}>
                      <Stack direction="row" spacing={0.4} sx={{ flexWrap: "wrap", maxWidth: 200 }}>
                        {g.stocks.slice(0, 4).map((s) => (
                          <Chip
                            key={s}
                            label={s}
                            size="small"
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: "0.6rem",
                              height: 18,
                              bgcolor: isDark ? "rgba(212,168,67,0.07)" : "rgba(161,124,47,0.05)",
                              color: "primary.main",
                              fontWeight: 600,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/stock/${s}`);
                            }}
                          />
                        ))}
                        {g.stocks.length > 4 && (
                          <Typography
                            sx={{
                              color: "text.secondary",
                              alignSelf: "center",
                              fontSize: "0.55rem",
                            }}
                          >
                            +{g.stocks.length - 4}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.4 }}>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          fontSize: "0.73rem",
                        }}
                      >
                        {formatShares(g.totalShares)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.4 }}>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: "0.73rem",
                        }}
                      >
                        {g.maxPct.toFixed(2)}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Stack>
  );
}

function Sparkline({
  data,
  color,
  width = 72,
  height = 28,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const gradientId = `spark-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  const areaPath =
    `M0,${height} L${points.split(" ").map((p) => p).join(" L")} L${width},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IndexCard({
  idx,
  onClick,
}: {
  idx: { code: string; close: number; change: number; changePct: number; history: number[] };
  onClick: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isUp = idx.change >= 0;
  const accentColor = isUp ? theme.palette.success.main : theme.palette.error.main;
  const label = INDEX_LABELS[idx.code] || idx.code;

  return (
    <Paper
      onClick={onClick}
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 2,
        minWidth: 140,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
        transition: "border-color 0.2s, transform 0.15s",
        "&:hover": {
          borderColor: `${accentColor}40`,
          transform: "translateY(-1px)",
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "text.secondary",
              lineHeight: 1,
              mb: 0.5,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 800,
              fontSize: "0.95rem",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {idx.close.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                fontSize: "0.65rem",
                color: accentColor,
                lineHeight: 1,
              }}
            >
              {isUp ? "+" : ""}{idx.change.toFixed(1)}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 600,
                fontSize: "0.6rem",
                color: accentColor,
                opacity: 0.8,
                lineHeight: 1,
              }}
            >
              ({isUp ? "+" : ""}{idx.changePct.toFixed(2)}%)
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ flexShrink: 0, mt: 0.5 }}>
          <Sparkline data={idx.history} color={accentColor} />
        </Box>
      </Stack>
    </Paper>
  );
}
