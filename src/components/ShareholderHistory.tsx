"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { IDXShareholder, formatShares } from "@/lib/types";
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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

const KATEGORI_SHORT: Record<string, string> = {
  "Direksi": "DIR",
  "Komisaris": "COM",
  "Lebih dari 5%": ">5%",
};

const KATEGORI_COLORS: Record<string, string> = {
  "Lebih dari 5%": "#c9a227",
  "Direksi": "#fbbf24",
  "Komisaris": "#8b5cf6",
};

interface ShareholderHistoryProps {
  stockCode: string;
}

interface SnapshotHolder {
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function ShareholderHistoryPanel({ stockCode }: ShareholderHistoryProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [records, setRecords] = useState<IDXShareholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);

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
    return [...new Set(records.map((r) => r.snapshot_date))].sort();
  }, [records]);

  useEffect(() => {
    if (snapshots.length > 0) setSelectedIdx(snapshots.length - 1);
  }, [snapshots.length]);

  const selectedDate = snapshots[selectedIdx];
  const prevDate = selectedIdx > 0 ? snapshots[selectedIdx - 1] : null;

  const holders = useMemo((): SnapshotHolder[] => {
    if (!selectedDate) return [];
    const current = records.filter((r) => r.snapshot_date === selectedDate);
    const prev = prevDate ? records.filter((r) => r.snapshot_date === prevDate) : [];
    const prevMap = new Map(prev.map((r) => [r.nama, r]));

    return current
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
  }, [records, selectedDate, prevDate]);

  const textColor = isDark ? "#737373" : "#737373";

  if (loading) return <ShareholderSkeleton />;
  if (records.length === 0) return null;

  return (
    <Paper sx={{ borderRadius: 2.5, overflow: "hidden" }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ px: 2, pt: 1.5, pb: 1, flexWrap: "wrap", rowGap: 0.5 }}
      >
        <PeopleAltIcon sx={{ fontSize: 15, color: "text.secondary", opacity: 0.6 }} />
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
          Insider & Major Shareholders
        </Typography>
        <Chip
          label={`${holders.length} holders`}
          size="small"
          sx={{ fontSize: "0.6rem", height: 18, fontFamily: '"JetBrains Mono", monospace' }}
        />
        <Box sx={{ ml: "auto !important" }}>
          <FormControl size="small">
            <Select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(e.target.value as number)}
              sx={{
                fontSize: "0.72rem",
                height: 26,
                borderRadius: 1.5,
                fontFamily: '"JetBrains Mono", monospace',
                "& .MuiSelect-select": { py: 0.25, px: 1 },
              }}
            >
              {snapshots.map((date, i) => (
                <MenuItem key={date} value={i} sx={{ fontSize: "0.75rem", fontFamily: '"JetBrains Mono", monospace' }}>
                  {formatDate(date)}
                  {i === snapshots.length - 1 ? " (latest)" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Stack>

      {prevDate && (
        <Box sx={{ px: 2, pb: 0.75 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
            Changes from {formatDate(prevDate)}
          </Typography>
        </Box>
      )}

      <TableContainer sx={{ maxHeight: 440 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="center" sx={{ width: 40 }}>Role</TableCell>
              <TableCell align="right" sx={{ width: 90 }}>Shares</TableCell>
              <TableCell align="right" sx={{ width: 80 }}>%</TableCell>
              {prevDate && <TableCell align="right" sx={{ width: 90 }}>Shares Chg</TableCell>}
              {prevDate && <TableCell align="right" sx={{ width: 76 }}>% Chg</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {holders.map((h) => {
              const chgColor =
                h.changeShares !== null
                  ? h.changeShares > 0 ? "#34d399" : h.changeShares < 0 ? "#fb7185" : textColor
                  : textColor;
              const catColor = KATEGORI_COLORS[h.kategori] || textColor;

              return (
                <TableRow key={h.nama} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                  <TableCell sx={{ py: 0.5 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 500,
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                          fontSize: "0.72rem",
                        }}
                      >
                        {h.nama}
                      </Typography>
                      {h.pengendali && (
                        <Box
                          sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#fb7185", flexShrink: 0 }}
                          title="Controller"
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="center" sx={{ py: 0.5 }}>
                    <Chip
                      label={KATEGORI_SHORT[h.kategori] || h.kategori.slice(0, 3)}
                      size="small"
                      sx={{
                        fontSize: "0.5rem",
                        height: 16,
                        fontWeight: 700,
                        bgcolor: isDark ? `${catColor}22` : `${catColor}14`,
                        color: catColor,
                        "& .MuiChip-label": { px: 0.5 },
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem" }}>
                      {formatShares(h.jumlah)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.68rem" }}>
                      {h.persentase.toFixed(4)}%
                    </Typography>
                  </TableCell>
                  {prevDate && (
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      {h.changeShares !== null ? (
                        <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: chgColor, fontSize: "0.65rem" }}>
                          {h.changeShares > 0 ? "+" : ""}{formatShares(h.changeShares)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "#c9a227", fontSize: "0.6rem", fontWeight: 600 }}>
                          NEW
                        </Typography>
                      )}
                    </TableCell>
                  )}
                  {prevDate && (
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      {h.changePct !== null ? (
                        <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: chgColor, fontSize: "0.65rem" }}>
                          {h.changePct > 0 ? "+" : ""}{h.changePct.toFixed(4)}%
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "text.secondary", fontSize: "0.65rem" }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function ShareholderSkeleton() {
  return (
    <Paper sx={{ p: 2, borderRadius: 2.5 }}>
      <Skeleton width={200} height={16} sx={{ mb: 1 }} />
      <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
    </Paper>
  );
}
