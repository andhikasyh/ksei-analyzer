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
import { GlobalSearch } from "@/components/SearchInput";
import { InvestorTypeBadge, LocalForeignBadge } from "@/components/Badge";
import { EventCalendar } from "@/components/EventCalendar";
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

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

interface UpcomingEvent {
  code: string;
  name: string;
  type: "Dividend" | "Right Issue" | "Warrant" | "Stock Split" | "Bond Conversion" | "Additional Listing" | "Delisting" | string;
  detail: string;
  date: string;
  endDate?: string;
  amount?: string;
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

interface IHSGChartPoint {
  date: string;
  displayDate: string;
  marketCap: number;
  marketCapTrillion: number;
}

interface IHSGPerformance {
  change7d: number;
  pct7d: number;
  change30d: number;
  pct30d: number;
  changeYTD: number;
  pctYTD: number;
  latestClose: number;
  latestDate: string;
}

export default function DashboardPage() {
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
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<IDXCalendarEvent[]>([]);
  const [ihsgChartData, setIhsgChartData] = useState<IHSGChartPoint[]>([]);
  const [ihsgPerformance, setIhsgPerformance] = useState<IHSGPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moverTab, setMoverTab] = useState<"gain" | "loss" | "active">("gain");
  const [playerTab, setPlayerTab] = useState<"foreign" | "local" | "conglom">("foreign");
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [kseiRes, stockRes, indexRes, ihsgRes] = await Promise.all([
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
            .in("index_code", ["COMPOSITE", "LQ45", "IDX30", "IDXHIDIV20", "IDXBUMN20", "IDX80", "IDXV30", "IDXQ30"])
            .order("date", { ascending: false })
            .limit(500),
          supabase
            .from("idx_index_summary")
            .select("date, close, market_capital")
            .eq("index_code", "COMPOSITE")
            .order("date", { ascending: false })
            .limit(400),
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
        }

        if (indexRes.data) {
          const raw = indexRes.data as IDXIndexSummary[];
          const byCode = new Map<string, IDXIndexSummary[]>();
          raw.forEach((r) => {
            const arr = byCode.get(r.index_code) || [];
            arr.push(r);
            byCode.set(r.index_code, arr);
          });
          const priority = ["COMPOSITE", "LQ45", "IDX30", "IDXHIDIV20", "IDXBUMN20", "IDX80", "IDXV30", "IDXQ30"];
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

        if (ihsgRes.data && ihsgRes.data.length > 0) {
          const rows = (ihsgRes.data as { date: string; close: string; market_capital: string }[])
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const chartPoints: IHSGChartPoint[] = rows.map((r) => {
            const cap = parseFloat(r.market_capital) || 0;
            return {
              date: r.date,
              displayDate: new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
              marketCap: cap,
              marketCapTrillion: cap / 1e12,
            };
          });
          setIhsgChartData(chartPoints);

          const latestClose = parseFloat(rows[rows.length - 1]?.close) || 0;
          const latestDate = rows[rows.length - 1]?.date || "";
          const latestTime = new Date(latestDate + "T12:00:00").getTime();

          const getCloseOnOrBefore = (isoDate: string): number => {
            const target = new Date(isoDate + "T12:00:00").getTime();
            let best: { date: string; close: string } | null = null;
            for (let i = rows.length - 1; i >= 0; i--) {
              const rowTime = new Date(rows[i].date + "T12:00:00").getTime();
              if (rowTime <= target) {
                best = rows[i];
                break;
              }
            }
            if (!best) best = rows[0];
            return parseFloat(best?.close) || 0;
          };

          const ref7 = new Date(latestTime);
          ref7.setDate(ref7.getDate() - 7);
          const ref7Str = ref7.toISOString().split("T")[0];
          const ref30 = new Date(latestTime);
          ref30.setDate(ref30.getDate() - 30);
          const ref30Str = ref30.toISOString().split("T")[0];

          const close7 = getCloseOnOrBefore(ref7Str);
          const close30 = getCloseOnOrBefore(ref30Str);

          const ytdDate = new Date().getFullYear() + "-01-02";
          const ytdRow = rows.find((r) => r.date >= ytdDate);
          const closeYTD = ytdRow ? parseFloat(ytdRow.close) || 0 : parseFloat(rows[0]?.close) || 0;

          const pct = (prev: number, curr: number) => (prev > 0 ? ((curr - prev) / prev) * 100 : 0);
          setIhsgPerformance({
            change7d: latestClose - close7,
            pct7d: pct(close7, latestClose),
            change30d: latestClose - close30,
            pct30d: pct(close30, latestClose),
            changeYTD: latestClose - closeYTD,
            pctYTD: pct(closeYTD, latestClose),
            latestClose,
            latestDate,
          });
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0];

        const [divRes, caRes, splitRes, calendarRes] = await Promise.all([
          supabase
            .from("idx_dividends")
            .select("code, name, cash_dividend, cum_dividend, ex_dividend, payment_date, note")
            .gte("payment_date", cutoffDate)
            .order("ex_dividend", { ascending: true })
            .limit(20),
          supabase
            .from("idx_corporate_actions")
            .select("code, issuer_name, action_type, action_type_raw, num_of_shares, start_date, last_date")
            .gte("last_date", cutoffDate)
            .order("start_date", { ascending: true })
            .limit(20),
          supabase
            .from("idx_stock_splits")
            .select("code, stock_name, ratio, ssrs, nominal_value, nominal_value_new, listing_date")
            .gte("listing_date", cutoffDate)
            .order("listing_date", { ascending: true })
            .limit(10),
          supabase
            .from("idx_calendar_events")
            .select("*")
            .gte("event_date", new Date().toISOString().split("T")[0])
            .order("event_date", { ascending: true })
            .limit(100),
        ]);

        const events: UpcomingEvent[] = [];

        if (divRes.data) {
          (divRes.data as IDXDividend[]).forEach((d) => {
            const noteLabel =
              d.note === "F" ? "Final" : d.note === "I" ? "Interim" : d.note === "S" ? "Special" : d.note || "";
            events.push({
              code: d.code,
              name: d.name,
              type: "Dividend",
              detail: `${noteLabel} - Rp ${formatRatio(d.cash_dividend)}/share`,
              date: d.ex_dividend,
              endDate: d.payment_date,
              amount: d.cash_dividend,
            });
          });
        }

        if (caRes.data) {
          (caRes.data as IDXCorporateAction[]).forEach((ca) => {
            events.push({
              code: ca.code,
              name: ca.issuer_name,
              type: ca.action_type,
              detail: `${ca.action_type_raw} - ${formatShares(ca.num_of_shares)} shares`,
              date: ca.start_date,
              endDate: ca.last_date,
            });
          });
        }

        if (splitRes.data) {
          (splitRes.data as IDXStockSplit[]).forEach((s) => {
            events.push({
              code: s.code,
              name: s.stock_name,
              type: "Stock Split",
              detail: `${s.ssrs === "SS" ? "Split" : "Reverse"} ${s.ratio} (Rp ${formatRatio(s.nominal_value)} -> Rp ${formatRatio(s.nominal_value_new)})`,
              date: s.listing_date,
            });
          });
        }

        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setUpcomingEvents(events.slice(0, 25));

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

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Paper
          sx={{ p: 4, textAlign: "center", maxWidth: 420, borderRadius: 3 }}
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
        <Skeleton variant="rounded" height={40} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={52} sx={{ borderRadius: 2 }} />
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
      <Box className="animate-in">
        <GlobalSearch />
      </Box>

      {indexes.length > 0 && (
        <Box
          className="animate-in animate-in-delay-1"
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            pb: 0.5,
            scrollbarWidth: "none",
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

      {/* ---- IHSG Market Cap + Performance + Weekly Digest ---- */}
      {(ihsgChartData.length > 0 || ihsgPerformance) && (
        <Box
          className="animate-in animate-in-delay-2"
          sx={{
            display: { xs: "block", lg: "flex" },
            gap: 1.5,
            alignItems: "stretch",
          }}
        >
          {ihsgChartData.length > 0 && (
            <Paper
              sx={{
                flex: { lg: "1.4 1 0%" },
                minWidth: 0,
                borderRadius: 2,
                overflow: "hidden",
                position: "relative",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}88, ${isDark ? "#d4a843" : "#a17c2f"}66)`,
                  zIndex: 1,
                },
              }}
            >
              <Box sx={{ pt: 2, px: 1.5, pb: 0.5 }}>
                <Typography
                  sx={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    letterSpacing: "-0.02em",
                    color: "text.primary",
                  }}
                >
                  IHSG Market Cap
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.65rem",
                    display: "block",
                    mt: 0.25,
                  }}
                >
                  Total market capitalisation (IDX Composite)
                </Typography>
              </Box>
              <Box sx={{ height: 220, px: 1, pb: 1.5 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={ihsgChartData}
                    margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="ihsg-cap-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.28} />
                        <stop offset="90%" stopColor={theme.palette.primary.main} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="displayDate"
                      tick={{
                        fill: isDark ? "rgba(107,127,163,0.8)" : "rgba(12,18,34,0.5)",
                        fontSize: 10,
                      }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(v) => `Rp ${v.toFixed(1)}T`}
                      tick={{
                        fill: isDark ? "rgba(107,127,163,0.8)" : "rgba(12,18,34,0.5)",
                        fontSize: 10,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const pt = payload[0].payload as IHSGChartPoint;
                        return (
                          <Box
                            sx={{
                              bgcolor: isDark ? "rgba(17,27,48,0.96)" : "rgba(255,255,255,0.98)",
                              border: `1px solid ${isDark ? "rgba(107,127,163,0.2)" : "rgba(0,0,0,0.08)"}`,
                              borderRadius: 2,
                              px: 1.25,
                              py: 1,
                              boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.35)" : "0 8px 24px rgba(0,0,0,0.1)",
                              fontFamily: '"JetBrains Mono", monospace',
                            }}
                          >
                            <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", mb: 0.25 }}>
                              {pt.displayDate}
                            </Typography>
                            <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "primary.main" }}>
                              Rp {pt.marketCapTrillion.toFixed(2)}T
                            </Typography>
                          </Box>
                        );
                      }}
                      cursor={{ stroke: isDark ? "rgba(212,168,67,0.25)" : "rgba(161,124,47,0.2)", strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="marketCapTrillion"
                      stroke={theme.palette.primary.main}
                      strokeWidth={2}
                      fill="url(#ihsg-cap-gradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          )}

          <Box sx={{ flex: { lg: "1 1 0%" }, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {ihsgPerformance && (
              <Paper
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                }}
              >
                <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5 }}>
                  <Typography
                    sx={{
                      fontFamily: '"Outfit", sans-serif',
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Performance Snapshot
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                    IHSG (COMPOSITE)
                  </Typography>
                </Box>
                <Stack spacing={0} sx={{ px: 1.5, pb: 1.5 }}>
                  {[
                    { label: "Last 7 days", change: ihsgPerformance.change7d, pct: ihsgPerformance.pct7d },
                    { label: "Last 30 days", change: ihsgPerformance.change30d, pct: ihsgPerformance.pct30d },
                    { label: "YTD", change: ihsgPerformance.changeYTD, pct: ihsgPerformance.pctYTD },
                  ].map(({ label, change, pct }) => {
                    const up = change >= 0;
                    const color = up ? theme.palette.success.main : theme.palette.error.main;
                    return (
                      <Box
                        key={label}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          py: 1,
                          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                          "&:last-of-type": { borderBottom: 0 },
                        }}
                      >
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                          {label}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          {up ? (
                            <TrendingUpIcon sx={{ fontSize: 14, color }} />
                          ) : (
                            <TrendingDownIcon sx={{ fontSize: 14, color }} />
                          )}
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              color,
                            }}
                          >
                            {up ? "+" : ""}{pct.toFixed(2)}%
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: "0.7rem",
                              color: "text.secondary",
                            }}
                          >
                            ({up ? "+" : ""}{change.toFixed(1)} pts)
                          </Typography>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
                <Box sx={{ px: 1.5, pb: 1, pt: 0 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
                    As of {ihsgPerformance.latestDate ? new Date(ihsgPerformance.latestDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                  </Typography>
                </Box>
              </Paper>
            )}

            <Paper
              component={Box}
              onClick={() => router.push("/intelligent")}
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                cursor: "pointer",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                transition: "border-color 0.2s, box-shadow 0.2s",
                "&:hover": {
                  borderColor: isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.15)",
                  boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.2)" : "0 6px 20px rgba(0,0,0,0.06)",
                },
              }}
            >
              <Box sx={{ px: 1.5, py: 1.25, display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    background: isDark
                      ? "linear-gradient(135deg, rgba(129,140,248,0.2), rgba(212,168,67,0.12))"
                      : "linear-gradient(135deg, rgba(129,140,248,0.12), rgba(161,124,47,0.08))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 18, color: "#818cf8" }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: '"Outfit", sans-serif',
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Weekly Digest
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", display: "block" }}>
                    AI market reports and daily insights
                  </Typography>
                </Box>
                <ArrowForwardIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              </Box>
            </Paper>
          </Box>
        </Box>
      )}

      {/* ---- MAIN: movers + actions ---- */}
      <Box
        sx={{
          display: { xs: "block", lg: "flex" },
          gap: 1.5,
          alignItems: "stretch",
        }}
      >
        <Box sx={{ flex: "7 1 0%", minWidth: 0, mb: { xs: 1.5, lg: 0 }, display: "flex" }}>
            {movers && (
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
                    alignItems: "center",
                    justifyContent: "space-between",
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
                  <Stack direction="row" spacing={0}>
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

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, width: 160 }}>Stock</TableCell>
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
            )}
        </Box>

        {/* RIGHT: Corporate actions feed */}
        <Box sx={{ flex: "5 1 0%", minWidth: 0 }}>
          {upcomingEvents.length > 0 && (
            <Paper
              className="animate-in animate-in-delay-4"
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 2,
                  bottom: 0,
                  background: `linear-gradient(180deg, ${theme.palette.success.main}60, ${theme.palette.primary.main}40, transparent)`,
                },
              }}
            >
              <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography
                    sx={{
                      fontFamily: '"Outfit", sans-serif',
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Corporate Actions
                  </Typography>
                  <Chip
                    label={`${upcomingEvents.length} events`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      bgcolor: isDark ? "rgba(52,211,153,0.08)" : "rgba(5,150,105,0.05)",
                      color: isDark ? "#34d399" : "#059669",
                    }}
                  />
                </Stack>
              </Box>

              <Box sx={{ maxHeight: 360, overflow: "auto", px: 1, pb: 1 }}>
                <Stack spacing={0.25}>
                  {upcomingEvents.map((ev, i) => {
                    const eventDate = new Date(ev.date);
                    const isUpcoming = eventDate >= new Date();
                    const typeColor =
                      ev.type === "Dividend"
                        ? isDark ? "#34d399" : "#059669"
                        : ev.type === "Right Issue"
                          ? isDark ? "#60a5fa" : "#3b82f6"
                          : ev.type === "Stock Split"
                            ? isDark ? "#a855f7" : "#8b5cf6"
                            : isDark ? "#fbbf24" : "#d97706";

                    return (
                      <Box
                        key={`${ev.code}-${ev.type}-${i}`}
                        onClick={() => router.push(`/stock/${ev.code}`)}
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1,
                          px: 1,
                          py: 0.75,
                          borderRadius: 1.5,
                          cursor: "pointer",
                          opacity: isUpcoming ? 1 : 0.55,
                          transition: "all 0.12s ease",
                          "&:hover": {
                            bgcolor: isDark ? "rgba(212,168,67,0.04)" : "rgba(161,124,47,0.03)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 3,
                            minHeight: 28,
                            borderRadius: 1,
                            bgcolor: typeColor,
                            opacity: 0.7,
                            flexShrink: 0,
                            mt: 0.25,
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                fontSize: "0.7rem",
                                color: "primary.main",
                              }}
                            >
                              {ev.code}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.52rem",
                                fontWeight: 700,
                                color: typeColor,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {ev.type}
                            </Typography>
                          </Stack>
                          <Typography
                            sx={{
                              color: "text.secondary",
                              fontSize: "0.6rem",
                              lineHeight: 1.3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ev.detail}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.58rem",
                            color: "text.secondary",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                            fontWeight: isUpcoming ? 600 : 400,
                          }}
                        >
                          {eventDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>

      {/* ---- CALENDAR ---- */}
      {calendarEvents.length > 0 && (
        <Box className="animate-in animate-in-delay-5">
          <EventCalendar events={calendarEvents} />
        </Box>
      )}

      {/* ---- POWER PLAYERS (tabbed) ---- */}
      <Paper
        className="animate-in animate-in-delay-6"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
          <Stack direction="row" spacing={0}>
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
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 0.5, width: 28 }}>#</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Investor</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Type</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Stocks</TableCell>
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
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 0.5, width: 28 }}>#</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Investor</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Origin</TableCell>
                  <TableCell align="center" sx={{ py: 0.5 }}>N</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Tickers</TableCell>
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
        minWidth: 160,
        flex: "1 1 0%",
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
