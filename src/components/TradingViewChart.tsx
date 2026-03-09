"use client";

import { useEffect, useRef, useState, memo } from "react";
import { useColorMode } from "@/components/ThemeProvider";
import Box from "@mui/material/Box";

interface TradingViewChartProps {
  stockCode: string;
}

function TradingViewChartInner({ stockCode }: TradingViewChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { mode } = useColorMode();
  const symbol = `IDX:${stockCode}`;
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(Math.floor(w));
    });
    observer.observe(wrapper);
    setWidth(Math.floor(wrapper.clientWidth));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || width < 100) return;

    container.innerHTML = "";
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = false;
    script.textContent = JSON.stringify({
      width,
      height: 420,
      symbol,
      interval: "D",
      timezone: "Asia/Jakarta",
      theme: mode === "dark" ? "dark" : "light",
      style: "1",
      locale: "en",
      backgroundColor:
        mode === "dark" ? "rgba(24, 24, 27, 1)" : "rgba(255, 255, 255, 1)",
      gridColor:
        mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
      hide_top_toolbar: true,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    widgetDiv.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol, mode, width]);

  return (
    <Box
      ref={wrapperRef}
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
        style={{ height: 420, width: "100%" }}
      />
    </Box>
  );
}

export const TradingViewChart = memo(TradingViewChartInner);
