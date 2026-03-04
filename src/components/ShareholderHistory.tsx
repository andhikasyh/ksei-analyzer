"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { IDXShareholder, formatShares, formatRatio } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
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
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveIcon from "@mui/icons-material/Remove";

const CHART_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

const KATEGORI_LABELS: Record<string, string> = {
  "Direksi": "Director",
  "Komisaris": "Commissioner",
  "Lebih dari 5%": "Major Holder (>5%)",
};

interface ShareholderHistoryProps {
  stockCode: string;
}

interface EnrichedHolder {
  nama: string;
  kategori: string;
  pengendali: boolean;
  jumlah: number;
  persentase: number;
  prevJumlah: number | null;
  prevPersentase: number | null;
  changeShares: number | null;
  changePct: number | null;
}

export function ShareholderHistoryPanel({ stockCode }: ShareholderHistoryProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [records, setRecords] = useState<IDXShareholder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from("idx_shareholders")
        .select("*")
        .eq("kode_emiten", stockCode)
        .order("snapshot_date", { ascending: true });
      if (!error && data) setRecords(data as IDXShareholder[]);
      setLoading(false);
    }
    fetch();
  }, [stockCode]);

  const snapshots = useMemo(() => {
    const dates = [...new Set(records.map((r) => r.snapshot_date))].sort();
    return dates;
  }, [records]);

  const latestDate = snapshots[snapshots.length - 1];
  const prevDate = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  const enrichedHolders = useMemo((): EnrichedHolder[] => {
    if (!latestDate) return [];
    const latest = records.filter((r) => r.snapshot_date === latestDate);
    const prev = prevDate ? records.filter((r) => r.snapshot_date === prevDate) : [];
    const prevMap = new Map(prev.map((r) => [r.nama, r]));

    return latest
      .map((r) => {
        const jumlah = parseFloat(r.jumlah) || 0;
        const persentase = parseFloat(r.persentase) || 0;
        const prevR = prevMap.get(r.nama);
        const prevJumlah = prevR ? parseFloat(prevR.jumlah) || 0 : null;
        const prevPersentase = prevR ? parseFloat(prevR.persentase) || 0 : null;

        return {
          nama: r.nama,
          kategori: r.kategori,
          pengendali: r.pengendali,
          jumlah,
          persentase,
          prevJumlah,
          prevPersentase,
          changeShares: prevJumlah !== null ? jumlah - prevJumlah : null,
          changePct: prevPersentase !== null ? persentase - prevPersentase : null,
        };
      })
      .sort((a, b) => b.persentase - a.persentase);
  }, [records, latestDate, prevDate]);

  const chartData = useMemo(() => {
    if (snapshots.length < 2) return [];
    const majorNames = records
      .filter((r) => r.kategori === "Lebih dari 5%" && parseFloat(r.persentase) > 1)
      .map((r) => r.nama);
    const uniqueNames = [...new Set(majorNames)].slice(0, 8);

    return snapshots.map((date) => {
      const snap = records.filter((r) => r.snapshot_date === date);
      const point: Record<string, any> = {
        date: new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
      };
      uniqueNames.forEach((name) => {
        const holder = snap.find((r) => r.nama === name);
        point[name] = holder ? parseFloat(holder.persentase) || 0 : 0;
      });
      return point;
    });
  }, [records, snapshots]);

  const chartNames = useMemo(() => {
    if (chartData.length === 0) return [];
    const keys = Object.keys(chartData[0]).filter((k) => k !== "date");
    return keys;
  }, [chartData]);

  const textColor = isDark ? "#a1a1aa" : "#71717a";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  if (loading) return <ShareholderSkeleton />;
  if (enrichedHolders.length === 0) return null;

  const grouped: Record<string, EnrichedHolder[]> = {};
  enrichedHolders.forEach((h) => {
    const key = h.kategori;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(h);
  });

  const categoryOrder = ["Lebih dari 5%", "Direksi", "Komisaris"];
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <PeopleAltIcon sx={{ fontSize: 18, color: "text.secondary", opacity: 0.6 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Insider & Major Shareholders
        </Typography>
        {snapshots.length > 1 && (
          <Chip
            label={`${snapshots.length} snapshots`}
            size="small"
            sx={{ fontSize: "0.7rem", height: 22, fontFamily: "monospace" }}
          />
        )}
      </Stack>

      {chartData.length > 1 && chartNames.length > 0 && (
        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500, mb: 1.5, display: "block" }}>
            Major Holder Ownership Over Time (%)
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 10 }} />
              <YAxis tick={{ fill: textColor, fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <RechartsTooltip
                contentStyle={{
                  background: isDark ? "#27272a" : "#fff",
                  border: `1px solid ${isDark ? "#3f3f46" : "#e4e4e7"}`,
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: isDark ? "#fafafa" : "#09090b",
                }}
                formatter={(v: number) => [`${v.toFixed(4)}%`]}
              />
              <Legend wrapperStyle={{ fontSize: "10px" }} iconSize={8} />
              {chartNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={name.length > 30 ? name.slice(0, 28) + "..." : name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {sortedCategories.map((cat) => (
        <Paper key={cat} sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2.5, pt: 2, pb: 1 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
              {KATEGORI_LABELS[cat] || cat}
            </Typography>
            <Chip
              label={`${grouped[cat].length}`}
              size="small"
              sx={{ fontSize: "0.65rem", height: 18, fontFamily: "monospace" }}
            />
            {latestDate && (
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", ml: "auto !important" }}>
                as of {new Date(latestDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </Typography>
            )}
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Shares</TableCell>
                  <TableCell align="right">Ownership</TableCell>
                  {prevDate && <TableCell align="right">Shares Chg</TableCell>}
                  {prevDate && <TableCell align="right">% Chg</TableCell>}
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grouped[cat].map((h) => {
                  const changeColor =
                    h.changeShares !== null
                      ? h.changeShares > 0 ? "#22c55e" : h.changeShares < 0 ? "#ef4444" : textColor
                      : textColor;
                  return (
                    <TableRow key={h.nama} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {h.nama}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                          {formatShares(h.jumlah)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                          {h.persentase.toFixed(4)}%
                        </Typography>
                      </TableCell>
                      {prevDate && (
                        <TableCell align="right">
                          {h.changeShares !== null ? (
                            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                              {h.changeShares > 0 ? (
                                <ArrowUpwardIcon sx={{ fontSize: 12, color: "#22c55e" }} />
                              ) : h.changeShares < 0 ? (
                                <ArrowDownwardIcon sx={{ fontSize: 12, color: "#ef4444" }} />
                              ) : (
                                <RemoveIcon sx={{ fontSize: 12, color: textColor }} />
                              )}
                              <Typography variant="caption" sx={{ fontFamily: "monospace", color: changeColor }}>
                                {h.changeShares > 0 ? "+" : ""}{formatShares(h.changeShares)}
                              </Typography>
                            </Stack>
                          ) : (
                            <Chip label="NEW" size="small" sx={{ fontSize: "0.55rem", height: 16, bgcolor: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.08)", color: "#3b82f6", fontWeight: 700 }} />
                          )}
                        </TableCell>
                      )}
                      {prevDate && (
                        <TableCell align="right">
                          {h.changePct !== null ? (
                            <Typography variant="caption" sx={{ fontFamily: "monospace", color: changeColor }}>
                              {h.changePct > 0 ? "+" : ""}{h.changePct.toFixed(4)}%
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>-</Typography>
                          )}
                        </TableCell>
                      )}
                      <TableCell align="center">
                        {h.pengendali && (
                          <Chip
                            label="Controller"
                            size="small"
                            sx={{
                              fontSize: "0.6rem", height: 18, fontWeight: 600,
                              bgcolor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)",
                              color: "#ef4444",
                            }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Stack>
  );
}

function ShareholderSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton width={240} height={24} />
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width={200} height={14} sx={{ mb: 1.5 }} />
        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2 }} />
      </Paper>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width={140} height={14} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
      </Paper>
    </Stack>
  );
}
