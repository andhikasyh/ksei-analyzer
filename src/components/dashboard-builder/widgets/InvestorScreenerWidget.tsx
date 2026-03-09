"use client";
import Box from "@mui/material/Box";
import { InvestorScreener } from "@/components/InvestorScreener";
import type { WidgetComponentProps } from "../WidgetRegistry";

export function InvestorScreenerWidget(_props: WidgetComponentProps) {
  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      <InvestorScreener />
    </Box>
  );
}
