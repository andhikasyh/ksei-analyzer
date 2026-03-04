"use client";

import { useEffect, useRef, memo } from "react";
import { useColorMode } from "@/components/ThemeProvider";
import Box from "@mui/material/Box";

interface TradingViewChartProps {
  stockCode: string;
}

function TradingViewChartInner({ stockCode }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mode } = useColorMode();
  const symbol = `IDX:${stockCode}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      range: "6M",
      timezone: "Asia/Jakarta",
      theme: mode === "dark" ? "dark" : "light",
      style: "1",
      locale: "en",
      backgroundColor:
        mode === "dark" ? "rgba(24, 24, 27, 1)" : "rgba(255, 255, 255, 1)",
      gridColor:
        mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [symbol, mode]);

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: 1,
        borderColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      }}
    >
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ height: 500, width: "100%" }}
      />
    </Box>
  );
}

export const TradingViewChart = memo(TradingViewChartInner);
