"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { useWatchlist } from "@/lib/watchlist";
import { supabase } from "@/lib/supabase";
import type { WidgetComponentProps } from "../WidgetRegistry";

export function WatchlistWidget({ onStockSelect }: WidgetComponentProps) {
  const { watchlist } = useWatchlist();
  const [prices, setPrices] = useState<Record<string, { close: number; change: number; previous: number }>>({});
  const codes = watchlist.map((w) => w.code);

  useEffect(() => {
    if (codes.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("idx_stock_summary")
        .select("stock_code, close, change, previous")
        .in("stock_code", codes)
        .order("date", { ascending: false })
        .limit(codes.length);
      if (data) {
        const map: Record<string, { close: number; change: number; previous: number }> = {};
        for (const s of data) {
          if (!map[s.stock_code]) {
            map[s.stock_code] = { close: parseFloat(s.close) || 0, change: parseFloat(s.change) || 0, previous: parseFloat(s.previous) || 0 };
          }
        }
        setPrices(map);
      }
    })();
  }, [codes.join(",")]);

  if (codes.length === 0) {
    return (
      <Box sx={{ p: 3, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.disabled" }}>No stocks in watchlist</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      <Table size="small">
        <TableBody>
          {codes.map((code) => {
            const p = prices[code];
            const pct = p && p.previous > 0 ? ((p.close - p.previous) / p.previous) * 100 : 0;
            return (
              <TableRow key={code} hover sx={{ cursor: "pointer" }} onClick={() => onStockSelect?.(code)}>
                <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>{code}</TableCell>
                <TableCell align="right" sx={{ fontSize: "0.72rem", fontFamily: '"JetBrains Mono", monospace', py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>{p ? p.close.toLocaleString() : "-"}</TableCell>
                <TableCell align="right" sx={{ fontSize: "0.72rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', py: 0.75, borderBottom: "1px solid", borderColor: "divider", color: pct >= 0 ? "#22c55e" : "#ef4444" }}>
                  {p ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
