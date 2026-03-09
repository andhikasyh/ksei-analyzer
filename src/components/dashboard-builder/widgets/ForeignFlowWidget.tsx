"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";
import { useTheme } from "@mui/material/styles";
import { formatValue } from "@/lib/types";

export function ForeignFlowWidget() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [data, setData] = useState<{ date: string; net: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: summaries } = await supabase
        .from("idx_stock_summary")
        .select("date, foreign_buy, foreign_sell")
        .order("date", { ascending: false })
        .limit(5000);

      if (summaries) {
        const byDate = new Map<string, number>();
        for (const s of summaries) {
          const net = (parseFloat(s.foreign_buy) || 0) - (parseFloat(s.foreign_sell) || 0);
          byDate.set(s.date, (byDate.get(s.date) || 0) + net);
        }
        const arr = Array.from(byDate.entries())
          .map(([date, net]) => ({ date: date.slice(5), net }))
          .reverse()
          .slice(-20);
        setData(arr);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} /></Box>;

  return (
    <Box sx={{ height: "100%", p: 1 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: isDark ? "#888" : "#666" }} />
          <YAxis tick={{ fontSize: 10, fill: isDark ? "#888" : "#666" }} tickFormatter={(v) => formatValue(v)} />
          <Tooltip formatter={(v: number) => formatValue(v)} contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", background: isDark ? "#1a1a1a" : "#fff" }} />
          <ReferenceLine y={0} stroke={isDark ? "#555" : "#ccc"} />
          <Bar dataKey="net" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.net >= 0 ? "#22c55e" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
