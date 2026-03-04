"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import {
  KSEIRecord,
  IDXStockSummary,
  IDXDividend,
  IDXCorporateAction,
  IDXStockSplit,
  IDXCalendarEvent,
  INVESTOR_TYPE_MAP,
  formatShares,
  formatValue,
  formatRatio,
} from "@/lib/types";
import { StatsCard, StatsCardSkeleton } from "@/components/StatsCard";
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
import LinearProgress from "@mui/material/LinearProgress";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PeopleIcon from "@mui/icons-material/People";
import PublicIcon from "@mui/icons-material/Public";
import FlagIcon from "@mui/icons-material/Flag";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import EventIcon from "@mui/icons-material/Event";
import PaymentsIcon from "@mui/icons-material/Payments";
import SplitscreenIcon from "@mui/icons-material/Splitscreen";
import CampaignIcon from "@mui/icons-material/Campaign";

interface TypeBreakdown {
  code: string;
  name: string;
  count: number;
  totalPct: number;
}

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
  totalTickers: number;
  totalInvestors: number;
  avgLocalPct: number;
  avgForeignPct: number;
  investorTypeBreakdown: TypeBreakdown[];
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

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
      <Box
        sx={{
          width: 3,
          height: 20,
          borderRadius: 2,
          background: `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.primary.light}55)`,
          flexShrink: 0,
          boxShadow: `0 0 10px ${theme.palette.primary.main}30`,
        }}
      />
      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 700,
            fontSize: "0.95rem",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.65rem",
              opacity: 0.7,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
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
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<IDXCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [kseiRes, stockRes] = await Promise.all([
          supabase
            .from(TABLE_NAME)
            .select("*")
            .order("PERCENTAGE", { ascending: false }),
          supabase
            .from("idx_stock_summary")
            .select("*")
            .order("date", { ascending: false })
            .limit(2000),
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

        const uniqueTickers = new Set(typed.map((r) => r.SHARE_CODE));
        const uniqueInvestors = new Set(typed.map((r) => r.INVESTOR_NAME));

        const stockOwnership = new Map<
          string,
          { local: number; foreign: number }
        >();
        typed.forEach((r) => {
          if (!stockOwnership.has(r.SHARE_CODE)) {
            stockOwnership.set(r.SHARE_CODE, { local: 0, foreign: 0 });
          }
          const entry = stockOwnership.get(r.SHARE_CODE)!;
          if (r.LOCAL_FOREIGN === "L") entry.local += r.PERCENTAGE;
          else entry.foreign += r.PERCENTAGE;
        });
        const stockCount = stockOwnership.size;
        const rawAvgLocal =
          [...stockOwnership.values()].reduce((s, v) => s + v.local, 0) /
          stockCount;
        const rawAvgForeign =
          [...stockOwnership.values()].reduce((s, v) => s + v.foreign, 0) /
          stockCount;
        const rawAvgTotal = rawAvgLocal + rawAvgForeign;
        const avgLocal =
          rawAvgTotal > 0 ? (rawAvgLocal / rawAvgTotal) * 100 : 0;
        const avgForeign =
          rawAvgTotal > 0 ? (rawAvgForeign / rawAvgTotal) * 100 : 0;

        const typeGroups: Record<string, KSEIRecord[]> = {};
        typed.forEach((r) => {
          const code = r.INVESTOR_TYPE;
          if (!code || code === "null" || !INVESTOR_TYPE_MAP[code]) return;
          if (!typeGroups[code]) typeGroups[code] = [];
          typeGroups[code].push(r);
        });
        const investorTypeBreakdown = Object.entries(typeGroups)
          .map(([code, recs]) => ({
            code,
            name: INVESTOR_TYPE_MAP[code] || code,
            count: new Set(recs.map((r) => r.INVESTOR_NAME)).size,
            totalPct: recs.reduce((s, r) => s + r.PERCENTAGE, 0),
          }))
          .sort((a, b) => b.count - a.count);

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
          totalTickers: uniqueTickers.size,
          totalInvestors: uniqueInvestors.size,
          avgLocalPct: parseFloat(avgLocal.toFixed(1)),
          avgForeignPct: parseFloat(avgForeign.toFixed(1)),
          investorTypeBreakdown,
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

  const maxTypeCount = useMemo(() => {
    if (!data) return 1;
    return Math.max(...data.investorTypeBreakdown.map((t) => t.count), 1);
  }, [data]);

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
      <Stack spacing={2.5}>
        <Skeleton
          variant="rounded"
          height={48}
          sx={{ borderRadius: 2.5 }}
        />
        <Grid container spacing={1.5}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid size={{ xs: 6, lg: 3 }} key={i}>
              <StatsCardSkeleton />
            </Grid>
          ))}
        </Grid>
        <Skeleton
          variant="rounded"
          height={240}
          sx={{ borderRadius: 2.5 }}
        />
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ borderRadius: 2.5 }}
        />
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ borderRadius: 2.5 }}
        />
      </Stack>
    );
  }

  if (!data) return null;

  const localForeignTotal = data.avgLocalPct + data.avgForeignPct;
  const localBarWidth =
    localForeignTotal > 0 ? (data.avgLocalPct / localForeignTotal) * 100 : 50;

  return (
    <Stack spacing={2.5}>
      <Box className="animate-in">
        <GlobalSearch />
      </Box>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6, lg: 3 }} className="animate-in animate-in-delay-1">
          <StatsCard
            title="Total Tickers"
            value={data.totalTickers}
            subtitle="Unique stocks"
            icon={<ShowChartIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }} className="animate-in animate-in-delay-2">
          <StatsCard
            title="Total Investors"
            value={data.totalInvestors.toLocaleString()}
            subtitle="Unique entities"
            icon={<PeopleIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }} className="animate-in animate-in-delay-3">
          <StatsCard
            title="Avg Local"
            value={`${data.avgLocalPct}%`}
            subtitle="Per ticker average"
            icon={<FlagIcon />}
            accentColor={theme.palette.success.main}
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }} className="animate-in animate-in-delay-4">
          <StatsCard
            title="Avg Foreign"
            value={`${data.avgForeignPct}%`}
            subtitle="Per ticker average"
            icon={<PublicIcon />}
            accentColor={theme.palette.warning.main}
          />
        </Grid>
      </Grid>

      <Paper
        className="animate-in animate-in-delay-3"
        sx={{ p: 2, borderRadius: 2.5 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: "0.65rem",
            }}
          >
            Local vs Foreign
          </Typography>
          <Stack direction="row" spacing={2}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: theme.palette.success.main,
                }}
              />
              <Typography
                variant="caption"
                sx={{ fontSize: "0.65rem", color: "text.secondary" }}
              >
                Local
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: theme.palette.warning.main,
                }}
              />
              <Typography
                variant="caption"
                sx={{ fontSize: "0.65rem", color: "text.secondary" }}
              >
                Foreign
              </Typography>
            </Stack>
          </Stack>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              color: theme.palette.success.main,
              minWidth: 48,
              fontSize: "0.85rem",
            }}
          >
            {data.avgLocalPct}%
          </Typography>
          <Box
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: isDark
                ? "rgba(251,191,36,0.15)"
                : "rgba(217,119,6,0.12)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Box
              sx={{
                width: `${localBarWidth}%`,
                height: "100%",
                borderRadius: 3,
                background: `linear-gradient(90deg, ${theme.palette.success.main}, ${isDark ? "#6ee7b7" : "#34d399"})`,
                transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                position: "relative",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 2,
                  height: 12,
                  borderRadius: 1,
                  bgcolor: theme.palette.success.main,
                  opacity: 0.5,
                },
              }}
            />
          </Box>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              color: theme.palette.warning.main,
              minWidth: 48,
              textAlign: "right",
              fontSize: "0.85rem",
            }}
          >
            {data.avgForeignPct}%
          </Typography>
        </Box>
      </Paper>

      {movers && (
        <Box className="animate-in animate-in-delay-4">
          <SectionHeader title="Market Movers" />
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 4 }}>
              <MoverTable
                title="Top Gainers"
                icon={
                  <TrendingUpIcon
                    sx={{ color: theme.palette.success.main, fontSize: 16 }}
                  />
                }
                movers={movers.gainers}
                router={router}
                type="gain"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <MoverTable
                title="Top Losers"
                icon={
                  <TrendingDownIcon
                    sx={{ color: theme.palette.error.main, fontSize: 16 }}
                  />
                }
                movers={movers.losers}
                router={router}
                type="loss"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <MoverTable
                title="Most Active"
                icon={
                  <WhatshotIcon
                    sx={{ color: theme.palette.warning.main, fontSize: 16 }}
                  />
                }
                movers={movers.active}
                router={router}
                type="active"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {upcomingEvents.length > 0 && (
        <Box className="animate-in animate-in-delay-5">
          <SectionHeader
            title="Corporate Actions"
            subtitle="Recent & upcoming events"
          />
          <Paper sx={{ borderRadius: 2.5, overflow: "hidden" }}>
            <TableContainer sx={{ maxHeight: 380 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Detail</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>End</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcomingEvents.map((ev, i) => {
                    const eventDate = new Date(ev.date);
                    const isUpcoming = eventDate >= new Date();
                    return (
                      <TableRow
                        key={`${ev.code}-${ev.type}-${i}`}
                        hover
                        sx={{
                          cursor: "pointer",
                          "&:last-child td": { borderBottom: 0 },
                          opacity: isUpcoming ? 1 : 0.7,
                        }}
                        onClick={() => router.push(`/stock/${ev.code}`)}
                      >
                        <TableCell>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontFamily: '"JetBrains Mono", monospace',
                              color: "primary.main",
                              fontSize: "0.75rem",
                            }}
                          >
                            {ev.code}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              fontSize: "0.55rem",
                              display: "block",
                              maxWidth: 90,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ev.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ev.type}
                            size="small"
                            icon={
                              ev.type === "Dividend" ? <PaymentsIcon sx={{ fontSize: "12px !important" }} /> :
                              ev.type === "Stock Split" ? <SplitscreenIcon sx={{ fontSize: "12px !important" }} /> :
                              <CampaignIcon sx={{ fontSize: "12px !important" }} />
                            }
                            sx={{
                              fontSize: "0.58rem",
                              height: 20,
                              fontWeight: 600,
                              bgcolor: ev.type === "Dividend"
                                ? isDark ? "rgba(52,211,153,0.12)" : "rgba(5,150,105,0.08)"
                                : ev.type === "Right Issue"
                                  ? isDark ? "rgba(96,165,250,0.12)" : "rgba(59,130,246,0.08)"
                                  : ev.type === "Stock Split"
                                    ? isDark ? "rgba(168,85,247,0.12)" : "rgba(139,92,246,0.08)"
                                    : isDark ? "rgba(251,191,36,0.12)" : "rgba(217,119,6,0.08)",
                              color: ev.type === "Dividend"
                                ? "#34d399"
                                : ev.type === "Right Issue"
                                  ? isDark ? "#60a5fa" : "#3b82f6"
                                  : ev.type === "Stock Split"
                                    ? isDark ? "#a855f7" : "#8b5cf6"
                                    : "#fbbf24",
                              "& .MuiChip-icon": {
                                color: "inherit",
                                ml: 0.5,
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "block",
                              fontSize: "0.7rem",
                            }}
                          >
                            {ev.detail}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {isUpcoming && (
                              <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#34d399", flexShrink: 0 }} />
                            )}
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                whiteSpace: "nowrap",
                                fontSize: "0.68rem",
                                fontWeight: isUpcoming ? 600 : 400,
                              }}
                            >
                              {eventDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {ev.endDate && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                whiteSpace: "nowrap",
                                fontSize: "0.68rem",
                                color: "text.secondary",
                              }}
                            >
                              {new Date(ev.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {calendarEvents.length > 0 && (
        <Box className="animate-in animate-in-delay-5">
          <SectionHeader
            title="IDX Calendar"
            subtitle="Scheduled RUPS & corporate events"
          />
          <EventCalendar events={calendarEvents} />
        </Box>
      )}

      <Box className="animate-in animate-in-delay-5">
        <SectionHeader
          title="Market Overview"
          subtitle="Investor type breakdown"
        />
        <Grid container spacing={1}>
          {data.investorTypeBreakdown.map((t) => (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={t.code}>
              <Paper
                onClick={() => router.push(`/category/${t.code}`)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.75,
                  cursor: "pointer",
                  transition:
                    "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: isDark
                      ? "rgba(212,168,67,0.04)"
                      : "rgba(161,124,47,0.03)",
                    transform: "translateY(-2px)",
                    boxShadow: isDark
                      ? `0 8px 24px rgba(0,0,0,0.3), 0 0 16px rgba(212,168,67,0.05)`
                      : "0 8px 24px rgba(0,0,0,0.06)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      color: "primary.main",
                    }}
                  >
                    {t.code}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.68rem",
                      color: "text.secondary",
                      fontWeight: 600,
                    }}
                  >
                    {t.count}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, fontSize: "0.75rem", lineHeight: 1.3 }}
                >
                  {t.name}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(t.count / maxTypeCount) * 100}
                  sx={{
                    height: 3,
                    borderRadius: 2,
                    bgcolor: isDark
                      ? "rgba(212,168,67,0.08)"
                      : "rgba(161,124,47,0.06)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: "primary.main",
                      borderRadius: 2,
                    },
                  }}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box className="animate-in animate-in-delay-5">
        <InvestorTable
          title="Top Foreign Investors"
          investors={data.topForeignInvestors}
          router={router}
        />
      </Box>

      <Box className="animate-in animate-in-delay-6">
        <InvestorTable
          title="Top Local Investors"
          investors={data.topLocalInvestors}
          router={router}
        />
      </Box>

      <Box className="animate-in animate-in-delay-6">
        <SectionHeader
          title="Conglomerates"
          subtitle="Multi-stock holders, sorted by total value"
        />
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 2.5, overflow: "hidden" }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 36 }}>#</TableCell>
                <TableCell>Investor</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Origin</TableCell>
                <TableCell align="center">Stocks</TableCell>
                <TableCell>Tickers</TableCell>
                <TableCell align="right">Total Value</TableCell>
                <TableCell align="right">Max %</TableCell>
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
                    transition: "background-color 0.1s ease",
                    "&:hover": {
                      bgcolor: isDark
                        ? "rgba(212,168,67,0.04)"
                        : "rgba(161,124,47,0.03)",
                    },
                  }}
                  onClick={() =>
                    router.push(`/investor/${encodeURIComponent(g.name)}`)
                  }
                >
                  <TableCell>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.7rem",
                        color: "text.secondary",
                      }}
                    >
                      {i + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, fontSize: "0.8rem" }}
                    >
                      {g.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <InvestorTypeBadge type={g.type} />
                  </TableCell>
                  <TableCell>
                    <LocalForeignBadge type={g.origin} />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={g.stockCount}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontFamily: '"JetBrains Mono", monospace',
                        minWidth: 28,
                        height: 22,
                        fontSize: "0.7rem",
                        bgcolor: "primary.main",
                        color: isDark ? "#060a14" : "#fff",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        flexWrap: "wrap",
                        maxWidth: 220,
                      }}
                    >
                      {g.stocks.slice(0, 4).map((s) => (
                        <Chip
                          key={s}
                          label={s}
                          size="small"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.65rem",
                            height: 20,
                            bgcolor: isDark
                              ? "rgba(212,168,67,0.08)"
                              : "rgba(161,124,47,0.06)",
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
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            alignSelf: "center",
                            fontSize: "0.62rem",
                          }}
                        >
                          +{g.stocks.length - 4}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 700,
                        fontSize: "0.78rem",
                      }}
                    >
                      {formatShares(g.totalShares)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.78rem",
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
      </Box>
    </Stack>
  );
}

