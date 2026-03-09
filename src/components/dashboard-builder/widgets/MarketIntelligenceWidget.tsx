"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { WidgetComponentProps } from "../WidgetRegistry";

export function MarketIntelligenceWidget(_props: WidgetComponentProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("market_intelligence")
        .select("id, report_date, title, report")
        .order("report_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      setReport(data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1 }} /></Box>;

  if (!report) {
    return (
      <Box sx={{ p: 3, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.disabled" }}>No reports available</Typography>
      </Box>
    );
  }

  const r = report.report;
  const sentiment = r?.marketOutlook?.sentiment ?? "neutral";
  const sentimentColors: Record<string, string> = { bullish: "#22c55e", bearish: "#ef4444", neutral: "#94a3b8", cautious: "#f97316" };

  return (
    <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontSize: "0.65rem", fontFamily: '"JetBrains Mono", monospace', color: "text.disabled" }}>
          {report.report_date}
        </Typography>
        <Chip
          label={sentiment.toUpperCase()}
          size="small"
          sx={{ fontSize: "0.58rem", fontWeight: 700, height: 20, bgcolor: `${sentimentColors[sentiment] || "#94a3b8"}22`, color: sentimentColors[sentiment] || "#94a3b8", fontFamily: '"JetBrains Mono", monospace' }}
        />
      </Box>
      <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, fontFamily: '"Outfit", sans-serif', lineHeight: 1.3 }}>
        {report.title || r?.title || "Market Intelligence"}
      </Typography>
      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", lineHeight: 1.5, flex: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
        {r?.marketOverview?.summary || ""}
      </Typography>
      <Box component={Link} href={`/intelligent/${report.report_date}`} sx={{ fontSize: "0.7rem", color: "#c9a227", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
        Read full report
      </Box>
    </Box>
  );
}
