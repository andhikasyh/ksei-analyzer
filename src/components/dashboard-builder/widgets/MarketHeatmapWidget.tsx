"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { StockTreemap } from "@/components/StockTreemap";
import { supabase } from "@/lib/supabase";
import type { WidgetComponentProps } from "../WidgetRegistry";

export function MarketHeatmapWidget({ onStockSelect }: WidgetComponentProps) {
  const [data, setData] = useState<{ code: string; stock_name: string; sector: string; market_cap: number; change_pct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: stocks } = await supabase
        .from("idx_stock_summary")
        .select("stock_code, stock_name, close, change, volume, listed_shares")
        .order("date", { ascending: false })
        .limit(100);

      if (stocks) {
        const items = stocks.map((s: { stock_code: string; stock_name: string; close: string; change: string; volume: string; listed_shares?: string }) => ({
          code: s.stock_code,
          stock_name: s.stock_name || s.stock_code,
          sector: "Market",
          market_cap: parseFloat(s.close) * parseFloat(s.listed_shares || "1"),
          change_pct: parseFloat(s.close) > 0 && parseFloat(s.change) ? (parseFloat(s.change) / (parseFloat(s.close) - parseFloat(s.change))) * 100 : 0,
        }));
        setData(items);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 1, minHeight: 200 }} /></Box>;

  return (
    <Box sx={{ height: "100%", minHeight: 200 }}>
      <StockTreemap data={data} onStockClick={onStockSelect} />
    </Box>
  );
}
