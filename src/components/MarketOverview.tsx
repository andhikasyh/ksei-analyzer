"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { IDXStockSummary, formatValue, formatShares } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

interface MarketOverviewProps {
  stockCode: string;
}

function p(v: string): number {
  return parseFloat(v) || 0;
}

export function MarketOverviewPanel({ stockCode }: MarketOverviewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [records, setRecords] = useState<IDXStockSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from("idx_stock_summary")
        .select("*")
        .eq("stock_code", stockCode)
        .order("date", { ascending: false })
        .limit(30);
      if (!error && data) setRecords(data as IDXStockSummary[]);
      setLoading(false);
    }
    fetch();
  }, [stockCode]);

  const latest = records[0];

  const foreignFlowData = useMemo(() => {
    return [...records].reverse().map((r) => {
      const buy = p(r.foreign_buy);
      const sell = p(r.foreign_sell);
      return {
        date: new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        net: buy - sell,
        buy,
        sell,
      };
    });
  }, [records]);

  const textColor = isDark ? "#a1a1aa" : "#71717a";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  if (loading) return <MarketOverviewSkeleton />;
  if (!latest) return null;

  const close = p(latest.close);
  const change = p(latest.change);
  const prev = p(latest.previous);
  const changePct = prev > 0 ? (change / prev) * 100 : 0;
  const isUp = change >= 0;
  const changeColor = change > 0 ? "#22c55e" : change < 0 ? "#ef4444" : textColor;
  const foreignNet = p(latest.foreign_buy) - p(latest.foreign_sell);
  const foreignNetColor = foreignNet >= 0 ? "#22c55e" : "#ef4444";
  const marketCap = close * p(latest.listed_shares);

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <StorefrontIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }} />
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
            Market Data
          </Typography>
          <Chip
            label={new Date(latest.date).toLocaleDateString("en-GB", {
              day: "2-digit", month: "short", year: "numeric",
            })}
            size="small"
            sx={{
              fontSize: "0.65rem", height: 20,
              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            }}
          />
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr", md: "repeat(5, 1fr)" },
            gap: 1,
          }}
        >
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", gridColumn: { xs: "span 2", sm: "span 1" } }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Close
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "monospace", lineHeight: 1.2 }}>
              {close.toLocaleString()}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
              {isUp ? (
                <TrendingUpIcon sx={{ fontSize: 13, color: changeColor }} />
              ) : (
                <TrendingDownIcon sx={{ fontSize: 13, color: changeColor }} />
              )}
              <Typography variant="caption" sx={{ color: changeColor, fontWeight: 600, fontSize: "0.7rem" }}>
                {change > 0 ? "+" : ""}{change.toLocaleString()} ({change > 0 ? "+" : ""}{changePct.toFixed(2)}%)
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Day Range
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, lineHeight: 1.6 }}>
              {p(latest.low).toLocaleString()} - {p(latest.high).toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Volume
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, lineHeight: 1.6 }}>
              {formatShares(latest.volume)}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Value
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, lineHeight: 1.6 }}>
              {formatValue(p(latest.value))}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Market Cap
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, lineHeight: 1.6 }}>
              {formatValue(marketCap)}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(5, 1fr)" },
            gap: 1,
            mt: 1,
          }}
        >
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Foreign Net
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, color: foreignNetColor, lineHeight: 1.4 }}>
              {foreignNet >= 0 ? "+" : ""}{formatShares(foreignNet)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.58rem" }}>
              B {formatShares(latest.foreign_buy)} / S {formatShares(latest.foreign_sell)}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Bid
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, lineHeight: 1.4 }}>
              {p(latest.bid).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.58rem" }}>
              Vol {formatShares(latest.bid_volume)}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Offer
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, lineHeight: 1.4 }}>
              {p(latest.offer).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.58rem" }}>
              Vol {formatShares(latest.offer_volume)}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Frequency
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, lineHeight: 1.6 }}>
              {latest.frequency.toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Listed Shares
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, lineHeight: 1.6 }}>
              {formatShares(latest.listed_shares)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {foreignFlowData.length > 1 && (
        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <SwapHorizIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Foreign Net Flow (last {foreignFlowData.length} days)
            </Typography>
          </Stack>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={foreignFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 9 }} />
              <YAxis tick={{ fill: textColor, fontSize: 10 }} tickFormatter={(v) => formatShares(v)} />
              <RechartsTooltip
                contentStyle={{
                  background: isDark ? "#27272a" : "#fff",
                  border: `1px solid ${isDark ? "#3f3f46" : "#e4e4e7"}`,
                  borderRadius: "8px", fontSize: "12px",
                  color: isDark ? "#fafafa" : "#09090b",
                }}
                labelStyle={{ color: isDark ? "#fafafa" : "#09090b" }}
                itemStyle={{ color: isDark ? "#fafafa" : "#09090b" }}
                formatter={(v: number, name: string) => {
                  const label = name === "net" ? "Net Flow" : name;
                  return [formatShares(Math.abs(v)) + (v < 0 ? " (outflow)" : " (inflow)"), label];
                }}
              />
              <ReferenceLine y={0} stroke={textColor} strokeDasharray="3 3" />
              <Bar dataKey="net" name="net" radius={[2, 2, 0, 0]}>
                {foreignFlowData.map((entry, i) => (
                  <Cell key={i} fill={entry.net >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Stack>
  );
}

function MarketOverviewSkeleton() {
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width={140} height={16} />
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={i}>
              <Skeleton width={60} height={14} />
              <Skeleton width={90} height={24} sx={{ mt: 0.5 }} />
            </Grid>
          ))}
        </Grid>
      </Paper>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width={200} height={14} sx={{ mb: 1.5 }} />
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
      </Paper>
    </Stack>
  );
}
