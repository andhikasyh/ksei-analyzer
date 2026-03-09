"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { IDXDividend, formatValue } from "@/lib/types";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SearchIcon from "@mui/icons-material/Search";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import EventIcon from "@mui/icons-material/Event";
import Link from "next/link";

interface DividendRow extends IDXDividend {
  close: number;
  yieldPct: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function DividendsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = isDark ? "#c9a227" : "#c9a227";
  const router = useRouter();

  const now = new Date();
  const [dividends, setDividends] = useState<DividendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [minYield, setMinYield] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      const { data: divs } = await supabase
        .from("idx_dividends")
        .select("*")
        .order("ex_dividend", { ascending: false })
        .limit(500);

      if (!divs) { setLoading(false); return; }

      const codes = [...new Set(divs.map((d) => d.code))];

      const { data: dateRow } = await supabase
        .from("idx_stock_summary")
        .select("date")
        .order("date", { ascending: false })
        .limit(1)
        .single();

      const latestDate = dateRow?.date ?? "";

      const { data: summaries } = await supabase
        .from("idx_stock_summary")
        .select("stock_code,close")
        .eq("date", latestDate)
        .in("stock_code", codes);

      const priceMap: Record<string, number> = {};
      (summaries ?? []).forEach((s) => { priceMap[s.stock_code] = parseFloat(s.close) || 0; });

      const rows: DividendRow[] = divs.map((d) => {
        const close = priceMap[d.code] ?? 0;
        const cashDiv = parseFloat(d.cash_dividend) || 0;
        const yieldPct = close > 0 ? (cashDiv / close) * 100 : 0;
        return { ...d, close, yieldPct };
      });

      setDividends(rows);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return dividends.filter((d) => {
      if (minYield > 0 && d.yieldPct < minYield) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!d.code.toLowerCase().includes(q) && !d.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [dividends, minYield, search]);

  // Calendar: group ex-dividend dates by day for the current month
  const calendarMap = useMemo(() => {
    const map: Record<number, DividendRow[]> = {};
    dividends.forEach((d) => {
      if (!d.ex_dividend) return;
      const dt = new Date(d.ex_dividend);
      if (dt.getFullYear() === calYear && dt.getMonth() === calMonth) {
        const day = dt.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(d);
      }
    });
    return map;
  }, [dividends, calYear, calMonth]);

  const totalDividendValue = useMemo(
    () => filtered.reduce((s, d) => s + (parseFloat(d.cash_dividend) || 0), 0),
    [filtered]
  );

  const avgYield = useMemo(() => {
    const valid = filtered.filter((d) => d.yieldPct > 0);
    if (valid.length === 0) return 0;
    return valid.reduce((s, d) => s + d.yieldPct, 0) / valid.length;
  }, [filtered]);

  const yieldColor = (y: number) => {
    if (y >= 5) return "#22c55e";
    if (y >= 2) return "#f59e0b";
    return "text.secondary";
  };

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calCells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );
  // Pad to full weeks
  while (calCells.length % 7 !== 0) calCells.push(null);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#050505" : "#e8e6e3", pt: { xs: 3, md: 4 }, pb: 6 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>

        {/* Header */}
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
          <Box>
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
              Dividend Calendar
            </Typography>
            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.secondary", mt: 0.5 }}>
              {filtered.length} dividend events — ex-dividend dates and yields
            </Typography>
          </Box>

