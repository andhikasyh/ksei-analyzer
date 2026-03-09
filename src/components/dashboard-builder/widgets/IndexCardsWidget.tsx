"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import { supabase } from "@/lib/supabase";
import type { IDXIndexSummary } from "@/lib/types";

const INDEX_CODES = ["COMPOSITE", "LQ45", "IDX30", "IDXHIDIV20", "IDX80"];

export function IndexCardsWidget() {
  const [data, setData] = useState<IDXIndexSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: raw } = await supabase
        .from("idx_index_summary")
        .select("*")
        .in("index_code", INDEX_CODES)
        .order("date", { ascending: false })
        .limit(100);
      if (raw) {
        const byCode = new Map<string, IDXIndexSummary>();
        for (const r of raw) {
          if (!byCode.has(r.index_code)) byCode.set(r.index_code, r);
        }
        setData(INDEX_CODES.filter((c) => byCode.has(c)).map((c) => byCode.get(c)!));
      } else {
        setData([]);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Box sx={{ p: 1.5 }}><Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} /></Box>;

  return (
    <Box sx={{ p: 1.5, display: "flex", flexWrap: "wrap", gap: 1 }}>
      {data.map((idx) => {
        const change = parseFloat(idx.change) || 0;
        const close = parseFloat(idx.close) || 0;
        const pct = parseFloat(idx.previous) > 0 ? ((close - parseFloat(idx.previous)) / parseFloat(idx.previous) * 100) : 0;
        const isUp = change >= 0;
        return (
          <Box
            key={idx.index_code}
            sx={{
              flex: "1 1 140px",
              maxWidth: 200,
              p: 1.25,
              borderRadius: "8px",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: "text.secondary", letterSpacing: "0.04em" }}>
              {idx.index_code}
            </Typography>
            <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', mt: 0.25 }}>
              {close.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </Typography>
            <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: isUp ? "#22c55e" : "#ef4444" }}>
              {isUp ? "+" : ""}{pct.toFixed(2)}%
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
