"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { IDXBrokerSummary, formatValue, formatShares } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
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
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import StorefrontIcon from "@mui/icons-material/Storefront";

interface BrokerSummaryProps {
  stockCode: string;
}

interface AggregatedBroker {
  code: string;
  name: string;
  totalVolume: number;
  totalValue: number;
  totalFrequency: number;
  days: number;
}

export function BrokerSummaryPanel({ stockCode }: BrokerSummaryProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [records, setRecords] = useState<IDXBrokerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from("idx_broker_summary")
        .select("*")
        .eq("code", stockCode)
        .order("date", { ascending: true });

      if (!error && data) setRecords(data as IDXBrokerSummary[]);
      setLoading(false);
    }
    fetchData();
  }, [stockCode]);

  const brokers = useMemo(() => {
    const map: Record<string, AggregatedBroker> = {};
    records.forEach((r) => {
      const key = r.broker_code;
      if (!map[key]) {
        map[key] = {
          code: r.broker_code,
          name: r.broker_name,
          totalVolume: 0,
          totalValue: 0,
          totalFrequency: 0,
          days: 0,
        };
      }
      map[key].totalVolume += parseFloat(r.volume) || 0;
      map[key].totalValue += parseFloat(r.value) || 0;
      map[key].totalFrequency += r.frequency || 0;
      map[key].days += 1;
      if (r.broker_name) map[key].name = r.broker_name;
    });
    return Object.values(map).sort((a, b) => b.totalValue - a.totalValue);
  }, [records]);

  const dailyVolume = useMemo(() => {
    const map: Record<string, { volume: number; value: number; brokers: number }> = {};
    records.forEach((r) => {
      if (!map[r.date]) map[r.date] = { volume: 0, value: 0, brokers: 0 };
      map[r.date].volume += parseFloat(r.volume) || 0;
      map[r.date].value += parseFloat(r.value) || 0;
      map[r.date].brokers += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date: new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        volume: d.volume,
        value: d.value,
        brokers: d.brokers,
      }));
  }, [records]);

  const { totalValue, totalVolume, maxValue } = useMemo(() => {
    const totVal = brokers.reduce((s, b) => s + b.totalValue, 0);
    const totVol = brokers.reduce((s, b) => s + b.totalVolume, 0);
    const maxVal = brokers.length > 0 ? brokers[0].totalValue : 1;
    return { totalValue: totVal, totalVolume: totVol, maxValue: maxVal };
  }, [brokers]);

  const textColor = isDark ? "#a1a1aa" : "#71717a";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  if (loading) return <BrokerSummarySkeleton />;
  if (records.length === 0) return null;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <StorefrontIcon sx={{ fontSize: 18, color: "text.secondary", opacity: 0.6 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Broker Activity
        </Typography>
        <Chip
          label={`${brokers.length} brokers`}
          size="small"
          sx={{ fontSize: "0.7rem", height: 22, fontFamily: "monospace" }}
        />
        <Chip
          label={`${dailyVolume.length} trading days`}
          size="small"
          sx={{ fontSize: "0.7rem", height: 22, fontFamily: "monospace" }}
        />
      </Stack>

      {dailyVolume.length > 1 && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500, mb: 1.5, display: "block" }}>
                Daily Trading Volume
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 9 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 10 }} tickFormatter={(v) => formatShares(v)} />
                  <RechartsTooltip
                    contentStyle={{
                      background: isDark ? "#27272a" : "#fff",
                      border: `1px solid ${isDark ? "#3f3f46" : "#e4e4e7"}`,
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: isDark ? "#fafafa" : "#09090b",
                    }}
                    formatter={(v: number) => [formatShares(v), "Volume"]}
                  />
                  <Bar dataKey="volume" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500, mb: 1.5, display: "block" }}>
                Daily Trading Value (IDR)
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 9 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 10 }} tickFormatter={(v) => formatValue(v)} />
                  <RechartsTooltip
                    contentStyle={{
                      background: isDark ? "#27272a" : "#fff",
                      border: `1px solid ${isDark ? "#3f3f46" : "#e4e4e7"}`,
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: isDark ? "#fafafa" : "#09090b",
                    }}
                    formatter={(v: number) => [formatValue(v), "Value"]}
                  />
                  <Bar dataKey="value" fill="#22c55e" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 2 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
            Top Brokers by Value
          </Typography>
          <Stack direction="row" spacing={2}>
            <Typography variant="caption" color="text.secondary">
              Total Value: <strong style={{ color: theme.palette.text.primary }}>{formatValue(totalValue)}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Volume: <strong style={{ color: theme.palette.text.primary }}>{formatShares(totalVolume)}</strong>
            </Typography>
          </Stack>
        </Box>

        <TableContainer sx={{ maxHeight: 480 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 36 }}>#</TableCell>
                <TableCell>Broker</TableCell>
                <TableCell align="right">Volume</TableCell>
                <TableCell align="right">Value (IDR)</TableCell>
                <TableCell align="right">Freq</TableCell>
                <TableCell align="right">Days</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Share</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {brokers.map((broker, i) => {
                const sharePct = totalValue > 0 ? (broker.totalValue / totalValue) * 100 : 0;
                const barPct = maxValue > 0 ? (broker.totalValue / maxValue) * 100 : 0;

                return (
                  <TableRow key={broker.code} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                        {i + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={broker.name} placement="top" arrow>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "monospace", fontSize: "0.8rem" }}>
                            {broker.code}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.65rem", display: "block", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {broker.name}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {formatShares(broker.totalVolume)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {formatValue(broker.totalValue)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {broker.totalFrequency.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                        {broker.days}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 50 }}>
                          <LinearProgress
                            variant="determinate"
                            value={barPct}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                              "& .MuiLinearProgress-bar": {
                                borderRadius: 3,
                                bgcolor: i < 3 ? "#3b82f6" : i < 10 ? "#60a5fa" : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
                              },
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary", minWidth: 42, textAlign: "right", fontSize: "0.65rem" }}>
                          {sharePct.toFixed(1)}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}

export function BrokerSummarySkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton width={200} height={24} />
      <Grid container spacing={2}>
        {Array.from({ length: 2 }).map((_, i) => (
          <Grid size={{ xs: 12, lg: 6 }} key={i}>
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Skeleton width={160} height={14} sx={{ mb: 1.5 }} />
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width={160} height={20} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
      </Paper>
    </Stack>
  );
}
