"use client";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { BrokerSummaryPanel } from "@/components/BrokerSummary";
import type { WidgetComponentProps } from "../WidgetRegistry";

export function BrokerSummaryWidget({ stockCode }: WidgetComponentProps) {
  if (!stockCode) {
    return (
      <Box sx={{ p: 3, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.disabled" }}>Select a stock to view broker data</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      <BrokerSummaryPanel stockCode={stockCode} />
    </Box>
  );
}
