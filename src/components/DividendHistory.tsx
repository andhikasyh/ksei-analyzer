"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { IDXDividend, formatRatio } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import PaymentsIcon from "@mui/icons-material/Payments";

interface DividendHistoryProps {
  stockCode: string;
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

const DIVIDEND_TYPE_MAP: Record<string, string> = {
  F: "Final",
  FINAL: "Final",
  I: "Interim",
  INTERIM: "Interim",
  S: "Special",
  SPECIAL: "Special",
  T: "Tentative",
  TENTATIVE: "Tentative",
  "STOCK DIVIDEND": "Stock Dividend",
  "CASH DIVIDEND": "Cash Dividend",
};

function dividendTypeLabel(note: string): string {
  if (!note) return "-";
  return DIVIDEND_TYPE_MAP[note.toUpperCase()] || note;
}

function dividendTypeKey(note: string): string {
  if (!note) return "";
  const upper = note.toUpperCase();
  if (upper === "F" || upper === "FINAL") return "F";
  if (upper === "I" || upper === "INTERIM") return "I";
  if (upper === "S" || upper === "SPECIAL") return "S";
  if (upper === "T" || upper === "TENTATIVE") return "T";
  if (upper.includes("STOCK")) return "STOCK";
  return "";
}

function dividendTypeColor(note: string, isDark: boolean) {
  const key = dividendTypeKey(note);
  const styles: Record<string, { bg: string; text: string }> = {
    F: {
      bg: isDark ? "rgba(212,168,67,0.15)" : "rgba(212,168,67,0.08)",
      text: "#d4a843",
    },
    I: {
      bg: isDark ? "rgba(96,165,250,0.15)" : "rgba(59,130,246,0.08)",
      text: isDark ? "#60a5fa" : "#3b82f6",
    },
    S: {
      bg: isDark ? "rgba(52,211,153,0.15)" : "rgba(5,150,105,0.08)",
      text: "#34d399",
    },
    STOCK: {
      bg: isDark ? "rgba(168,85,247,0.15)" : "rgba(139,92,246,0.08)",
      text: isDark ? "#a855f7" : "#8b5cf6",
    },
  };
  return styles[key] || {
    bg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    text: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
  };
}

export function DividendHistoryPanel({ stockCode }: DividendHistoryProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [dividends, setDividends] = useState<IDXDividend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from("idx_dividends")
        .select("*")
        .eq("code", stockCode)
        .order("ex_dividend", { ascending: false });
      if (!error && data) setDividends(data as IDXDividend[]);
      setLoading(false);
    }
    fetch();
  }, [stockCode]);

  const chartData = useMemo(() => {
    return [...dividends]
      .filter((d) => parseFloat(d.cash_dividend) > 1)
      .reverse()
      .map((d) => ({
        date: new Date(d.ex_dividend).toLocaleDateString("en-GB", {
          month: "short",
          year: "2-digit",
        }),
        dividend: parseFloat(d.cash_dividend) || 0,
        note: d.note,
      }));
  }, [dividends]);

  const totalDividend = useMemo(() => {
    return dividends.reduce((s, d) => s + (parseFloat(d.cash_dividend) || 0), 0);
  }, [dividends]);

  const textColor = isDark ? "#6b7fa3" : "#546280";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  if (loading) return <DividendSkeleton />;
  if (dividends.length === 0) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PaymentsIcon sx={{ fontSize: 18, color: "text.secondary", opacity: 0.6 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Dividend History
          </Typography>
        </Stack>
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No dividend records found for this stock.
          </Typography>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <PaymentsIcon sx={{ fontSize: 18, color: "text.secondary", opacity: 0.6 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Dividend History
        </Typography>
        <Chip
          label={`${dividends.length} records`}
          size="small"
          sx={{ fontSize: "0.7rem", height: 22, fontFamily: '"JetBrains Mono", monospace' }}
        />
      </Stack>

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 500, mb: 1.5, display: "block" }}
        >
          Cash Dividend per Share (IDR)
        </Typography>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 10 }} />
            <YAxis tick={{ fill: textColor, fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: isDark ? "#111b30" : "#fff",
                border: `1px solid ${isDark ? "rgba(107,127,163,0.15)" : "#e4e4e7"}`,
                borderRadius: "8px",
                fontSize: "12px",
                color: isDark ? "#e8edf5" : "#0c1222",
              }}
              formatter={(v: number) => [`IDR ${formatRatio(v)}`, "Dividend/Share"]}
            />
            <Bar dataKey="dividend" fill="#34d399" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ px: 2.5, pt: 2, pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
            Dividend Records
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
            Total: IDR {formatRatio(totalDividend)}
          </Typography>
        </Box>
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader sx={{ minWidth: 580 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Type</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>Amount (Rp)</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Cum Date</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Ex Date</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Record Date</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Payment Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dividends.map((d) => (
                <TableRow key={d.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                  <TableCell>
                    <Chip
                      label={dividendTypeLabel(d.note)}
                      size="small"
                      sx={{
                        fontSize: "0.6rem",
                        height: 18,
                        bgcolor: dividendTypeColor(d.note, isDark).bg,
                        color: dividendTypeColor(d.note, isDark).text,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: "#34d399", whiteSpace: "nowrap" }}>
                      {formatRatio(d.cash_dividend)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap" }}>
                      {fmtDate(d.cum_dividend)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap" }}>
                      {fmtDate(d.ex_dividend)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "text.secondary", whiteSpace: "nowrap" }}>
                      {fmtDate(d.record_date)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "text.secondary", whiteSpace: "nowrap" }}>
                      {fmtDate(d.payment_date)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}

function DividendSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton width={180} height={24} />
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width={200} height={14} sx={{ mb: 1.5 }} />
        <Skeleton variant="rounded" height={260} sx={{ borderRadius: 2 }} />
      </Paper>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width={140} height={14} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
      </Paper>
    </Stack>
  );
}
