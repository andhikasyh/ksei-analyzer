"use client";
import { useEffect, useState, useMemo } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Skeleton from "@mui/material/Skeleton";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import { supabase } from "@/lib/supabase";
import type { WidgetComponentProps } from "../WidgetRegistry";

export function StockScreenerWidget({ onStockSelect }: WidgetComponentProps) {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("idx_financial_ratios")
        .select("code, stock_name, sector, per, roe, price_bv, de_ratio, assets, fs_date")
        .order("fs_date", { ascending: false })
        .limit(3000);
      const map = new Map<string, any>();
      for (const s of data ?? []) {
        if (s.code && !map.has(s.code)) map.set(s.code, s);
      }
      const deduped = Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
      setStocks(deduped);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return stocks;
    const q = search.toLowerCase();
    return stocks.filter((s: any) => s.code?.toLowerCase().includes(q) || s.stock_name?.toLowerCase().includes(q));
  }, [stocks, search]);

  if (loading) return <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} /></Box>;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 1.5, pt: 1 }}>
        <TextField
          fullWidth size="small" placeholder="Search ticker..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 14, color: "text.disabled" }} />
                  </InputAdornment>
                ),
                sx: { fontSize: "0.75rem", py: 0.25, borderRadius: "6px" },
              },
            }}
        />
      </Box>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: "0.65rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', py: 0.5 }}>Code</TableCell>
              <TableCell sx={{ fontSize: "0.65rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', py: 0.5 }}>Sector</TableCell>
              <TableCell align="right" sx={{ fontSize: "0.65rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', py: 0.5 }}>PER</TableCell>
              <TableCell align="right" sx={{ fontSize: "0.65rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', py: 0.5 }}>ROE</TableCell>
              <TableCell align="right" sx={{ fontSize: "0.65rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', py: 0.5 }}>PBV</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.slice(0, 50).map((s: any, idx: number) => (
              <TableRow key={`${s.code}-${idx}`} hover sx={{ cursor: "pointer" }} onClick={() => onStockSelect?.(s.code)}>
                <TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', py: 0.5 }}>{s.code}</TableCell>
                <TableCell sx={{ fontSize: "0.68rem", py: 0.5, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sector}</TableCell>
                <TableCell align="right" sx={{ fontSize: "0.7rem", fontFamily: '"JetBrains Mono", monospace', py: 0.5 }}>{parseFloat(s.per)?.toFixed(1) ?? "-"}</TableCell>
                <TableCell align="right" sx={{ fontSize: "0.7rem", fontFamily: '"JetBrains Mono", monospace', py: 0.5 }}>{parseFloat(s.roe)?.toFixed(1) ?? "-"}</TableCell>
                <TableCell align="right" sx={{ fontSize: "0.7rem", fontFamily: '"JetBrains Mono", monospace', py: 0.5 }}>{parseFloat(s.price_bv)?.toFixed(2) ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