function InvestorTable({
  title,
  investors,
  router,
}: {
  title: string;
  investors: TopInvestor[];
  router: ReturnType<typeof useRouter>;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box>
      <SectionHeader title={title} />
      <TableContainer
        component={Paper}
        sx={{ borderRadius: 2.5, overflow: "hidden" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 36 }}>#</TableCell>
              <TableCell>Investor</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Stocks</TableCell>
              <TableCell align="right">Total Value</TableCell>
              <TableCell align="right">Max %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {investors.map((inv, i) => (
              <TableRow
                key={inv.name}
                hover
                sx={{
                  cursor: "pointer",
                  "&:last-child td": { borderBottom: 0 },
                  transition: "background-color 0.1s ease",
                  "&:hover": {
                    bgcolor: isDark
                      ? "rgba(212,168,67,0.04)"
                      : "rgba(161,124,47,0.03)",
                  },
                }}
                onClick={() =>
                  router.push(`/investor/${encodeURIComponent(inv.name)}`)
                }
              >
                <TableCell>
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.7rem",
                      color: "text.secondary",
                    }}
                  >
                    {i + 1}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, fontSize: "0.8rem" }}
                  >
                    {inv.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <InvestorTypeBadge type={inv.type} />
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 0.5,
                      flexWrap: "wrap",
                      maxWidth: 200,
                    }}
                  >
                    {inv.stocks.slice(0, 3).map((s) => (
                      <Chip
                        key={s}
                        label={s}
                        size="small"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: "0.65rem",
                          height: 20,
                          bgcolor: isDark
                            ? "rgba(212,168,67,0.08)"
                            : "rgba(161,124,47,0.06)",
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
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          alignSelf: "center",
                          fontSize: "0.62rem",
                        }}
                      >
                        +{inv.stocks.length - 3}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontWeight: 700,
                      fontSize: "0.78rem",
                    }}
                  >
                    {formatShares(inv.totalShares)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.78rem",
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
    </Box>
  );
}