          {/* View toggle */}
          <Box sx={{ display: "flex", bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", borderRadius: "10px", p: 0.5, gap: 0.5 }}>
            {([
              { v: "list" as const, icon: <ListAltIcon sx={{ fontSize: 15 }} />, label: "List" },
              { v: "calendar" as const, icon: <CalendarTodayIcon sx={{ fontSize: 15 }} />, label: "Calendar" },
            ]).map(({ v, icon, label }) => (
              <Box
                key={v}
                onClick={() => setViewMode(v)}
                sx={{
                  px: 1.75,
                  py: 0.75,
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  bgcolor: viewMode === v ? isDark ? "rgba(212,168,67,0.12)" : "rgba(161,124,47,0.1)" : "transparent",
                  border: `1px solid ${viewMode === v ? isDark ? "rgba(212,168,67,0.25)" : "rgba(161,124,47,0.2)" : "transparent"}`,
                  transition: "all 0.15s ease",
                }}
              >
                <Box sx={{ color: viewMode === v ? accent : "text.secondary" }}>{icon}</Box>
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem", fontWeight: viewMode === v ? 700 : 500, color: viewMode === v ? accent : "text.secondary" }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Stack>

        {/* Summary Cards */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Total Events", value: filtered.length.toString(), sub: "filtered results", icon: <EventIcon sx={{ fontSize: 18 }} /> },
            { label: "Avg Yield", value: avgYield > 0 ? avgYield.toFixed(2) + "%" : "-", sub: "of shown results", icon: <MonetizationOnIcon sx={{ fontSize: 18 }} /> },
            { label: "High Yield (5%+)", value: filtered.filter((d) => d.yieldPct >= 5).length.toString(), sub: "above 5% yield", icon: <TrendingUpIcon sx={{ fontSize: 18 }} /> },
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
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box sx={{ color: accent, opacity: 0.7 }}>{card.icon}</Box>
              <Box>
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.7rem", color: "text.secondary", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>
                  {card.label}
                </Typography>
                <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: "1.35rem", color: "text.primary", letterSpacing: "-0.02em" }}>
                  {card.value}
                </Typography>
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.7rem", color: "text.secondary" }}>
                  {card.sub}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Stack>

        {/* Filters */}
        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
            borderRadius: "14px",
            p: 2.5,
            mb: 3,
            bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#f5f4f1",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "stretch", sm: "center" }}>
            <TextField
              size="small"
              placeholder="Search stock..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                flex: 1,
                maxWidth: { sm: 260 },
                "& .MuiOutlinedInput-root": {
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  fontSize: "0.82rem",
                  "& fieldset": { borderColor: isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.12)" },
                },
              }}
            />
            <Box sx={{ flex: 1, maxWidth: { sm: 300 } }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary", fontWeight: 600 }}>
                  Min Yield
                </Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.72rem", color: accent, fontWeight: 700 }}>
                  {minYield}%
                </Typography>
              </Stack>
              <Slider
                value={minYield}
                onChange={(_, v) => setMinYield(v as number)}
                min={0}
                max={15}
                step={0.5}
                size="small"
                sx={{
                  color: accent,
                  "& .MuiSlider-thumb": { width: 14, height: 14 },
                }}
              />
            </Box>
            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.75rem", color: "text.secondary" }}>
              Showing {filtered.length} of {dividends.length} events
            </Typography>
          </Stack>
        </Paper>

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
              borderRadius: "14px",
              overflow: "hidden",
              bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#f5f4f1",
            }}
          >
            {/* Month navigation */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.07)"}` }}>
              <Box
                onClick={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
                  else setCalMonth((m) => m - 1);
                }}
                sx={{ cursor: "pointer", color: "text.secondary", "&:hover": { color: "text.primary" }, px: 1, py: 0.5, borderRadius: "6px", fontSize: "0.85rem", fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 }}
              >
                &larr;
              </Box>
              <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
                {FULL_MONTH_NAMES[calMonth]} {calYear}
              </Typography>
              <Box
                onClick={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
                  else setCalMonth((m) => m + 1);
                }}
                sx={{ cursor: "pointer", color: "text.secondary", "&:hover": { color: "text.primary" }, px: 1, py: 0.5, borderRadius: "6px", fontSize: "0.85rem", fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 }}
              >
                &rarr;
              </Box>
            </Stack>

            {/* Day headers */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.06)"}` }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <Box key={d} sx={{ p: 1, textAlign: "center" }}>
                  <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.68rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.03em" }}>
                    {d}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Calendar cells */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {calCells.map((day, idx) => {
                const divs = day ? (calendarMap[day] ?? []) : [];
                const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
                return (
                  <Box
                    key={idx}
                    sx={{
                      minHeight: 80,
                      p: 0.75,
                      borderRight: (idx + 1) % 7 !== 0 ? `1px solid ${isDark ? "rgba(107,127,163,0.07)" : "rgba(12,18,34,0.05)"}` : "none",
                      borderBottom: idx < calCells.length - 7 ? `1px solid ${isDark ? "rgba(107,127,163,0.07)" : "rgba(12,18,34,0.05)"}` : "none",
                      bgcolor: isToday ? isDark ? "rgba(212,168,67,0.05)" : "rgba(161,124,47,0.04)" : "transparent",
                    }}
                  >
                    {day && (
                      <>
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.72rem",
                            fontWeight: isToday ? 800 : 500,
                            color: isToday ? accent : "text.secondary",
                            mb: 0.5,
                          }}
                        >
                          {day}
                        </Typography>
                        {divs.slice(0, 3).map((d) => (
                          <Tooltip
                            key={d.id}
                            title={`${d.code} — Div: ${d.cash_dividend} | Yield: ${d.yieldPct.toFixed(2)}%`}
                            arrow
                          >
                            <Box
                              component={Link}
                              href={`/stock/${d.code}`}
                              sx={{
                                display: "block",
                                px: 0.5,
                                py: 0.2,
                                mb: 0.3,
                                borderRadius: "4px",
                                bgcolor: isDark ? "rgba(212,168,67,0.12)" : "rgba(161,124,47,0.1)",
                                textDecoration: "none",
                                "&:hover": { bgcolor: isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.18)" },
                              }}
                            >
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", fontWeight: 700, color: accent, lineHeight: 1.3 }}>
                                {d.code}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ))}
                        {divs.length > 3 && (
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.6rem", color: "text.secondary" }}>
                            +{divs.length - 3} more
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Paper>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            {loading ? (
              <Box sx={{ p: 2 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} height={48} sx={{ mb: 0.75 }} />
                ))}
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)" }}>
                      {["Stock", "Name", "Dividend", "Ex-Date", "Cum-Date", "Payment", "Price", "Yield", "Note"].map((h, i) => (
                        <TableCell
                          key={i}
                          align={i >= 2 ? "right" : "left"}
                          sx={{
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            fontWeight: 600,
                            fontSize: "0.7rem",
                            color: "text.secondary",
                            py: 1.25,
                            px: 2,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
                          }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((d) => (
                      <TableRow
                        key={d.id}
                        onClick={() => router.push(`/stock/${d.code}`)}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)" },
                          "&:last-child td": { border: 0 },
                          "& td": { borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.07)" : "rgba(12,18,34,0.05)"}` },
                        }}
                      >
                        <TableCell sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.8rem", color: accent }}>
                            {d.code}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.25, px: 2, maxWidth: 160 }}>
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.75rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {d.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", fontWeight: 600, color: "text.primary" }}>
                            {d.currency} {parseFloat(d.cash_dividend).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", color: "text.secondary" }}>
                            {d.ex_dividend || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", color: "text.secondary" }}>
                            {d.cum_dividend || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", color: "text.secondary" }}>
                            {d.payment_date || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", color: "text.secondary" }}>
                            {d.close > 0 ? d.close.toLocaleString() : "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          {d.yieldPct > 0 ? (
                            <Chip
                              label={d.yieldPct.toFixed(2) + "%"}
                              size="small"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                height: 20,
                                bgcolor: d.yieldPct >= 5
                                  ? isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.1)"
                                  : d.yieldPct >= 2
                                    ? isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)"
                                    : isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.06)",
                                color: d.yieldPct >= 5 ? "#22c55e" : d.yieldPct >= 2 ? "#f59e0b" : "text.secondary",
                                border: "none",
                              }}
                            />
                          ) : (
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", color: "text.secondary" }}>-</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1.25, px: 2, maxWidth: 120 }}>
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.68rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {d.note || "-"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
      </Container>
    </Box>
  );
}

function TrendingUpIcon({ sx }: { sx?: any }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={sx}>
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
    </svg>
  );
}
