"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { IDXFinancialRatio, formatBillion, formatRatio } from "@/lib/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TimelineIcon from "@mui/icons-material/Timeline";

interface FinancialTrendsProps {
  stockCode: string;
}

function useChartColors(isDark: boolean) {
  return {
    text: isDark ? "#737373" : "#737373",
    grid: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    bg: isDark ? "#141414" : "#f0eeeb",
    border: isDark ? "rgba(107,127,163,0.15)" : "#e4e4e7",
  };
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", fontWeight: 500, mb: 1.5, display: "block" }}
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

export function FinancialTrendsPanel({ stockCode }: FinancialTrendsProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useChartColors(isDark);
  const [records, setRecords] = useState<IDXFinancialRatio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from("idx_financial_ratios")
        .select("*")
        .eq("code", stockCode)
        .order("fs_date", { ascending: true });
      if (!error && data) setRecords(data as IDXFinancialRatio[]);
      setLoading(false);
    }
    fetch();
  }, [stockCode]);

  const chartData = useMemo(() => {
    return records.map((r) => ({
      period: new Date(r.fs_date).toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
      }),
      assets: parseFloat(r.assets) || 0,
      liabilities: parseFloat(r.liabilities) || 0,
      equity: parseFloat(r.equity) || 0,
      sales: parseFloat(r.sales) || 0,
      profit: parseFloat(r.profit_period) || 0,
      roe: parseFloat(r.roe) || 0,
      roa: parseFloat(r.roa) || 0,
      npm: parseFloat(r.npm) || 0,
      per: parseFloat(r.per) || 0,
      eps: parseFloat(r.eps) || 0,
      de_ratio: parseFloat(r.de_ratio) || 0,
      price_bv: parseFloat(r.price_bv) || 0,
    }));
  }, [records]);

  if (loading) return <FinancialTrendsSkeleton />;
  if (chartData.length < 2) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TimelineIcon sx={{ fontSize: 18, color: "text.secondary", opacity: 0.6 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Financial Trends
          </Typography>
        </Stack>
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Not enough financial data to show trends for this stock.
          </Typography>
        </Paper>
      </Stack>
    );
  }

  const tooltipStyle = {
    contentStyle: {
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: "8px",
      fontSize: "12px",
      color: isDark ? "#e8edf5" : "#0c1222",
    },
    labelStyle: { color: isDark ? "#e8edf5" : "#0c1222", fontWeight: 600 },
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <TimelineIcon sx={{ fontSize: 18, color: "text.secondary", opacity: 0.6 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Financial Trends
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {chartData.length} periods
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Assets / Liabilities / Equity (Billion IDR)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="period" tick={{ fill: colors.text, fontSize: 10 }} />
                <YAxis
                  tick={{ fill: colors.text, fontSize: 10 }}
                  tickFormatter={(v) => formatBillion(v)}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number, name: string) => [formatBillion(v), name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={8} />
                <Bar dataKey="assets" name="Assets" fill="#c9a227" radius={[2, 2, 0, 0]} />
                <Bar dataKey="liabilities" name="Liabilities" fill="#fb7185" radius={[2, 2, 0, 0]} opacity={0.7} />
                <Bar dataKey="equity" name="Equity" fill="#34d399" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Revenue / Profit (Billion IDR)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="period" tick={{ fill: colors.text, fontSize: 10 }} />
                <YAxis
                  tick={{ fill: colors.text, fontSize: 10 }}
                  tickFormatter={(v) => formatBillion(v)}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number, name: string) => [formatBillion(v), name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={8} />
                <Bar dataKey="sales" name="Revenue" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="profit" name="Net Profit" fill="#06b6d4" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Profitability Ratios (%)">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="period" tick={{ fill: colors.text, fontSize: 10 }} />
                <YAxis tick={{ fill: colors.text, fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={8} />
                <Line type="monotone" dataKey="roe" name="ROE" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="roa" name="ROA" stroke="#c9a227" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="npm" name="NPM" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Valuation (P/E, P/BV, D/E)">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="period" tick={{ fill: colors.text, fontSize: 10 }} />
                <YAxis tick={{ fill: colors.text, fontSize: 10 }} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number, name: string) => [v.toFixed(2), name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={8} />
                <Line type="monotone" dataKey="per" name="P/E" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="price_bv" name="P/BV" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="de_ratio" name="D/E" stroke="#fb7185" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <ChartCard title="Earnings Per Share (EPS)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="period" tick={{ fill: colors.text, fontSize: 10 }} />
                <YAxis tick={{ fill: colors.text, fontSize: 10 }} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number) => [formatRatio(v), "EPS"]}
                />
                <Bar dataKey="eps" name="EPS" fill="#14b8a6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Stack>
  );
}

function FinancialTrendsSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton width={200} height={24} />
      <Grid container spacing={2}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid size={{ xs: 12, lg: 6 }} key={i}>
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Skeleton width={180} height={14} sx={{ mb: 1.5 }} />
              <Skeleton variant="rounded" height={260} sx={{ borderRadius: 2 }} />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
