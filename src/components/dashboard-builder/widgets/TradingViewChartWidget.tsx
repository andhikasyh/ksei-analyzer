"use client";
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { useColorMode } from "@/components/ThemeProvider";
import type { WidgetComponentProps } from "../WidgetRegistry";

export function TradingViewChartWidget({ stockCode }: WidgetComponentProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { mode } = useColorMode();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const container = containerRef.current;
    if (!wrapper || !container || !stockCode) return;

    setLoaded(false);
    let cancelled = false;

    function inject() {
      if (cancelled || !container) return;
      const w = Math.floor(wrapper.clientWidth);
      const h = Math.floor(wrapper.clientHeight);

      if (w < 50 || h < 50) {
        setTimeout(inject, 200);
        return;
      }

      container.innerHTML = "";

      const widgetDiv = document.createElement("div");
      widgetDiv.className = "tradingview-widget-container__widget";
      container.appendChild(widgetDiv);

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = false;
      script.textContent = JSON.stringify({
        width: w,
        height: h,
        symbol: `IDX:${stockCode}`,
        interval: "D",
        timezone: "Asia/Jakarta",
        theme: mode === "dark" ? "dark" : "light",
        style: "1",
        locale: "en",
        backgroundColor: mode === "dark" ? "rgba(12,12,12,1)" : "rgba(255,255,255,1)",
        gridColor: mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        hide_top_toolbar: true,
        hide_legend: false,
        allow_symbol_change: false,
        save_image: false,
        calendar: false,
        hide_volume: false,
        support_host: "https://www.tradingview.com",
      });
      widgetDiv.appendChild(script);
      setLoaded(true);
    }

    const timer = setTimeout(inject, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [stockCode, mode]);

  if (!stockCode) {
    return (
      <Box sx={{ p: 3, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.disabled", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
          Select a stock to view chart
        </Typography>
      </Box>
    );
  }

  return (
    <Box ref={wrapperRef} sx={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {!loaded && (
        <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <CircularProgress size={24} sx={{ color: "#c9a227" }} />
        </Box>
      )}
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ width: "100%", height: "100%" }}
      />
    </Box>
  );
}
