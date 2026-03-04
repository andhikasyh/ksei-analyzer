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
import Grid from "@mui/material/Grid";
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

export function DividendHistoryPanel({ stockCode }: DividendHistoryProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [dividends, setDividends] = useState<IDXDividend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from("idx_dividendends")
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

  const textColor = isDark ? "#a1a1aa" : "#71717a";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  if (loading) return <DividendSkeleton />;
  if (dividends.length === 0) return null;

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
          sx={{ fontSize: "0.7rem", height: 22, fontFamily: "monospace" }}
        />
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
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
                    background: isDark ? "#27272a" : "#fff",
                    border: `1px solid ${isDark ? "#3f3f46" : "#e4e4e7"}`,
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: isDark ? "#fafafa" : "#09090b",
                  }}
                  formatter={(v: number) => [`IDR ${formatRatio(v)}`, "Dividend/Share"]}
                />
                <Bar dataKey="dividend" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ borderRadius: 3, overflow: "hidden", height: "100%" }}>
            <Box sx={{ px: 2.5, pt: 2, pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                Payment Records
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                Total: IDR {formatRatio(totalDividend)}
              </Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 280 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Ex-Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dividends.map((d) => (
                    <TableRow key={d.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                          {new Date(d.ex_dividend).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600, color: "#22c55e" }}>
                          {formatRatio(d.cash_dividend)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                          {new Date(d.payment_date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={d.note === "F" ? "Final" : d.note || "-"}
                          size="small"
                          sx={{
                            fontSize: "0.6rem",
                            height: 18,
                            bgcolor: d.note === "F"
                              ? isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.08)"
                              : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                            color: d.note === "F" ? "#3b82f6" : "text.secondary",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}

function DividendSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton width={180} height={24} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Skeleton width={200} height={14} sx={{ mb: 1.5 }} />
            <Skeleton variant="rounded" height={260} sx={{ borderRadius: 2 }} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Skeleton width={140} height={14} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={260} sx={{ borderRadius: 2 }} />
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
