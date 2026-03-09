"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import {
  IDXFinancialRatio,
  formatValue,
  formatBillion,
  formatRatio,
} from "@/lib/types";
import { computeFinancialScore } from "@/lib/scoring";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import Link from "next/link";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

interface CompareStock {
  code: string;
  stock_name: string;
  sector: string;
  close: number;
  change_pct: number;
  volume: number;
  daily_value: number;
  market_cap: number;
  foreign_net: number;
  per: number;
  pbv: number;
  roe: number;
  roa: number;
  npm: number;
  de_ratio: number;
  eps: number;
  score: number;
}

interface StockOption {
  code: string;
  name: string;
}

const STOCK_COLORS = ["#d4a843", "#3b82f6", "#22c55e", "#f97316", "#a78bfa"];

const METRICS = [
  { key: "close", label: "Price", format: (v: number) => v.toLocaleString(), unit: "IDR" },
  { key: "change_pct", label: "Change", format: (v: number) => (v >= 0 ? "+" : "") + v.toFixed(2) + "%", unit: "%" },
  { key: "market_cap", label: "Market Cap", format: (v: number) => formatBillion(v / 1e9), unit: "IDR" },
  { key: "volume", label: "Volume", format: (v: number) => formatValue(v), unit: "shares" },
  { key: "daily_value", label: "Daily Value", format: (v: number) => formatValue(v), unit: "IDR" },
  { key: "foreign_net", label: "Foreign Net", format: (v: number) => (v >= 0 ? "+" : "") + formatValue(v), unit: "IDR" },
  { key: "per", label: "PER", format: (v: number) => v > 0 ? formatRatio(v) + "x" : "-", unit: "x" },
  { key: "pbv", label: "PBV", format: (v: number) => v > 0 ? formatRatio(v) + "x" : "-", unit: "x" },
  { key: "roe", label: "ROE", format: (v: number) => formatRatio(v) + "%", unit: "%" },
  { key: "roa", label: "ROA", format: (v: number) => formatRatio(v) + "%", unit: "%" },
  { key: "npm", label: "Net Profit Margin", format: (v: number) => formatRatio(v) + "%", unit: "%" },
  { key: "de_ratio", label: "D/E Ratio", format: (v: number) => v > 0 ? formatRatio(v) + "x" : "-", unit: "x" },
  { key: "eps", label: "EPS", format: (v: number) => v > 0 ? v.toLocaleString() : "-", unit: "IDR" },
  { key: "score", label: "Financial Score", format: (v: number) => v.toString(), unit: "/100" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

const RADAR_METRICS: { key: MetricKey; label: string; higherIsBetter: boolean; max: number }[] = [
  { key: "roe", label: "ROE", higherIsBetter: true, max: 40 },
  { key: "roa", label: "ROA", higherIsBetter: true, max: 20 },
  { key: "npm", label: "Margin", higherIsBetter: true, max: 50 },
  { key: "score", label: "Score", higherIsBetter: true, max: 100 },
  { key: "per", label: "PER (inv)", higherIsBetter: false, max: 60 },
  { key: "de_ratio", label: "D/E (inv)", higherIsBetter: false, max: 4 },
];

function normalizeRadar(value: number, max: number, higherIsBetter: boolean): number {
  const clamped = Math.max(0, Math.min(Math.abs(value), max));
  const normalized = (clamped / max) * 100;
  return higherIsBetter ? normalized : 100 - normalized;
}

function CompareContent() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = isDark ? "#d4a843" : "#a17c2f";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stocks, setStocks] = useState<CompareStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [allOptions, setAllOptions] = useState<StockOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const codesParam = searchParams.get("stocks") ?? "";
  const codes = useMemo(
    () => codesParam ? codesParam.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean).slice(0, 5) : [],
    [codesParam]
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return allOptions.filter((o) => !codes.includes(o.code)).slice(0, 8);
    const q = searchQuery.toUpperCase();
    return allOptions
      .filter((o) => !codes.includes(o.code) && (o.code.includes(q) || o.name.toUpperCase().includes(q)))
      .slice(0, 10);
  }, [searchQuery, allOptions, codes]);

  // Fetch all stock options for search
  useEffect(() => {
    async function fetchOptions() {
      const { data } = await supabase
        .from("idx_financial_ratios")
        .select("code,stock_name")
        .order("code", { ascending: true })
        .order("fs_date", { ascending: false });
      if (data) {
        // deduplicate by code — keep first occurrence (latest due to order)
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

  // Fetch stock data when codes change
  useEffect(() => {
    if (codes.length === 0) { setStocks([]); return; }
    setLoading(true);
    async function fetchStocks() {
      const [{ data: ratios }, { data: dateRow }] = await Promise.all([
        supabase.from("idx_financial_ratios").select("*").in("code", codes).order("fs_date", { ascending: false }),
        supabase.from("idx_stock_summary").select("date").order("date", { ascending: false }).limit(1).single(),
      ]);

      const latestDate = dateRow?.date ?? "";
      const { data: summaries } = await supabase
        .from("idx_stock_summary")
        .select("stock_code,close,change,volume,value,foreign_buy,foreign_sell,listed_shares")
        .eq("date", latestDate)
        .in("stock_code", codes);

      const sumMap: Record<string, any> = {};
      (summaries ?? []).forEach((s) => { sumMap[s.stock_code] = s; });

      const built: CompareStock[] = (ratios ?? []).map((r: IDXFinancialRatio) => {
        const s = sumMap[r.code] ?? {};
        const close = parseFloat(s.close) || 0;
        const previous = close - (parseFloat(s.change) || 0);
        const change_pct = previous > 0 ? ((close - previous) / previous) * 100 : 0;
        const listedShares = parseFloat(s.listed_shares) || 0;
        return {
          code: r.code,
          stock_name: r.stock_name,
          sector: r.sector,
          close,
          change_pct,
          volume: parseFloat(s.volume) || 0,
          daily_value: parseFloat(s.value) || 0,
          market_cap: close * listedShares,
          foreign_net: (parseFloat(s.foreign_buy) || 0) - (parseFloat(s.foreign_sell) || 0),
          per: parseFloat(r.per) || 0,
          pbv: parseFloat(r.price_bv) || 0,
          roe: parseFloat(r.roe) || 0,
          roa: parseFloat(r.roa) || 0,
          npm: parseFloat(r.npm) || 0,
          de_ratio: parseFloat(r.de_ratio) || 0,
          eps: parseFloat(r.eps) || 0,
          score: computeFinancialScore(r),
        };
      });

      // deduplicate by code, keep the row with most data (highest fs_date = first after sort)
      const seenCodes = new Set<string>();
      const deduped = built.filter((s) => {
        if (seenCodes.has(s.code)) return false;
        seenCodes.add(s.code);
        return true;
      });

      // preserve user-selected order
      deduped.sort((a, b) => codes.indexOf(a.code) - codes.indexOf(b.code));
      setStocks(deduped);
      setLoading(false);
    }
    fetchStocks();
  }, [codes]);

  const updateCodes = useCallback((newCodes: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newCodes.length > 0) params.set("stocks", newCodes.join(","));
    else params.delete("stocks");
    router.replace(`/compare?${params.toString()}`);
  }, [router, searchParams]);

  const removeCode = (code: string) => updateCodes(codes.filter((c) => c !== code));
  const addCode = (code: string) => {
    if (!codes.includes(code) && codes.length < 5) {
      updateCodes([...codes, code]);
    }
    setSearchQuery("");
    setAddOpen(false);
  };
  // Radar data
  const radarData = useMemo(() => {
    return RADAR_METRICS.map(({ key, label, higherIsBetter, max }) => {
      const point: Record<string, number | string> = { label };
      stocks.forEach((s) => {
        point[s.code] = normalizeRadar(s[key] as number, max, higherIsBetter);
      });
      return point;
    });
  }, [stocks]);

  const getBestWorst = (key: MetricKey, higherIsBetter: boolean) => {
    if (stocks.length < 2) return { best: "", worst: "" };
    const validStocks = stocks.filter((s) => {
      const v = s[key] as number;
      return v !== 0 && !isNaN(v);
    });
    if (validStocks.length === 0) return { best: "", worst: "" };
    const sorted = [...validStocks].sort((a, b) =>
      higherIsBetter
        ? (b[key] as number) - (a[key] as number)
        : (a[key] as number) - (b[key] as number)
    );
    return { best: sorted[0].code, worst: sorted[sorted.length - 1].code };
  };

  const metricHigherIsBetter: Partial<Record<MetricKey, boolean>> = {
    close: true, change_pct: true, market_cap: true, volume: true, daily_value: true,
    foreign_net: true, roe: true, roa: true, npm: true, score: true,
    per: false, pbv: false, de_ratio: false,
  };

  const scoreColor = (v: number) => {
    if (v >= 70) return "#22c55e";
    if (v >= 45) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#060a14" : "#f5f7fa", pt: { xs: 3, md: 4 }, pb: 6 }}>
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
            Stock Comparison
          </Typography>
          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.secondary", mt: 0.5 }}>
            Compare up to 5 stocks side-by-side — fundamentals, valuation, and price performance
          </Typography>
        </Box>

        {/* Stock selector row */}
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 3, flexWrap: "wrap", gap: 1.5 }}>
          {stocks.map((s, idx) => (
            <Paper
              key={s.code}
              elevation={0}
              sx={{
                border: `2px solid ${STOCK_COLORS[idx]}40`,
                borderRadius: "12px",
                px: 2,
                py: 1.25,
                bgcolor: isDark ? `${STOCK_COLORS[idx]}10` : `${STOCK_COLORS[idx]}08`,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                minWidth: 140,
              }}
            >
              <Box>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.85rem", color: STOCK_COLORS[idx] }}>
                  {s.code}
                </Typography>
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.68rem", color: "text.secondary", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.stock_name}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => removeCode(s.code)}
                sx={{ p: 0.3, color: "text.secondary", "&:hover": { color: "#ef4444" }, ml: "auto" }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Paper>
          ))}

          {codes.length < 5 && (
            addOpen ? (
              <ClickAwayListener onClickAway={() => { setAddOpen(false); setSearchQuery(""); }}>
                <Box sx={{ position: "relative", minWidth: 260 }}>
                  <TextField
                    autoFocus
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Code or name..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); setSearchQuery(""); }} sx={{ p: 0.3 }}>
                            <CloseIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                    sx={{
                      width: "100%",
                      "& .MuiOutlinedInput-root": {
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        fontSize: "0.82rem",
                        borderRadius: "10px",
                        "& fieldset": { borderColor: isDark ? "rgba(107,127,163,0.3)" : "rgba(12,18,34,0.18)" },
                        "&.Mui-focused fieldset": { borderColor: accent },
                      },
                    }}
                  />
                  {filteredOptions.length > 0 && (
                    <Paper
                      elevation={8}
                      sx={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        zIndex: 1400,
                        borderRadius: "10px",
                        border: `1px solid ${isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.1)"}`,
                        bgcolor: isDark ? "#0d1425" : "#fff",
                        overflow: "hidden",
                        boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.6)" : "0 8px 32px rgba(0,0,0,0.14)",
                      }}
                    >
                      {filteredOptions.map((opt, i) => (
                        <Box
                          key={opt.code}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addCode(opt.code);
                          }}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                            px: 2,
                            py: 0.9,
                            cursor: "pointer",
                            borderBottom: i < filteredOptions.length - 1
                              ? `1px solid ${isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.06)"}`
                              : "none",
                            "&:hover": {
                              bgcolor: isDark ? "rgba(212,168,67,0.08)" : "rgba(161,124,47,0.06)",
                            },
                          }}
                        >
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.8rem", color: accent, minWidth: 50, flexShrink: 0 }}>
                            {opt.code}
                          </Typography>
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.73rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {opt.name}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  )}
                  {filteredOptions.length === 0 && searchQuery.trim() && (
                    <Paper
                      elevation={4}
                      sx={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        zIndex: 1400,
                        borderRadius: "10px",
                        px: 2,
                        py: 1.5,
                        bgcolor: isDark ? "#0d1425" : "#fff",
                        border: `1px solid ${isDark ? "rgba(107,127,163,0.15)" : "rgba(12,18,34,0.08)"}`,
                      }}
                    >
                      <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem", color: "text.secondary" }}>
                        No results for "{searchQuery}"
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </ClickAwayListener>
            ) : (
              <Paper
                elevation={0}
                onClick={() => setAddOpen(true)}
                sx={{
                  border: `2px dashed ${isDark ? "rgba(107,127,163,0.25)" : "rgba(12,18,34,0.15)"}`,
                  borderRadius: "12px",
                  px: 2,
                  py: 1.25,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  bgcolor: "transparent",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    border: `2px dashed ${accent}`,
                    bgcolor: isDark ? "rgba(212,168,67,0.04)" : "rgba(161,124,47,0.03)",
                  },
                }}
              >
                <AddIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem", color: "text.secondary" }}>
                  Add stock {codes.length > 0 ? `(${5 - codes.length} left)` : ""}
                </Typography>
              </Paper>
            )
          )}
        </Stack>

        {/* Empty state */}
        {codes.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              border: `1px dashed ${isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.12)"}`,
              borderRadius: "16px",
              p: { xs: 5, md: 8 },
              textAlign: "center",
              bgcolor: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
            }}
          >
            <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1.1rem", color: "text.primary", mb: 1 }}>
              No stocks selected
            </Typography>
            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.secondary" }}>
              Add up to 5 stocks above to compare them side-by-side.
            </Typography>
          </Paper>
        )}

        {/* Loading */}
        {loading && codes.length > 0 && (
          <Stack spacing={1.5}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: "8px" }} />
            ))}
          </Stack>
        )}

        {/* Comparison content */}
        {!loading && stocks.length > 0 && (
          <Stack spacing={3}>
            {/* Radar chart */}
            <Paper
              elevation={0}
              sx={{
                border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
                borderRadius: "14px",
                p: { xs: 2, md: 3 },
                bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#fff",
              }}
            >
              <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1rem", color: "text.primary", mb: 2 }}>
                Fundamental Radar
              </Typography>
              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary", mb: 2 }}>
                Normalized scores — higher is better for all axes (PER and D/E are inverted)
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={isDark ? "rgba(107,127,163,0.15)" : "rgba(12,18,34,0.1)"} />
                  <PolarAngleAxis
                    dataKey="label"
                    tick={{
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      fontSize: 11,
                      fill: isDark ? "rgba(107,127,163,0.8)" : "rgba(12,18,34,0.55)",
                    }}
                  />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  {stocks.map((s, idx) => (
                    <Radar
                      key={s.code}
                      name={s.code}
                      dataKey={s.code}
                      stroke={STOCK_COLORS[idx]}
                      fill={STOCK_COLORS[idx]}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  ))}
                  <RechartsTooltip
                    contentStyle={{
                      background: isDark ? "#0d1425" : "#fff",
                      border: `1px solid ${isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.1)"}`,
                      borderRadius: "10px",
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>

            {/* Metrics table */}
            <Paper
              elevation={0}
              sx={{
                border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
                borderRadius: "14px",
                overflow: "hidden",
                bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#fff",
              }}
            >
              <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.07)"}` }}>
                <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
                  Side-by-Side Metrics
                </Typography>
              </Box>
              <Box sx={{ overflowX: "auto" }}>
                <Box
                  component="table"
                  sx={{
                    width: "100%",
                    borderCollapse: "collapse",
                    "& td, & th": {
                      px: 2.5,
                      py: 1.25,
                      borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.07)" : "rgba(12,18,34,0.05)"}`,
                      textAlign: "left",
                    },
                  }}
                >
                  <thead>
                    <tr style={{ background: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)" }}>
                      <th style={{ minWidth: 160 }}>
                        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600, fontSize: "0.7rem", color: "text.secondary", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          Metric
                        </Typography>
                      </th>
                      {stocks.map((s, idx) => (
                        <th key={s.code} style={{ minWidth: 120, textAlign: "right" }}>
                          <Typography
                            component={Link}
                            href={`/stock/${s.code}`}
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontWeight: 800,
                              fontSize: "0.82rem",
                              color: STOCK_COLORS[idx],
                              textDecoration: "none",
                              "&:hover": { textDecoration: "underline" },
                            }}
                          >
                            {s.code}
                          </Typography>
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.62rem", color: "text.secondary", display: "block" }}>
                            {s.sector}
                          </Typography>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS.map((metric) => {
                      const hib = metricHigherIsBetter[metric.key as MetricKey] ?? true;
                      const { best, worst } = getBestWorst(metric.key as MetricKey, hib);
                      return (
                        <tr key={metric.key}>
                          <td>
                            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem", color: "text.secondary", fontWeight: 500 }}>
                              {metric.label}
                            </Typography>
                          </td>
                          {stocks.map((s, idx) => {
                            const raw = s[metric.key as keyof CompareStock] as number;
                            const formatted = (metric.format as (v: number) => string)(raw);
                            const isBest = stocks.length > 1 && s.code === best;
                            const isWorst = stocks.length > 1 && s.code === worst;
                            return (
                              <td key={s.code} style={{ textAlign: "right" }}>
                                <Box
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    px: 1,
                                    py: 0.3,
                                    borderRadius: "6px",
                                    bgcolor: isBest
                                      ? isDark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)"
                                      : isWorst
                                        ? isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)"
                                        : "transparent",
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontFamily: '"JetBrains Mono", monospace',
                                      fontSize: "0.78rem",
                                      fontWeight: isBest || isWorst ? 700 : 500,
                                      color: isBest ? "#22c55e" : isWorst ? "#ef4444" : "text.primary",
                                    }}
                                  >
                                    {formatted}
                                  </Typography>
                                </Box>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </Box>
              </Box>
            </Paper>
          </Stack>
        )}
      </Container>
    </Box>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Skeleton variant="rectangular" width={400} height={200} sx={{ borderRadius: "14px" }} />
      </Box>
    }>
      <CompareContent />
    </Suspense>
  );
}
