"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { IDXStockSummary, formatValue, formatShares } from "@/lib/types";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
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
      const closePrice = p(r.close);
      const fBuy = p(r.foreign_buy);
      const fSell = p(r.foreign_sell);
      const vol = p(r.volume);
      const lBuy = vol - fBuy;
      const lSell = vol - fSell;
      return {
        date: new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        foreignBuyRp: fBuy * closePrice,
        localBuyRp: lBuy * closePrice,
        foreignSellRp: -(fSell * closePrice),
        localSellRp: -(lSell * closePrice),
        foreignNetRp: (fBuy - fSell) * closePrice,
      };
    });
  }, [records]);

  const textColor = isDark ? "#737373" : "#737373";
  const gridColor = isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.06)";

  if (loading) return <MarketOverviewSkeleton />;
  if (!latest) return null;

  const close = p(latest.close);
  const change = p(latest.change);
  const prev = p(latest.previous);
  const vol = p(latest.volume);
  const changePct = prev > 0 ? (change / prev) * 100 : 0;
  const isUp = change >= 0;
  const changeColor = change > 0 ? "#34d399" : change < 0 ? "#fb7185" : textColor;
  const fBuyShares = p(latest.foreign_buy);
  const fSellShares = p(latest.foreign_sell);
  const fBuyRp = fBuyShares * close;
  const fSellRp = fSellShares * close;
  const fNetRp = fBuyRp - fSellRp;
  const lBuyShares = vol - fBuyShares;
  const lSellShares = vol - fSellShares;
  const lBuyRp = lBuyShares * close;
  const lSellRp = lSellShares * close;
  const lNetRp = lBuyRp - lSellRp;
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
              bgcolor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.03)",
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
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)", gridColumn: { xs: "span 2", sm: "span 1" } }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Close (Rp)
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.2 }}>
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

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Day Range (Rp)
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, lineHeight: 1.6 }}>
              {p(latest.low).toLocaleString()} - {p(latest.high).toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Volume
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, lineHeight: 1.6 }}>
              {formatShares(latest.volume)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.58rem" }}>
              shares
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Value (Rp)
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, lineHeight: 1.6 }}>
              {formatValue(p(latest.value))}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Market Cap (Rp)
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, lineHeight: 1.6 }}>
              {formatValue(marketCap)}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
            gap: 1,
            mt: 1,
          }}
        >
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Bid (Rp)
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, lineHeight: 1.4 }}>
              {p(latest.bid).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.58rem" }}>
              Vol {formatShares(latest.bid_volume)}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Offer (Rp)
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, lineHeight: 1.4 }}>
              {p(latest.offer).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.58rem" }}>
              Vol {formatShares(latest.offer_volume)}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Frequency
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, lineHeight: 1.6 }}>
              {latest.frequency.toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(107,127,163,0.04)" : "rgba(12,18,34,0.02)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Listed Shares
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, lineHeight: 1.6 }}>
              {formatShares(latest.listed_shares)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <SwapHorizIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }} />
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
            Buy / Sell Flow (Rp)
          </Typography>
          <Chip
            label={new Date(latest.date).toLocaleDateString("en-GB", {
              day: "2-digit", month: "short", year: "numeric",
            })}
            size="small"
            sx={{
              fontSize: "0.65rem", height: 20,
              bgcolor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.03)",
            }}
          />
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${isDark ? "rgba(251,191,36,0.12)" : "rgba(217,119,6,0.1)"}`, bgcolor: isDark ? "rgba(251,191,36,0.03)" : "rgba(217,119,6,0.02)" }}>
            <Typography variant="caption" sx={{ color: "#f59e0b", fontWeight: 700, display: "block", mb: 1, fontSize: "0.7rem" }}>
              Foreign
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6rem" }}>Buy</Typography>
                <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: "#34d399", fontSize: "0.78rem" }}>
                  {formatValue(fBuyRp)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.55rem" }}>
                  {formatShares(fBuyShares)} shr
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6rem" }}>Sell</Typography>
                <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: "#fb7185", fontSize: "0.78rem" }}>
                  {formatValue(fSellRp)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.55rem" }}>
                  {formatShares(fSellShares)} shr
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6rem" }}>Net</Typography>
                <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: fNetRp >= 0 ? "#34d399" : "#fb7185", fontSize: "0.78rem" }}>
                  {fNetRp >= 0 ? "+" : ""}{formatValue(fNetRp)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${isDark ? "rgba(34,197,94,0.12)" : "rgba(22,163,74,0.1)"}`, bgcolor: isDark ? "rgba(34,197,94,0.03)" : "rgba(22,163,74,0.02)" }}>
            <Typography variant="caption" sx={{ color: "#22c55e", fontWeight: 700, display: "block", mb: 1, fontSize: "0.7rem" }}>
              Local
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6rem" }}>Buy</Typography>
                <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: "#34d399", fontSize: "0.78rem" }}>
                  {formatValue(lBuyRp)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.55rem" }}>
                  {formatShares(lBuyShares)} shr
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6rem" }}>Sell</Typography>
                <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: "#fb7185", fontSize: "0.78rem" }}>
                  {formatValue(lSellRp)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.55rem" }}>
                  {formatShares(lSellShares)} shr
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6rem" }}>Net</Typography>
                <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: lNetRp >= 0 ? "#34d399" : "#fb7185", fontSize: "0.78rem" }}>
                  {lNetRp >= 0 ? "+" : ""}{formatValue(lNetRp)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {(() => {
          const totalBuyRp = fBuyRp + lBuyRp;
          const totalSellRp = fSellRp + lSellRp;
          const totalNetRp = totalBuyRp - totalSellRp;
          const fBuyPct = totalBuyRp > 0 ? (fBuyRp / totalBuyRp) * 100 : 0;
          const fSellPct = totalSellRp > 0 ? (fSellRp / totalSellRp) * 100 : 0;
          return (
            <>
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, border: `1px solid ${isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.06)"}`, bgcolor: isDark ? "rgba(107,127,163,0.03)" : "rgba(12,18,34,0.015)" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block", mb: 1, fontSize: "0.7rem" }}>
                  Combined (Foreign + Local)
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6rem" }}>Total Buy</Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: "#34d399", fontSize: "0.82rem" }}>
                      {formatValue(totalBuyRp)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.55rem" }}>
                      {formatShares(fBuyShares + lBuyShares)} shr
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6rem" }}>Total Sell</Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: "#fb7185", fontSize: "0.82rem" }}>
                      {formatValue(totalSellRp)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.55rem" }}>
                      {formatShares(fSellShares + lSellShares)} shr
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6rem" }}>Net</Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: totalNetRp >= 0 ? "#34d399" : "#fb7185", fontSize: "0.82rem" }}>
                      {totalNetRp >= 0 ? "+" : ""}{formatValue(totalNetRp)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 1.5 }}>
                <Box sx={{ display: "flex", gap: 2, mb: 0.75 }}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>Buy Composition</Typography>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", color: "text.secondary" }}>
                        F {fBuyPct.toFixed(0)}% / L {(100 - fBuyPct).toFixed(0)}%
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? "rgba(34,197,94,0.15)" : "rgba(22,163,74,0.1)", overflow: "hidden", display: "flex" }}>
                      <Box sx={{ width: `${fBuyPct}%`, height: "100%", bgcolor: "#f59e0b", transition: "width 0.6s ease" }} />
                      <Box sx={{ flex: 1, height: "100%", bgcolor: "#22c55e" }} />
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>Sell Composition</Typography>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", color: "text.secondary" }}>
                        F {fSellPct.toFixed(0)}% / L {(100 - fSellPct).toFixed(0)}%
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? "rgba(251,113,133,0.15)" : "rgba(225,29,72,0.08)", overflow: "hidden", display: "flex" }}>
                      <Box sx={{ width: `${fSellPct}%`, height: "100%", bgcolor: "#f59e0b", transition: "width 0.6s ease" }} />
                      <Box sx={{ flex: 1, height: "100%", bgcolor: "#22c55e" }} />
                    </Box>
                  </Box>
                </Box>
                <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 0.5 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                    <Typography variant="caption" sx={{ fontSize: "0.58rem", color: "text.secondary" }}>Foreign</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22c55e" }} />
                    <Typography variant="caption" sx={{ fontSize: "0.58rem", color: "text.secondary" }}>Local</Typography>
                  </Stack>
                </Stack>
              </Box>
            </>
          );
        })()}
      </Paper>

      {foreignFlowData.length > 1 && (
        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <SwapHorizIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Inflow vs Outflow in Rp (last {foreignFlowData.length} days)
            </Typography>
          </Stack>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={foreignFlowData} stackOffset="sign" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 9 }} />
              <YAxis tick={{ fill: textColor, fontSize: 10 }} tickFormatter={(v) => formatValue(v)} />
              <RechartsTooltip
                contentStyle={{
                  background: isDark ? "#141414" : "#f0eeeb",
                  border: `1px solid ${isDark ? "rgba(107,127,163,0.15)" : "rgba(12,18,34,0.08)"}`,
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: isDark ? "#e8edf5" : "#0c1222" }}
                itemStyle={{ color: isDark ? "#e8edf5" : "#0c1222" }}
                formatter={(v: number, name: string) => {
                  const labels: Record<string, string> = {
                    foreignBuyRp: "Foreign Buy",
                    localBuyRp: "Local Buy",
                    foreignSellRp: "Foreign Sell",
                    localSellRp: "Local Sell",
                    foreignNetRp: "Foreign Net",
                  };
                  const prefix = name === "foreignNetRp" ? (v >= 0 ? "+" : "") : "";
                  return [`${prefix}Rp ${formatValue(Math.abs(v))}`, labels[name] || name];
                }}
              />
              <ReferenceLine y={0} stroke={textColor} strokeDasharray="3 3" />
              <Bar dataKey="foreignBuyRp" stackId="inflow" name="foreignBuyRp" fill="rgba(245,158,11,0.85)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="localBuyRp" stackId="inflow" name="localBuyRp" fill="rgba(34,197,94,0.7)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="foreignSellRp" stackId="outflow" name="foreignSellRp" fill="rgba(245,158,11,0.45)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="localSellRp" stackId="outflow" name="localSellRp" fill="rgba(34,197,94,0.35)" radius={[0, 0, 2, 2]} />
              <Line dataKey="foreignNetRp" name="foreignNetRp" type="monotone" stroke="#e879f9" strokeWidth={2} dot={{ r: 2.5, fill: "#e879f9", strokeWidth: 0 }} activeDot={{ r: 4, fill: "#e879f9", strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: "rgba(245,158,11,0.85)" }} />
              <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "text.secondary" }}>Foreign Buy</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: "rgba(34,197,94,0.7)" }} />
              <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "text.secondary" }}>Local Buy</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: "rgba(245,158,11,0.45)" }} />
              <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "text.secondary" }}>Foreign Sell</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: "rgba(34,197,94,0.35)" }} />
              <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "text.secondary" }}>Local Sell</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 3, borderRadius: 1, bgcolor: "#e879f9" }} />
              <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "text.secondary" }}>Foreign Net</Typography>
            </Stack>
          </Stack>
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
