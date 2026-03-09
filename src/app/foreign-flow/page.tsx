"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { formatValue } from "@/lib/types";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface DailyFlow {
  date: string;
  net: number;
  buy: number;
  sell: number;
}

interface StockFlow {
  stock_code: string;
  stock_name: string;
  net: number;
  buy: number;
  sell: number;
}

export default function ForeignFlowPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = isDark ? "#c9a227" : "#c9a227";
  const router = useRouter();

  const [dailyFlows, setDailyFlows] = useState<DailyFlow[]>([]);
  const [allStockFlows, setAllStockFlows] = useState<StockFlow[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [chartRange, setChartRange] = useState<"1M" | "3M" | "6M">("1M");
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  // Step 1: fetch all distinct trading dates (latest first), set latest as default
  useEffect(() => {
    async function fetchDistinctDates() {
      // idx_stock_summary has many rows per date; we use a small trick:
      // fetch the latest 180 dates worth of data by getting stock_code = a fixed single stock
      // Actually safest: query with a specific stock code known to trade every day (BBCA is always active)
      // Fallback: query date column ordered desc with a reasonable limit per stock
      const { data } = await supabase
        .from("idx_stock_summary")
        .select("date")
        .eq("stock_code", "BBCA")
        .order("date", { ascending: false })
        .limit(180);

      if (!data || data.length === 0) {
        // fallback: just get the most recent date from any stock
        const { data: fallback } = await supabase
          .from("idx_stock_summary")
          .select("date")
          .order("date", { ascending: false })
          .limit(1);
        if (fallback && fallback[0]) {
          setSelectedDate(fallback[0].date);
          setAvailableDates([fallback[0].date]);
        }
        return;
      }

      const dates = data.map((r) => r.date);
      setAvailableDates(dates);
      setSelectedDate(dates[0]);
    }
    fetchDistinctDates();
  }, []);

  // Step 2: fetch aggregated daily net flow for chart (grouped by date over the selected range)
  useEffect(() => {
    if (availableDates.length === 0) return;
    setChartLoading(true);

    async function fetchTrend() {
      const rangeDays = chartRange === "1M" ? 22 : chartRange === "3M" ? 66 : 132;
      const datesInRange = availableDates.slice(0, rangeDays);
      if (datesInRange.length === 0) return;

      const oldestDate = datesInRange[datesInRange.length - 1];
      const newestDate = datesInRange[0];

      // Fetch only the columns we need — but this can be a large query
      // We fetch in pages if needed; for performance we fetch all at once with range filter
      const { data, error } = await supabase
        .from("idx_stock_summary")
        .select("date,foreign_buy,foreign_sell")
        .gte("date", oldestDate)
        .lte("date", newestDate)
        .order("date", { ascending: true });

      if (!data || error) { setChartLoading(false); return; }

      const byDate: Record<string, { buy: number; sell: number }> = {};
      data.forEach((r) => {
        if (!byDate[r.date]) byDate[r.date] = { buy: 0, sell: 0 };
        byDate[r.date].buy += parseFloat(r.foreign_buy) || 0;
        byDate[r.date].sell += parseFloat(r.foreign_sell) || 0;
      });

      const flows: DailyFlow[] = datesInRange
        .slice()
        .reverse()
        .filter((d) => byDate[d])
        .map((date) => {
          const { buy, sell } = byDate[date];
          return { date, buy, sell, net: buy - sell };
        });

      setDailyFlows(flows);
      setChartLoading(false);
    }
    fetchTrend();
  }, [availableDates, chartRange]);

  // Step 3: fetch per-stock breakdown for selected date (or range when multi-day is selected)
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    async function fetchStockFlows() {
      const { data } = await supabase
        .from("idx_stock_summary")
        .select("stock_code,stock_name,foreign_buy,foreign_sell")
        .eq("date", selectedDate);

      if (!data) { setLoading(false); return; }

      const aggMap: Record<string, StockFlow> = {};
      data.forEach((r) => {
        const buy = parseFloat(r.foreign_buy) || 0;
        const sell = parseFloat(r.foreign_sell) || 0;
        if (buy === 0 && sell === 0) return;
        if (!aggMap[r.stock_code]) {
          aggMap[r.stock_code] = { stock_code: r.stock_code, stock_name: r.stock_name, buy: 0, sell: 0, net: 0 };
        }
        aggMap[r.stock_code].buy += buy;
        aggMap[r.stock_code].sell += sell;
        aggMap[r.stock_code].net += buy - sell;
      });

      setAllStockFlows(Object.values(aggMap));
      setLoading(false);
    }
    fetchStockFlows();
  }, [selectedDate]);

  const topBought = useMemo(
    () => [...allStockFlows].sort((a, b) => b.net - a.net).slice(0, 20),
    [allStockFlows]
  );

  const topSold = useMemo(
    () => [...allStockFlows].sort((a, b) => a.net - b.net).slice(0, 20),
    [allStockFlows]
  );

  const totalNet = allStockFlows.reduce((s, r) => s + r.net, 0);
  const isInflow = totalNet >= 0;

  const formatDateShort = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as DailyFlow;
    return (
      <Box
        sx={{
          bgcolor: isDark ? "#0d0d0d" : "#f0eeeb",
          border: `1px solid ${isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.1)"}`,
          borderRadius: "10px",
          p: 1.5,
          minWidth: 160,
        }}
      >
        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary", mb: 0.75 }}>
          {label}
        </Typography>
        <Stack spacing={0.5}>
          {[
            { label: "Net Flow", val: d.net, color: d.net >= 0 ? "#22c55e" : "#ef4444" },
            { label: "Foreign Buy", val: d.buy, color: "#22c55e" },
            { label: "Foreign Sell", val: d.sell, color: "#ef4444" },
          ].map(({ label: l, val, color }) => (
            <Stack key={l} direction="row" justifyContent="space-between" spacing={2}>
              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary" }}>{l}</Typography>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", fontWeight: 600, color }}>
                {val >= 0 ? "+" : ""}{formatValue(val)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#050505" : "#e8e6e3", pt: { xs: 3, md: 4 }, pb: 6 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>

        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 800,
              fontSize: { xs: "1.6rem", md: "2rem" },
              color: "text.primary",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Foreign Flow
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              fontSize: "0.82rem",
              color: "text.secondary",
              mt: 0.5,
            }}
          >
            Daily foreign investor net buy/sell across all IDX-listed stocks
          </Typography>
        </Box>

        {/* Summary Cards */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
          {[
            {
              label: `Net Flow — ${selectedDate || "Latest"}`,
              value: loading ? "-" : allStockFlows.length > 0 ? (totalNet >= 0 ? "+" : "") + formatValue(totalNet) : "-",
              sub: loading ? "loading..." : `${allStockFlows.length} stocks active`,
              color: isInflow ? "#22c55e" : "#ef4444",
              icon: isInflow ? <TrendingUpIcon /> : <TrendingDownIcon />,
            },
            {
              label: "Cumulative Net",
              value: chartLoading ? "-" : (() => {
                const total = dailyFlows.reduce((s, d) => s + d.net, 0);
                return (total >= 0 ? "+" : "") + formatValue(total);
              })(),
              sub: `over ${dailyFlows.length} trading days`,
              color: (() => {
                const t = dailyFlows.reduce((s, d) => s + d.net, 0);
                return t >= 0 ? "#22c55e" : "#ef4444";
              })(),
              icon: null,
            },
            {
              label: "Sentiment",
              value: loading ? "-" : totalNet > 500_000_000 ? "Strong Inflow" : totalNet > 0 ? "Mild Inflow" : totalNet > -500_000_000 ? "Mild Outflow" : "Strong Outflow",
              sub: "based on selected day",
              color: isInflow ? "#22c55e" : "#ef4444",
              icon: null,
            },
          ].map((card) => (
            <Paper
              key={card.label}
              elevation={0}
              sx={{
                flex: 1,
                border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
                borderRadius: "14px",
                p: 2.5,
                bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#f5f4f1",
              }}
            >
              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600, mb: 0.75 }}>
                {card.label}
              </Typography>
              <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: "1.4rem", color: card.color, letterSpacing: "-0.02em" }}>
                {card.value}
              </Typography>
              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary", mt: 0.25 }}>
                {card.sub}
              </Typography>
            </Paper>
          ))}
        </Stack>

        {/* Flow Chart with range toggle */}
        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
            borderRadius: "14px",
            p: { xs: 2, md: 3 },
            mb: 3,
            bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#f5f4f1",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
                Foreign Net Flow
              </Typography>
              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary", mt: 0.25 }}>
                Aggregated across all IDX stocks per trading day
              </Typography>
            </Box>
            {/* Range toggle */}
            <Box
              sx={{
                display: "flex",
                bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                borderRadius: "8px",
                p: 0.4,
                gap: 0.4,
              }}
            >
              {(["1M", "3M", "6M"] as const).map((r) => (
                <Box
                  key={r}
                  onClick={() => setChartRange(r)}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "6px",
                    cursor: "pointer",
                    bgcolor: chartRange === r
                      ? isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.12)"
                      : "transparent",
                    border: `1px solid ${chartRange === r
                      ? isDark ? "rgba(212,168,67,0.3)" : "rgba(161,124,47,0.25)"
                      : "transparent"}`,
                    transition: "all 0.15s ease",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.72rem",
                      fontWeight: chartRange === r ? 700 : 500,
                      color: chartRange === r ? accent : "text.secondary",
                    }}
                  >
                    {r}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Stack>
          {chartLoading || dailyFlows.length === 0 ? (
            <Skeleton variant="rectangular" height={220} sx={{ borderRadius: "8px" }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyFlows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.07)"} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
                  tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fill: isDark ? "rgba(107,127,163,0.7)" : "rgba(12,18,34,0.45)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => formatValue(v)}
                  tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fill: isDark ? "rgba(107,127,163,0.7)" : "rgba(12,18,34,0.45)" }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }} />
                <ReferenceLine y={0} stroke={isDark ? "rgba(107,127,163,0.3)" : "rgba(12,18,34,0.15)"} strokeWidth={1} />
                <Bar dataKey="net" radius={[3, 3, 0, 0]} maxBarSize={20}>
                  {dailyFlows.map((entry, index) => (
                    <Cell key={index} fill={entry.net >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Paper>

        {/* Date Selector + Tables */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
            Per-Stock Breakdown
          </Typography>
          <Select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            size="small"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.78rem",
              minWidth: 140,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.12)",
              },
            }}
          >
            {availableDates.map((d) => (
              <MenuItem key={d} value={d} sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem" }}>
                {d}
              </MenuItem>
            ))}
          </Select>
        </Stack>

        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          {/* Top Bought */}
          <Box sx={{ flex: 1 }}>
            <Paper
              elevation={0}
              sx={{
                border: `1px solid ${isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.2)"}`,
                borderRadius: "14px",
                overflow: "hidden",
                bgcolor: isDark ? "rgba(34,197,94,0.03)" : "rgba(34,197,94,0.02)",
              }}
            >
              <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.07)"}` }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TrendingUpIcon sx={{ fontSize: 16, color: "#22c55e" }} />
                  <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>
                    Top Foreign Bought
                  </Typography>
                </Stack>
              </Box>
              {loading ? (
                <Box sx={{ p: 2 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} height={36} sx={{ mb: 0.5 }} />
                  ))}
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.02)" }}>
                        {["#", "Stock", "Net Buy", "F.Buy", "F.Sell"].map((h, i) => (
                          <TableCell
                            key={i}
                            align={i > 1 ? "right" : "left"}
                            sx={{
                              fontFamily: '"Plus Jakarta Sans", sans-serif',
                              fontWeight: 600,
                              fontSize: "0.68rem",
                              color: "text.secondary",
                              py: 1,
                              px: 1.5,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.07)"}`,
                            }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topBought.map((s, idx) => (
                        <TableRow
                          key={s.stock_code}
                          onClick={() => router.push(`/stock/${s.stock_code}`)}
                          sx={{
                            cursor: "pointer",
                            "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)" },
                            "&:last-child td": { border: 0 },
                            "& td": { borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.04)"}` },
                          }}
                        >
                          <TableCell sx={{ py: 1, px: 1.5, width: 32 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem", color: "text.secondary" }}>
                              {idx + 1}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1, px: 1.5 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.78rem", color: accent }}>
                              {s.stock_code}
                            </Typography>
                            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.68rem", color: "text.secondary", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {s.stock_name}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 1.5 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", fontWeight: 700, color: "#22c55e" }}>
                              +{formatValue(s.net)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 1.5 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", color: "text.secondary" }}>
                              {formatValue(s.buy)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 1.5 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", color: "text.secondary" }}>
                              {formatValue(s.sell)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>

          {/* Top Sold */}
          <Box sx={{ flex: 1 }}>
            <Paper
              elevation={0}
              sx={{
                border: `1px solid ${isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.2)"}`,
                borderRadius: "14px",
                overflow: "hidden",
                bgcolor: isDark ? "rgba(239,68,68,0.03)" : "rgba(239,68,68,0.02)",
              }}
            >
              <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.07)"}` }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TrendingDownIcon sx={{ fontSize: 16, color: "#ef4444" }} />
                  <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>
                    Top Foreign Sold
                  </Typography>
                </Stack>
              </Box>
              {loading ? (
                <Box sx={{ p: 2 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} height={36} sx={{ mb: 0.5 }} />
                  ))}
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.02)" }}>
                        {["#", "Stock", "Net Sell", "F.Buy", "F.Sell"].map((h, i) => (
                          <TableCell
                            key={i}
                            align={i > 1 ? "right" : "left"}
                            sx={{
                              fontFamily: '"Plus Jakarta Sans", sans-serif',
                              fontWeight: 600,
                              fontSize: "0.68rem",
                              color: "text.secondary",
                              py: 1,
                              px: 1.5,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.07)"}`,
                            }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topSold.map((s, idx) => (
                        <TableRow
                          key={s.stock_code}
                          onClick={() => router.push(`/stock/${s.stock_code}`)}
                          sx={{
                            cursor: "pointer",
                            "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)" },
                            "&:last-child td": { border: 0 },
                            "& td": { borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.04)"}` },
                          }}
                        >
                          <TableCell sx={{ py: 1, px: 1.5, width: 32 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem", color: "text.secondary" }}>
                              {idx + 1}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1, px: 1.5 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.78rem", color: accent }}>
                              {s.stock_code}
                            </Typography>
                            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.68rem", color: "text.secondary", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {s.stock_name}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 1.5 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", fontWeight: 700, color: "#ef4444" }}>
                              {formatValue(s.net)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 1.5 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", color: "text.secondary" }}>
                              {formatValue(s.buy)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 1.5 }}>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", color: "text.secondary" }}>
                              {formatValue(s.sell)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
