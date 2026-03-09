"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import { OwnershipPieChart } from "@/components/Charts";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import type { WidgetComponentProps } from "../WidgetRegistry";

export function OwnershipChartWidget({ stockCode }: WidgetComponentProps) {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stockCode) return;
    setLoading(true);
    (async () => {
      const { data: records } = await supabase
        .from(TABLE_NAME)
        .select("INVESTOR_TYPE, PERCENTAGE")
        .eq("SHARE_CODE", stockCode)
        .order("DATE", { ascending: false })
        .limit(100);

      if (records && records.length > 0) {
        const byType = new Map<string, number>();
        for (const r of records) {
          const t = r.INVESTOR_TYPE || "OT";
          byType.set(t, (byType.get(t) || 0) + (r.PERCENTAGE || 0));
        }
        setData(Array.from(byType.entries()).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })));
      }
      setLoading(false);
    })();
  }, [stockCode]);

  if (!stockCode) {
    return (
      <Box sx={{ p: 3, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.disabled" }}>Select a stock</Typography>
      </Box>
    );
  }

  if (loading) return <Box sx={{ p: 2 }}><Skeleton variant="circular" width={150} height={150} sx={{ mx: "auto" }} /></Box>;

  return (
    <Box sx={{ height: "100%", overflow: "auto", p: 1 }}>
      <OwnershipPieChart data={data} title={`${stockCode} Ownership`} />
    </Box>
  );
}
