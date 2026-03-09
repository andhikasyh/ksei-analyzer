"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { supabase } from "@/lib/supabase";
import type { WidgetComponentProps } from "../WidgetRegistry";

type Tab = "gainers" | "losers" | "active";

export function MarketMoversWidget({ onStockSelect }: WidgetComponentProps) {
  const [tab, setTab] = useState<Tab>("gainers");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: latest } = await supabase
        .from("idx_stock_summary")
        .select("stock_code, stock_name, close, change, volume, value, previous")
        .order("date", { ascending: false })
        .limit(500);
      setData(latest ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} /></Box>;

  const withChange = data.map((s: any) => {
    const close = parseFloat(s.close) || 0;
    const prev = parseFloat(s.previous) || 0;
    const changePct = prev > 0 ? ((close - prev) / prev) * 100 : 0;
    return { ...s, changePct, close, volume: parseFloat(s.volume) || 0, value: parseFloat(s.value) || 0 };
  }).filter((s: any) => s.close > 0);

  let sorted: any[];
  if (tab === "gainers") sorted = [...withChange].sort((a, b) => b.changePct - a.changePct).slice(0, 10);
  else if (tab === "losers") sorted = [...withChange].sort((a, b) => a.changePct - b.changePct).slice(0, 10);
  else sorted = [...withChange].sort((a, b) => b.value - a.value).slice(0, 10);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", gap: 0.5, px: 1.5, pt: 1 }}>
        {(["gainers", "losers", "active"] as Tab[]).map((t) => (
          <Chip key={t} label={t === "gainers" ? "Gainers" : t === "losers" ? "Losers" : "Active"} size="small"
            onClick={() => setTab(t)}
            sx={{ fontSize: "0.65rem", fontWeight: tab === t ? 700 : 500, bgcolor: tab === t ? "rgba(201,162,39,0.1)" : "transparent", color: tab === t ? "#c9a227" : "text.secondary", border: "1px solid", borderColor: tab === t ? "rgba(201,162,39,0.2)" : "divider" }}
          />
        ))}
      </Box>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Table size="small">
          <TableBody>
            {sorted.map((s: any) => (
              <TableRow key={s.stock_code} hover sx={{ cursor: "pointer" }} onClick={() => onStockSelect?.(s.stock_code)}>
                <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>{s.stock_code}</TableCell>
                <TableCell align="right" sx={{ fontSize: "0.72rem", fontFamily: '"JetBrains Mono", monospace', py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>{s.close.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ fontSize: "0.72rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', py: 0.75, borderBottom: "1px solid", borderColor: "divider", color: s.changePct >= 0 ? "#22c55e" : "#ef4444" }}>
                  {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