function MoverTable({
  title,
  icon,
  movers,
  router,
  type,
}: {
  title: string;
  icon: React.ReactNode;
  movers: MarketMover[];
  router: ReturnType<typeof useRouter>;
  type: "gain" | "loss" | "active";
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const accentColor =
    type === "gain"
      ? theme.palette.success.main
      : type === "loss"
        ? theme.palette.error.main
        : theme.palette.warning.main;

  return (
    <Paper
      sx={{
        borderRadius: 2.5,
        overflow: "hidden",
        height: "100%",
        position: "relative",
        transition:
          "border-color 0.25s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: isDark
            ? `0 8px 32px rgba(0,0,0,0.35), 0 0 20px ${accentColor}10`
            : `0 8px 32px rgba(0,0,0,0.07)`,
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
          opacity: 0.6,
          boxShadow: `0 0 12px ${accentColor}30`,
        },
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{ px: 1.5, pt: 1.5, pb: 0.75 }}
      >
        {icon}
        <Typography
          variant="subtitle2"
          sx={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 700,
            fontSize: "0.82rem",
          }}
        >
          {title}
        </Typography>
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ py: 0.75 }}>Code</TableCell>
              <TableCell align="right" sx={{ py: 0.75 }}>
                Price
              </TableCell>
              <TableCell align="right" sx={{ py: 0.75 }}>
                {type === "active" ? "Value" : "Change"}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movers.map((m) => {
              const color =
                m.change > 0
                  ? theme.palette.success.main
                  : m.change < 0
                    ? theme.palette.error.main
                    : "text.secondary";
              return (
                <TableRow
                  key={m.code}
                  hover
                  sx={{
                    cursor: "pointer",
                    "&:last-child td": { borderBottom: 0 },
                    transition: "background-color 0.1s ease",
                    "&:hover": {
                      bgcolor: isDark
                        ? "rgba(212,168,67,0.04)"
                        : "rgba(161,124,47,0.03)",
                    },
                  }}
                  onClick={() => router.push(`/stock/${m.code}`)}
                >
                  <TableCell sx={{ py: 0.5 }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontFamily: '"JetBrains Mono", monospace',
                        color: "primary.main",
                        fontSize: "0.75rem",
                      }}
                    >
                      {m.code}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: "0.58rem",
                        display: "block",
                        maxWidth: 100,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        opacity: 0.7,
                      }}
                    >
                      {m.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    >
                      {m.close.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    {type === "active" ? (
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 600,
                          fontSize: "0.75rem",
                        }}
                      >
                        {formatValue(m.value)}
                      </Typography>
                    ) : (
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          color,
                        }}
                      >
                        {m.changePct > 0 ? "+" : ""}
                        {m.changePct.toFixed(2)}%
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
