"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { useWatchlist } from "@/lib/watchlist";
import { IDXFinancialRatio, formatValue, formatRatio } from "@/lib/types";
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
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import StarIcon from "@mui/icons-material/Star";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import Link from "next/link";

interface WatchlistRow extends IDXFinancialRatio {
  close: number;
  change_pct: number;
  volume: number;
  daily_value: number;
  foreign_net: number;
  score: number;
}

interface StockOption {
  code: string;
  name: string;
}

export default function WatchlistPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = isDark ? "#d4a843" : "#a17c2f";
  const router = useRouter();
  const { watchlist, removeStock, isWatched, addStock } = useWatchlist();

  const [rows, setRows] = useState<WatchlistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [latestDate, setLatestDate] = useState<string>("");
  const [allOptions, setAllOptions] = useState<StockOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const codes = useMemo(() => watchlist.map((e) => e.code), [watchlist]);

  // Load all stock options for search
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

  // Fetch data for watchlist stocks
  useEffect(() => {
    if (codes.length === 0) {
      setRows([]);
      return;
    }
    setLoading(true);

    async function fetchData() {
      const [{ data: ratios }, { data: dateRow }] = await Promise.all([
        supabase
          .from("idx_financial_ratios")
          .select("*")
          .in("code", codes)
          .order("fs_date", { ascending: false }),
        supabase
          .from("idx_stock_summary")
          .select("date")
          .order("date", { ascending: false })
          .limit(1)
          .single(),
      ]);

      const date = dateRow?.date ?? "";
      setLatestDate(date);

      const { data: summaries } = await supabase
        .from("idx_stock_summary")
        .select("stock_code,close,change,volume,value,foreign_buy,foreign_sell,listed_shares")
        .eq("date", date)
        .in("stock_code", codes);

      const sumMap: Record<string, any> = {};
      (summaries ?? []).forEach((s) => { sumMap[s.stock_code] = s; });

      // Deduplicate ratios by code (keep first = most recent fs_date)
      const seen = new Set<string>();
      const dedupedRatios = (ratios ?? []).filter((r: any) => {
        if (seen.has(r.code)) return false;
        seen.add(r.code);
        return true;
      });

      const built: WatchlistRow[] = dedupedRatios.map((r: IDXFinancialRatio) => {
        const s = sumMap[r.code] ?? {};
        const close = parseFloat(s.close) || 0;
        const previous = close - (parseFloat(s.change) || 0);
        const change_pct = previous > 0 ? ((close - previous) / previous) * 100 : 0;
        return {
          ...r,
          close,
          change_pct,
          volume: parseFloat(s.volume) || 0,
          daily_value: parseFloat(s.value) || 0,
          foreign_net: (parseFloat(s.foreign_buy) || 0) - (parseFloat(s.foreign_sell) || 0),
          score: computeFinancialScore(r),
        };
      });

      // Preserve watchlist order
      built.sort((a, b) => codes.indexOf(a.code) - codes.indexOf(b.code));
      setRows(built);
      setLoading(false);
    }

    fetchData();
  }, [codes]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.toUpperCase().trim();
    const notAdded = allOptions.filter((o) => !isWatched(o.code));
    if (!q) return notAdded.slice(0, 8);
    return notAdded
      .filter((o) => o.code.includes(q) || o.name.toUpperCase().includes(q))
      .slice(0, 10);
  }, [searchQuery, allOptions, isWatched]);

  const scoreColor = (s: number) => {
    if (s >= 70) return "#22c55e";
    if (s >= 45) return "#f59e0b";
    return "#ef4444";
  };

  const headerCell = (label: string, i: number) => (
    <TableCell
      key={i}
      align={i > 1 && i < 10 ? "right" : "left"}
      sx={{
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontWeight: 600,
        fontSize: "0.68rem",
        color: "text.secondary",
        py: 1.25,
        px: i === 0 || i === 10 ? 1.5 : 2,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </TableCell>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#060a14" : "#f5f7fa", pt: { xs: 3, md: 4 }, pb: 6 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>

        {/* Header */}
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: { xs: "1.6rem", md: "2rem" }, color: "text.primary", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Watchlist
            </Typography>
            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.secondary", mt: 0.5 }}>
              {codes.length} stock{codes.length !== 1 ? "s" : ""} saved
              {latestDate ? ` — data as of ${latestDate}` : ""}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Add stock button/search */}
            {addOpen ? (
              <ClickAwayListener onClickAway={() => { setAddOpen(false); setSearchQuery(""); }}>
                <Box sx={{ position: "relative" }}>
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
                      width: 230,
                      "& .MuiOutlinedInput-root": {
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        fontSize: "0.82rem",
                        borderRadius: "9px",
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
                            addStock(opt.code);
                            setSearchQuery("");
                            setAddOpen(false);
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
                            "&:hover": { bgcolor: isDark ? "rgba(212,168,67,0.08)" : "rgba(161,124,47,0.06)" },
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
                    <Paper elevation={4} sx={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 1400, borderRadius: "10px", px: 2, py: 1.5, bgcolor: isDark ? "#0d1425" : "#fff", border: `1px solid ${isDark ? "rgba(107,127,163,0.15)" : "rgba(12,18,34,0.08)"}` }}>
                      <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.78rem", color: "text.secondary" }}>
                        No results for "{searchQuery}"
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </ClickAwayListener>
            ) : (
              <Button
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={() => setAddOpen(true)}
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: accent,
                  border: `1px solid ${isDark ? "rgba(212,168,67,0.25)" : "rgba(161,124,47,0.2)"}`,
                  borderRadius: "8px",
                  px: 2,
                  py: 0.75,
                  bgcolor: isDark ? "rgba(212,168,67,0.05)" : "rgba(161,124,47,0.04)",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  "&:hover": { bgcolor: isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.08)" },
                }}
              >
                Add Stock
              </Button>
            )}

            <Button
              component={Link}
              href="/screener"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
              sx={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "text.secondary",
                border: `1px solid ${isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.1)"}`,
                borderRadius: "8px",
                px: 2,
                py: 0.75,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                "&:hover": { color: "text.primary", borderColor: isDark ? "rgba(107,127,163,0.35)" : "rgba(12,18,34,0.2)" },
              }}
            >
              Screener
            </Button>
          </Stack>
        </Stack>

        {/* Empty State */}
        {!loading && codes.length === 0 && (
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
            <BookmarkBorderIcon sx={{ fontSize: 48, color: isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.18)", mb: 2 }} />
            <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1.1rem", color: "text.primary", mb: 1 }}>
              Your watchlist is empty
            </Typography>
            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.secondary", mb: 3, maxWidth: 380, mx: "auto" }}>
              Click <strong>Add Stock</strong> above to search and add stocks, or star any stock from its detail page or the Screener.
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setAddOpen(true)}
              sx={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: accent,
                border: `1px solid ${isDark ? "rgba(212,168,67,0.3)" : "rgba(161,124,47,0.25)"}`,
                borderRadius: "8px",
                px: 2.5,
                py: 1,
                bgcolor: isDark ? "rgba(212,168,67,0.06)" : "rgba(161,124,47,0.05)",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                "&:hover": { bgcolor: isDark ? "rgba(212,168,67,0.12)" : "rgba(161,124,47,0.1)" },
              }}
            >
              Add Stock
            </Button>
          </Paper>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <Paper elevation={0} sx={{ border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`, borderRadius: "14px", overflow: "hidden" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} sx={{ display: "flex", gap: 2, px: 3, py: 1.75, borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.05)"}` }}>
                <Skeleton variant="text" width={60} height={20} />
                <Skeleton variant="text" width={140} height={20} />
                <Skeleton variant="text" width={80} height={20} sx={{ ml: "auto" }} />
                <Skeleton variant="text" width={60} height={20} />
                <Skeleton variant="text" width={60} height={20} />
              </Box>
            ))}
          </Paper>
        )}

        {/* Table */}
        {!loading && rows.length > 0 && (
          <Paper elevation={0} sx={{ border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`, borderRadius: "14px", overflow: "hidden" }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)" }}>
                    {["", "Stock", "Price", "Change", "Volume", "Value", "Foreign Net", "PER", "ROE", "Score", ""].map(headerCell)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const isUp = row.change_pct >= 0;
                    const changeColor = row.change_pct === 0 ? "text.secondary" : isUp ? "#22c55e" : "#ef4444";
                    return (
                      <TableRow
                        key={row.code}
                        onClick={() => router.push(`/stock/${row.code}`)}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)" },
                          "&:last-child td": { border: 0 },
                          "& td": { borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.07)" : "rgba(12,18,34,0.05)"}` },
                        }}
                      >
                        {/* Star remove */}
                        <TableCell sx={{ px: 1.5, py: 1.25, width: 40 }}>
                          <Tooltip title="Remove from watchlist" arrow>
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); removeStock(row.code); }}
                              sx={{ color: accent, p: 0.5, "&:hover": { color: "#ef4444" } }}
                            >
                              <StarIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>

                        {/* Stock */}
                        <TableCell sx={{ py: 1.25, px: 2, minWidth: 160 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.8rem", color: accent }}>
                            {row.code}
                          </Typography>
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary", mt: 0.1, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.stock_name}
                          </Typography>
                        </TableCell>

                        {/* Price */}
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.82rem", color: "text.primary" }}>
                            {row.close > 0 ? row.close.toLocaleString() : "-"}
                          </Typography>
                        </TableCell>

                        {/* Change */}
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                            {row.change_pct !== 0 && (
                              isUp
                                ? <TrendingUpIcon sx={{ fontSize: 13, color: changeColor }} />
                                : <TrendingDownIcon sx={{ fontSize: 13, color: changeColor }} />
                            )}
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", fontWeight: 600, color: changeColor }}>
                              {row.change_pct >= 0 ? "+" : ""}{row.change_pct.toFixed(2)}%
                            </Typography>
                          </Stack>
                        </TableCell>

                        {/* Volume */}
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", color: "text.secondary" }}>
                            {row.volume > 0 ? formatValue(row.volume) : "-"}
                          </Typography>
                        </TableCell>

                        {/* Value */}
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", color: "text.secondary" }}>
                            {row.daily_value > 0 ? formatValue(row.daily_value) : "-"}
                          </Typography>
                        </TableCell>

                        {/* Foreign Net */}
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", color: row.foreign_net >= 0 ? "#22c55e" : "#ef4444" }}>
                            {row.foreign_net !== 0 ? (row.foreign_net >= 0 ? "+" : "") + formatValue(row.foreign_net) : "-"}
                          </Typography>
                        </TableCell>

                        {/* PER */}
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", color: "text.secondary" }}>
                            {row.per ? formatRatio(row.per) + "x" : "-"}
                          </Typography>
                        </TableCell>

                        {/* ROE */}
                        <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", color: "text.secondary" }}>
                            {row.roe ? formatRatio(row.roe) + "%" : "-"}
                          </Typography>
                        </TableCell>

                        {/* Score */}
                        <TableCell align="right" sx={{ py: 1.25, px: 2, minWidth: 90 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "flex-end" }}>
                            <Box sx={{ width: 44, height: 5, borderRadius: 3, bgcolor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", overflow: "hidden" }}>
                              <Box sx={{ height: "100%", width: `${row.score}%`, bgcolor: scoreColor(row.score), borderRadius: 3 }} />
                            </Box>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", fontWeight: 700, color: scoreColor(row.score), minWidth: 24, textAlign: "right" }}>
                              {row.score}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Open link */}
                        <TableCell sx={{ px: 1.5, py: 1.25, width: 40 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); window.open(`/stock/${row.code}`, "_blank"); }}
                            sx={{ color: "text.secondary", p: 0.5, "&:hover": { color: "text.primary" } }}
                          >
                            <OpenInNewIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
