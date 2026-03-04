"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";

const ReportCompactContext = createContext(false);
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import OilBarrelIcon from "@mui/icons-material/OilBarrel";
import BusinessIcon from "@mui/icons-material/Business";
import TimelineIcon from "@mui/icons-material/Timeline";
import LinkIcon from "@mui/icons-material/Link";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid, Area, AreaChart,
} from "recharts";
import type {
  MarketIntelligenceReport,
  SectorPerformance,
  StockMover,
  NewsItem,
  StockPick,
  TechnicalSignal,
  CommodityItem,
  CorporateEvent,
  PricePrediction,
} from "@/lib/types";

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useTheme();
  const compact = useContext(ReportCompactContext);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: compact ? 1 : 1.5, mb: compact ? 1.5 : 2.5 }}>
      <Box
        sx={{
          width: 3,
          height: compact ? 18 : 24,
          borderRadius: 2,
          background: `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.primary.light}55)`,
          flexShrink: 0,
          boxShadow: `0 0 10px ${theme.palette.primary.main}30`,
        }}
      />
      <Box>
        <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: compact ? "1rem" : "1.15rem", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: compact ? "0.72rem" : "0.78rem", opacity: 0.7 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function fmtValue(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return sign + "Rp " + (abs / 1e12).toFixed(2) + "T";
  if (abs >= 1e9) return sign + "Rp " + (abs / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return sign + "Rp " + (abs / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return sign + "Rp " + (abs / 1e3).toFixed(1) + "K";
  return "Rp " + n.toLocaleString();
}

function fmtVol(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

export function SentimentChip({ sentiment, size = "small" }: { sentiment: string; size?: "small" | "medium" }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    bullish: { bg: "rgba(52,211,153,0.12)", color: "#34d399", label: "Bullish" },
    bearish: { bg: "rgba(248,113,113,0.12)", color: "#f87171", label: "Bearish" },
    neutral: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", label: "Neutral" },
    cautious: { bg: "rgba(251,146,60,0.12)", color: "#fb923c", label: "Cautious" },
    inflow: { bg: "rgba(52,211,153,0.12)", color: "#34d399", label: "Net Inflow" },
    outflow: { bg: "rgba(248,113,113,0.12)", color: "#f87171", label: "Net Outflow" },
  };
  const c = config[sentiment] || config.neutral;
  return (
    <Chip label={c.label} size={size} sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: size === "small" ? "0.72rem" : "0.82rem", height: size === "small" ? 24 : 30, fontFamily: '"Plus Jakarta Sans", sans-serif' }} />
  );
}

function ActionChip({ action }: { action: string }) {
  const config: Record<string, { bg: string; color: string }> = {
    BUY: { bg: "rgba(52,211,153,0.15)", color: "#34d399" },
    HOLD: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
    SELL: { bg: "rgba(248,113,113,0.15)", color: "#f87171" },
    WATCH: { bg: "rgba(129,140,248,0.15)", color: "#818cf8" },
  };
  const c = config[action] || config.HOLD;
  return (
    <Chip label={action} size="small" sx={{ bgcolor: c.bg, color: c.color, fontWeight: 800, fontSize: "0.7rem", height: 24, fontFamily: '"JetBrains Mono", monospace', letterSpacing: "0.05em" }} />
  );
}

function bodyColor(isDark: boolean) {
  return isDark ? "rgba(225,230,240,0.88)" : "rgba(12,18,34,0.78)";
}

function mutedColor(isDark: boolean) {
  return isDark ? "rgba(200,210,225,0.65)" : "rgba(12,18,34,0.55)";
}

function GlassCard({ children, className, sx }: { children: React.ReactNode; className?: string; sx?: Record<string, unknown> }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const compact = useContext(ReportCompactContext);
  return (
    <Paper
      className={className}
      sx={{
        p: compact ? { xs: 1.75, md: 2.25 } : { xs: 2.5, md: 3.5 },
        borderRadius: compact ? 2.5 : 3,
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.25s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "&:hover": {
          borderColor: isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.1)",
          boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.35)" : "0 8px 32px rgba(0,0,0,0.07)",
          transform: "translateY(-1px)",
        },
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

function MarketOverviewSection({ report }: { report: MarketIntelligenceReport }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const compact = useContext(ReportCompactContext);
  const { marketOverview: o } = report;
  const totalStocks = o.advancingCount + o.decliningCount + o.unchangedCount;
  const advPct = totalStocks > 0 ? (o.advancingCount / totalStocks) * 100 : 0;
  const decPct = totalStocks > 0 ? (o.decliningCount / totalStocks) * 100 : 0;
  const neutPct = totalStocks > 0 ? (o.unchangedCount / totalStocks) * 100 : 0;

  return (
    <GlassCard className="animate-in animate-in-delay-1">
      <SectionHeader title="Market Overview" subtitle={`Trading day: ${o.tradingDate}`} />
      <Grid container spacing={compact ? 2 : 3}>
        {([
          { label: "Total Volume", value: fmtVol(o.totalVolume) },
          { label: "Total Value", value: fmtValue(o.totalValue) },
          { label: "Advancing", value: String(o.advancingCount), color: "#34d399" },
          { label: "Declining", value: String(o.decliningCount), color: "#f87171" },
          { label: "Unchanged", value: String(o.unchangedCount), color: "#94a3b8" },
        ] as const).map((item) => (
          <Grid size={{ xs: 6, sm: 3 }} key={item.label}>
            <Typography variant="caption" sx={{ color: mutedColor(isDark), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.72rem" }}>{item.label}</Typography>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "1.35rem", ...("color" in item ? { color: item.color } : {}) }}>{item.value}</Typography>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: compact ? 2 : 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
          <Typography variant="caption" sx={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 600 }}>{advPct.toFixed(1)}% advancing</Typography>
          <Typography variant="caption" sx={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>{neutPct.toFixed(1)}% unchanged</Typography>
          <Typography variant="caption" sx={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 600 }}>{decPct.toFixed(1)}% declining</Typography>
        </Box>
        <Box sx={{ height: 8, borderRadius: 4, overflow: "hidden", display: "flex", bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
          <Box sx={{ width: `${advPct}%`, background: "linear-gradient(90deg, rgba(52,211,153,0.6), rgba(52,211,153,0.3))", transition: "width 0.6s ease" }} />
          <Box sx={{ width: `${neutPct}%`, background: isDark ? "linear-gradient(90deg, rgba(148,163,184,0.2), rgba(148,163,184,0.15))" : "linear-gradient(90deg, rgba(148,163,184,0.25), rgba(148,163,184,0.18))", transition: "width 0.6s ease" }} />
          <Box sx={{ width: `${decPct}%`, background: "linear-gradient(90deg, rgba(248,113,113,0.3), rgba(248,113,113,0.6))", transition: "width 0.6s ease", ml: "auto" }} />
        </Box>
      </Box>
      <Typography sx={{ mt: compact ? 1.5 : 2.5, color: bodyColor(isDark), fontSize: compact ? "0.95rem" : "1rem", lineHeight: 1.85, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{o.summary}</Typography>
    </GlassCard>
  );
}

function heatmapColor(change: number, isDark: boolean): string {
  const abs = Math.min(Math.abs(change), 5);
  const intensity = abs / 5;
  if (change > 0) {
    const r = Math.round(isDark ? 20 + intensity * 10 : 230 - intensity * 100);
    const g = Math.round(isDark ? 40 + intensity * 80 : 240 - intensity * 30);
    const b = Math.round(isDark ? 30 + intensity * 30 : 230 - intensity * 100);
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (change < 0) {
    const r = Math.round(isDark ? 50 + intensity * 80 : 240 - intensity * 20);
    const g = Math.round(isDark ? 20 + intensity * 10 : 230 - intensity * 100);
    const b = Math.round(isDark ? 20 + intensity * 10 : 230 - intensity * 100);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return isDark ? "rgb(45, 50, 60)" : "rgb(225, 228, 235)";
}

function heatmapTextColor(change: number, isDark: boolean): string {
  const abs = Math.min(Math.abs(change), 5);
  const intensity = abs / 5;
  if (intensity > 0.25 && isDark) return "rgba(255,255,255,0.95)";
  if (intensity > 0.25 && !isDark) return "rgba(255,255,255,0.95)";
  return isDark ? "rgba(255,255,255,0.8)" : "rgba(12,18,34,0.85)";
}

function SectorHeatmapSection({ sectors }: { sectors: SectorPerformance[] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const compact = useContext(ReportCompactContext);
  const sorted = [...sectors].sort((a, b) => b.change - a.change);
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.change)), 0.01);

  const topRowCount = Math.min(Math.ceil(sorted.length / 2), sorted.length);
  const topRow = sorted.slice(0, topRowCount);
  const bottomRow = sorted.slice(topRowCount);

  const renderTile = (s: SectorPerformance) => {
    const bg = heatmapColor(s.change, isDark);
    const textColor = heatmapTextColor(s.change, isDark);
    const isPositive = s.change > 0;
    const weight = Math.max(Math.abs(s.change) / maxAbs, 0.35);

    return (
      <Box
        key={s.sector}
        onClick={() => router.push(`/stock/${s.topStock}`)}
        sx={{
          flex: `${weight} 1 0%`,
          minWidth: compact ? { xs: 88, sm: 100 } : { xs: 100, sm: 120 },
          p: compact ? { xs: 1.25, sm: 1.5 } : { xs: 1.5, sm: 2 },
          bgcolor: bg,
          borderRadius: 1,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 0.25,
          transition: "all 0.25s ease",
          position: "relative",
          overflow: "hidden",
          "&:hover": {
            transform: "scale(1.03)",
            zIndex: 2,
            boxShadow: isDark
              ? `0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px ${bg}`
              : `0 8px 24px rgba(0,0,0,0.15), 0 0 0 1px ${bg}`,
            "& .heatmap-top-stock": { opacity: 1, maxHeight: 20 },
          },
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: "0.7rem", sm: "0.78rem" },
            fontWeight: 700,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            color: textColor,
            lineHeight: 1.2,
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {s.sector}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 800,
            fontSize: { xs: "1rem", sm: "1.15rem" },
            color: textColor,
            lineHeight: 1.2,
          }}
        >
          {isPositive ? "+" : ""}{s.change.toFixed(2)}%
        </Typography>
        <Typography
          className="heatmap-top-stock"
          sx={{
            fontSize: "0.65rem",
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 500,
            color: textColor,
            opacity: 0,
            maxHeight: 0,
            overflow: "hidden",
            transition: "all 0.2s ease",
          }}
        >
          {s.topStock} {s.topStockChange > 0 ? "+" : ""}{s.topStockChange.toFixed(1)}%
        </Typography>
      </Box>
    );
  };

  return (
    <GlassCard className="animate-in animate-in-delay-2">
      <SectionHeader title="Sector Heatmap" subtitle="Market performance by sector" />
      <Box sx={{ display: "flex", flexDirection: "column", gap: "3px", borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
          {topRow.map(renderTile)}
        </Box>
        {bottomRow.length > 0 && (
          <Box sx={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
            {bottomRow.map(renderTile)}
          </Box>
        )}
      </Box>
    </GlassCard>
  );
}

function MoverColumn({ title, icon, movers, accentColor }: { title: string; icon: React.ReactNode; movers: StockMover[]; accentColor: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Box sx={{ color: accentColor, opacity: 0.7, "& .MuiSvgIcon-root": { fontSize: 20 } }}>{icon}</Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: '"Outfit", sans-serif' }}>{title}</Typography>
      </Box>
      <Stack spacing={0.75}>
        {movers.map((m) => (
          <Box key={m.code} onClick={() => router.push(`/stock/${m.code}`)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1, borderRadius: 2, cursor: "pointer", transition: "all 0.15s ease", "&:hover": { bgcolor: isDark ? "rgba(212,168,67,0.06)" : "rgba(161,124,47,0.04)" } }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.88rem", letterSpacing: "0.02em" }}>{m.code}</Typography>
              <Typography sx={{ color: mutedColor(isDark), fontSize: "0.78rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mt: 0.25 }}>{m.reason}</Typography>
            </Box>
            <Box sx={{ textAlign: "right", flexShrink: 0, ml: 1.5 }}>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.88rem", color: accentColor }}>{m.changePct > 0 ? "+" : ""}{m.changePct.toFixed(2)}%</Typography>
              <Typography sx={{ color: mutedColor(isDark), fontSize: "0.72rem", fontFamily: '"JetBrains Mono", monospace' }}>{m.close.toLocaleString()}</Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function TopMoversSection({ report }: { report: MarketIntelligenceReport }) {
  const compact = useContext(ReportCompactContext);
  return (
    <GlassCard className="animate-in animate-in-delay-3">
      <SectionHeader title="Top Movers" subtitle="Biggest moves of the day" />
      <Grid container spacing={compact ? 2 : 3}>
        <Grid size={{ xs: 12, md: 4 }}><MoverColumn title="Gainers" icon={<TrendingUpIcon />} movers={report.topMovers.gainers} accentColor="#34d399" /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><MoverColumn title="Losers" icon={<TrendingDownIcon />} movers={report.topMovers.losers} accentColor="#f87171" /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><MoverColumn title="Most Active" icon={<WhatshotIcon />} movers={report.topMovers.mostActive} accentColor="#fbbf24" /></Grid>
      </Grid>
    </GlassCard>
  );
}

function ForeignFlowSection({ report }: { report: MarketIntelligenceReport }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const compact = useContext(ReportCompactContext);
  const { foreignFlow: f } = report;
  return (
    <GlassCard className="animate-in animate-in-delay-4">
      <SectionHeader title="Foreign Flow" subtitle="Foreign investor activity" />
      <Box sx={{ display: "flex", alignItems: "center", gap: compact ? 1.5 : 2.5, mb: compact ? 1.5 : 2.5, flexWrap: "wrap" }}>
        <Box>
          <Typography sx={{ color: mutedColor(isDark), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.72rem" }}>Net Foreign Flow</Typography>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: compact ? "1.4rem" : "1.6rem", color: f.sentiment === "inflow" ? "#34d399" : f.sentiment === "outflow" ? "#f87171" : "text.primary" }}>{f.netFlowLabel}</Typography>
        </Box>
        <SentimentChip sentiment={f.sentiment} size="medium" />
      </Box>
      <Typography sx={{ color: bodyColor(isDark), fontSize: compact ? "0.95rem" : "1rem", lineHeight: 1.85, mb: compact ? 1.5 : 2.5, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{f.summary}</Typography>
      <Grid container spacing={compact ? 1.5 : 2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1 }}>Top Foreign Bought</Typography>
          <Stack spacing={0.5}>
            {f.topBought.slice(0, 6).map((s) => (
              <Box key={s.code} onClick={() => router.push(`/stock/${s.code}`)} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.75, px: 1.5, borderRadius: 1.5, cursor: "pointer", "&:hover": { bgcolor: isDark ? "rgba(52,211,153,0.06)" : "rgba(52,211,153,0.04)" } }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.85rem" }}>{s.code}</Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.85rem", color: "#34d399" }}>+{fmtValue(s.netBuy)}</Typography>
              </Box>
            ))}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", color: "#f87171", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1 }}>Top Foreign Sold</Typography>
          <Stack spacing={0.5}>
            {f.topSold.slice(0, 6).map((s) => (
              <Box key={s.code} onClick={() => router.push(`/stock/${s.code}`)} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.75, px: 1.5, borderRadius: 1.5, cursor: "pointer", "&:hover": { bgcolor: isDark ? "rgba(248,113,113,0.06)" : "rgba(248,113,113,0.04)" } }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.85rem" }}>{s.code}</Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.85rem", color: "#f87171" }}>-{fmtValue(s.netSell)}</Typography>
              </Box>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </GlassCard>
  );
}

function NewsSentimentSection({
  news,
  fillHeight = false,
}: {
  news: NewsItem[];
  fillHeight?: boolean;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <GlassCard
      className="animate-in animate-in-delay-5"
      sx={fillHeight ? { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } : undefined}
    >
      <SectionHeader title="News & Sentiment" subtitle="Market-moving headlines" />
      <Stack spacing={1.5} sx={fillHeight ? { flex: 1, minHeight: 0 } : undefined}>
        {news.map((n, i) => (
          <Box
            key={i}
            sx={{
              py: { xs: 1.25, sm: 1.5 },
              px: { xs: 1.25, sm: 2 },
              borderRadius: 2,
              borderBottom: i < news.length - 1 ? 1 : 0,
              borderColor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.04)",
              minWidth: 0,
            }}
          >
            {n.url ? (
              <Typography
                component="a"
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontSize: { xs: "0.88rem", sm: "0.95rem" },
                  fontWeight: 600,
                  lineHeight: 1.5,
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  mb: 0.5,
                  display: "block",
                  color: "text.primary",
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                  wordBreak: "break-word",
                  "&:hover": { color: "primary.main", textDecoration: "underline" },
                }}
              >
                {n.headline}
              </Typography>
            ) : (
              <Typography sx={{ fontSize: { xs: "0.88rem", sm: "0.95rem" }, fontWeight: 600, lineHeight: 1.5, fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 0.5, wordBreak: "break-word" }}>{n.headline}</Typography>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.75 }}>
              {n.url ? (
                <Typography component="a" href={n.url} target="_blank" rel="noopener noreferrer" sx={{ color: mutedColor(isDark), fontSize: "0.7rem", fontStyle: "italic", textDecoration: "none", "&:hover": { color: "primary.main", textDecoration: "underline" } }}>{n.source}</Typography>
              ) : (
                <Typography sx={{ color: mutedColor(isDark), fontSize: "0.7rem", fontStyle: "italic" }}>{n.source}</Typography>
              )}
              <SentimentChip sentiment={n.sentiment} />
            </Box>
            <Typography sx={{ color: bodyColor(isDark), fontSize: { xs: "0.82rem", sm: "0.88rem" }, lineHeight: 1.7, fontFamily: '"Plus Jakarta Sans", sans-serif', wordBreak: "break-word" }}>{n.impact}</Typography>
          </Box>
        ))}
      </Stack>
    </GlassCard>
  );
}

function StockPicksSection({
  picks,
  fillHeight = false,
}: {
  picks: StockPick[];
  fillHeight?: boolean;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  return (
    <GlassCard
      className="animate-in animate-in-delay-6"
      sx={fillHeight ? { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } : undefined}
    >
      <SectionHeader title="Stock Picks" subtitle="AI-recommended stocks to watch" />
      <Box sx={fillHeight ? { flex: 1, minHeight: 0, overflow: "auto" } : undefined}>
        <Grid container spacing={2}>
          {picks.map((p) => (
            <Grid size={{ xs: 12, sm: 6 }} key={p.code} sx={{ display: "flex" }}>
              <Box
                onClick={() => router.push(`/stock/${p.code}`)}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: 1,
                  borderColor: isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.06)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  width: "100%",
                  minHeight: "100%",
                  display: "flex",
                  flexDirection: "column",
                  boxSizing: "border-box",
                  "&:hover": {
                    borderColor: isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.15)",
                    bgcolor: isDark ? "rgba(212,168,67,0.03)" : "rgba(161,124,47,0.02)",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, flexShrink: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "1rem", letterSpacing: "0.02em" }}>{p.code}</Typography>
                    <ActionChip action={p.action} />
                  </Box>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.88rem", color: mutedColor(isDark), flexShrink: 0 }}>Rp {p.currentPrice.toLocaleString()}</Typography>
                </Box>
                <Typography sx={{ color: mutedColor(isDark), fontSize: "0.78rem", fontWeight: 500, display: "block", mb: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{p.name}</Typography>
                <Typography sx={{ fontSize: "0.9rem", lineHeight: 1.7, color: bodyColor(isDark), fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{p.rationale}</Typography>
                {p.targetPrice ? (
                  <Typography sx={{ mt: 0.75, fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78rem", color: "primary.main", fontWeight: 600, flexShrink: 0 }}>Target: Rp {p.targetPrice.toLocaleString()}</Typography>
                ) : null}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </GlassCard>
  );
}

function MarketOutlookSection({ report }: { report: MarketIntelligenceReport }) {
  const { marketOutlook: o } = report;
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const compact = useContext(ReportCompactContext);
  return (
    <GlassCard className="animate-in animate-in-delay-7">
      <SectionHeader title="Market Outlook" subtitle="Short-term forecast" />
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: compact ? 1.5 : 2.5 }}>
        <SentimentChip sentiment={o.sentiment} size="medium" />
      </Box>
      <Typography sx={{ fontSize: compact ? "0.98rem" : "1.05rem", lineHeight: 1.9, mb: compact ? 1.5 : 2.5, fontFamily: '"Plus Jakarta Sans", sans-serif', color: bodyColor(isDark) }}>{o.summary}</Typography>
      <Grid container spacing={compact ? 2 : 3}>
        {[
          { label: "Key Risks", items: o.keyRisks, icon: <WarningAmberIcon sx={{ fontSize: 18, color: "#f87171", opacity: 0.7 }} />, color: "#f87171", dotColor: "#f87171" },
          { label: "Key Catalysts", items: o.keyCatalysts, icon: <RocketLaunchIcon sx={{ fontSize: 18, color: "#34d399", opacity: 0.7 }} />, color: "#34d399", dotColor: "#34d399" },
        ].map((col) => (
          <Grid size={{ xs: 12, sm: 6 }} key={col.label}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              {col.icon}
              <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: col.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{col.label}</Typography>
            </Box>
            <Stack spacing={0.75}>
              {col.items.map((item, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1, pl: 0.5 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: col.dotColor, mt: "0.55em", flexShrink: 0, opacity: 0.6 }} />
                  <Typography sx={{ fontSize: "0.92rem", color: bodyColor(isDark), lineHeight: 1.7 }}>{item}</Typography>
                </Box>
              ))}
            </Stack>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: compact ? 2 : 3, pt: compact ? 1.5 : 2, borderTop: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)" }}>
        <Typography sx={{ fontSize: compact ? "0.9rem" : "0.95rem", lineHeight: 1.8, fontFamily: '"Plus Jakarta Sans", sans-serif', fontStyle: "italic", color: bodyColor(isDark) }}>{o.shortTermForecast}</Typography>
      </Box>
    </GlassCard>
  );
}

function TechnicalAnalysisSection({ report }: { report: MarketIntelligenceReport }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const ta = report.technicalAnalysis;

  if (!ta) return null;

  const trendColor = ta.marketTrend === "uptrend" ? "#34d399" : ta.marketTrend === "downtrend" ? "#f87171" : "#fbbf24";
  const trendLabel = ta.marketTrend === "uptrend" ? "Uptrend" : ta.marketTrend === "downtrend" ? "Downtrend" : "Sideways";

  return (
    <GlassCard className="animate-in animate-in-delay-4">
      <SectionHeader title="Technical Analysis" subtitle="Price action, patterns & key levels" />

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CandlestickChartIcon sx={{ fontSize: 20, color: trendColor, opacity: 0.8 }} />
          <Typography sx={{ color: mutedColor(isDark), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.72rem" }}>Market Trend</Typography>
        </Box>
        <Chip label={trendLabel} size="small" sx={{ bgcolor: `${trendColor}18`, color: trendColor, fontWeight: 700, fontSize: "0.78rem", height: 26, fontFamily: '"JetBrains Mono", monospace' }} />
      </Box>

      <Typography sx={{ color: bodyColor(isDark), fontSize: { xs: "0.92rem", sm: "1rem" }, lineHeight: 1.85, mb: 2.5, fontFamily: '"Plus Jakarta Sans", sans-serif', wordBreak: "break-word" }}>{ta.marketTrendNotes}</Typography>

      {ta.keyLevels?.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "primary.main", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1.5 }}>Key Levels</Typography>
          <Grid container spacing={1.5}>
            {ta.keyLevels.map((lvl, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Box sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, border: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)", bgcolor: isDark ? "rgba(212,168,67,0.03)" : "rgba(161,124,47,0.02)", height: "100%", minWidth: 0 }}>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: { xs: "0.82rem", sm: "0.88rem" }, color: "primary.main", wordBreak: "break-word" }}>{lvl.value}</Typography>
                  <Typography sx={{ fontWeight: 600, fontSize: { xs: "0.78rem", sm: "0.82rem" }, mt: 0.25 }}>{lvl.label}</Typography>
                  <Typography sx={{ color: mutedColor(isDark), fontSize: { xs: "0.74rem", sm: "0.78rem" }, lineHeight: 1.5, mt: 0.25, wordBreak: "break-word" }}>{lvl.significance}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {ta.signals?.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "primary.main", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1.5 }}>Technical Signals</Typography>
          <Stack spacing={1}>
            {ta.signals.map((sig) => {
              const sigColor = sig.signal === "bullish" ? "#34d399" : sig.signal === "bearish" ? "#f87171" : "#fbbf24";
              const rsiColor = sig.rsi <= 30 ? "#34d399" : sig.rsi >= 70 ? "#f87171" : "#fbbf24";
              return (
                <Box
                  key={sig.code}
                  onClick={() => router.push(`/stock/${sig.code}`)}
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: { xs: 1.25, sm: 2 },
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 1.25, sm: 1.25 },
                    borderRadius: 2,
                    cursor: "pointer",
                    border: 1,
                    borderColor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.03)",
                    transition: "all 0.15s ease",
                    "&:hover": { borderColor: `${sigColor}33`, bgcolor: isDark ? "rgba(212,168,67,0.04)" : "rgba(161,124,47,0.02)" },
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: { xs: "0.88rem", sm: "0.92rem" }, letterSpacing: "0.02em" }}>{sig.code}</Typography>
                      <Chip label={sig.pattern} size="small" sx={{ bgcolor: `${sigColor}15`, color: sigColor, fontWeight: 600, fontSize: "0.65rem", height: 20, fontFamily: '"Plus Jakarta Sans", sans-serif' }} />
                    </Box>
                    <Typography sx={{ color: bodyColor(isDark), fontSize: { xs: "0.78rem", sm: "0.82rem" }, lineHeight: 1.5 }}>{sig.notes}</Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      gap: { xs: 0.5, sm: 0.75 },
                      flexShrink: 0,
                      alignItems: "stretch",
                      width: { xs: "100%", sm: 240 },
                      minWidth: 0,
                    }}
                  >
                    <Box sx={{ flex: 1, textAlign: "center", py: { xs: 0.5, sm: 0.75 }, borderRadius: 1.5, bgcolor: "rgba(52,211,153,0.06)", minWidth: 0 }}>
                      <Typography sx={{ color: "#34d399", fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.25 }}>Support</Typography>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: { xs: "0.72rem", sm: "0.82rem" }, overflow: "hidden", textOverflow: "ellipsis" }}>{sig.support?.toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: "center", py: { xs: 0.5, sm: 0.75 }, borderRadius: 1.5, bgcolor: "rgba(248,113,113,0.06)", minWidth: 0 }}>
                      <Typography sx={{ color: "#f87171", fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.25 }}>Resist</Typography>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: { xs: "0.72rem", sm: "0.82rem" }, overflow: "hidden", textOverflow: "ellipsis" }}>{sig.resistance?.toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: "center", py: { xs: 0.5, sm: 0.75 }, borderRadius: 1.5, bgcolor: `${rsiColor}0a`, minWidth: 0 }}>
                      <Typography sx={{ color: rsiColor, fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.25 }}>RSI</Typography>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: { xs: "0.72rem", sm: "0.82rem" }, color: rsiColor }}>{sig.rsi}</Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {ta.volumeAnalysis && (
        <Box sx={{ pt: 2, borderTop: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)" }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.72rem", color: mutedColor(isDark), textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.5 }}>Volume Analysis</Typography>
          <Typography sx={{ fontSize: { xs: "0.88rem", sm: "0.95rem" }, lineHeight: 1.8, fontFamily: '"Plus Jakarta Sans", sans-serif', color: bodyColor(isDark), fontStyle: "italic", wordBreak: "break-word" }}>{ta.volumeAnalysis}</Typography>
        </Box>
      )}
    </GlassCard>
  );
}

function ChartsSection({ report }: { report: MarketIntelligenceReport }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const compact = useContext(ReportCompactContext);
  const cd = report.chartData;
  if (!cd) return null;

  const gridColor = isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.06)";
  const tooltipBg = isDark ? "#141b2d" : "#fff";
  const tooltipBorder = isDark ? "rgba(107,127,163,0.15)" : "rgba(12,18,34,0.08)";

  return (
    <GlassCard className="animate-in animate-in-delay-2">
      <SectionHeader title="Market Charts" subtitle="Visual data overview" />
      <Grid container spacing={compact ? 2 : 3}>
        {cd.sectorPerformanceChart?.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "primary.main", textTransform: "uppercase", letterSpacing: "0.04em", mb: compact ? 1 : 1.5 }}>Sector Performance</Typography>
            <ResponsiveContainer width="100%" height={compact ? 220 : 260}>
              <BarChart data={cd.sectorPerformanceChart} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: isDark ? "#9aabbf" : "#6b7a90" }} tickFormatter={(v: number) => `${v.toFixed(1)}%`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 11, fill: isDark ? "#c8d0de" : "#3d4a5c" }} width={110} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: "0.85rem" }} labelStyle={{ color: isDark ? "#9aabbf" : "#6b7a90" }} itemStyle={{ color: isDark ? "#e1e6f0" : "#1a1a2e" }} formatter={(v: number) => [`${v.toFixed(2)}%`, "Change"]} />
                <Bar dataKey="change" radius={[0, 4, 4, 0]}>
                  {cd.sectorPerformanceChart.map((entry, i) => (
                    <Cell key={i} fill={entry.change >= 0 ? "rgba(52,211,153,0.7)" : "rgba(248,113,113,0.7)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Grid>
        )}

        {cd.priceHistoryCharts?.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "primary.main", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1.5 }}>Price History (Top Stocks)</Typography>
            <Grid container spacing={1.5}>
              {cd.priceHistoryCharts.slice(0, 4).map((stock) => {
                const d = stock.data;
                const first = d[0]?.value ?? 0;
                const last = d[d.length - 1]?.value ?? 0;
                const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
                const isUp = changePct >= 0;
                const lineColor = isUp ? "#34d399" : "#f87171";
                const gradId = `phgrad-${stock.code}`;
                return (
                  <Grid size={{ xs: 6 }} key={stock.code}>
                    <Box sx={{ p: 1.5, pb: 0.5, borderRadius: 2.5, border: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)", transition: "border-color 0.2s, box-shadow 0.3s", "&:hover": { borderColor: `${lineColor}44`, boxShadow: isDark ? `0 4px 20px rgba(0,0,0,0.25)` : `0 4px 20px rgba(0,0,0,0.05)` } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.25 }}>
                        <Box>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.88rem", letterSpacing: "0.02em", lineHeight: 1.2 }}>{stock.code}</Typography>
                          {stock.name && <Typography sx={{ color: mutedColor(isDark), fontSize: "0.62rem", lineHeight: 1.2, mt: 0.25, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stock.name}</Typography>}
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.2 }}>{last.toLocaleString()}</Typography>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.65rem", color: lineColor, lineHeight: 1.2, mt: 0.25 }}>
                            {isUp ? "+" : ""}{changePct.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      <ResponsiveContainer width="100%" height={95}>
                        <AreaChart data={d} margin={{ left: -4, right: -4, top: 6, bottom: 0 }}>
                          <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                              <stop offset="85%" stopColor={lineColor} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <Tooltip
                            cursor={{ stroke: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)", strokeWidth: 1 }}
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const pt = payload[0].payload as { date: string; value: number };
                              let dateStr = pt.date;
                              try {
                                dateStr = new Date(pt.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                              } catch { /* use raw */ }
                              return (
                                <Box sx={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 2, px: 1.25, py: 0.75, fontFamily: '"JetBrains Mono", monospace', boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.08)" }}>
                                  <Typography sx={{ fontSize: "0.62rem", color: mutedColor(isDark), lineHeight: 1.2, mb: 0.25 }}>{dateStr}</Typography>
                                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: lineColor }}>Rp {pt.value?.toLocaleString()}</Typography>
                                </Box>
                              );
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={lineColor}
                            strokeWidth={2}
                            fill={`url(#${gradId})`}
                            dot={{ r: 2, fill: lineColor, strokeWidth: 0, opacity: 0.5 }}
                            activeDot={{ r: 4, fill: lineColor, stroke: isDark ? "#141b2d" : "#fff", strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>
        )}

        {cd.foreignFlowChart?.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "primary.main", textTransform: "uppercase", letterSpacing: "0.04em", mb: compact ? 1 : 1.5 }}>Foreign Flow Trend</Typography>
            <ResponsiveContainer width="100%" height={compact ? 150 : 180}>
              <BarChart data={cd.foreignFlowChart} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: isDark ? "#9aabbf" : "#6b7a90" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: isDark ? "#9aabbf" : "#6b7a90" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1e9).toFixed(0)}B`} />
                <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: "0.85rem" }} labelStyle={{ color: isDark ? "#9aabbf" : "#6b7a90" }} itemStyle={{ color: isDark ? "#e1e6f0" : "#1a1a2e" }} formatter={(v: number) => [`Rp ${(v / 1e9).toFixed(2)}B`, "Net Flow"]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {cd.foreignFlowChart.map((entry, i) => (
                    <Cell key={i} fill={entry.value >= 0 ? "rgba(52,211,153,0.6)" : "rgba(248,113,113,0.6)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Grid>
        )}
      </Grid>
    </GlassCard>
  );
}

function CommodityAnalysisSection({ report }: { report: MarketIntelligenceReport }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const ca = report.commodityAnalysis;
  if (!ca) return null;

  return (
    <GlassCard className="animate-in animate-in-delay-5">
      <SectionHeader title="Commodity Analysis" subtitle="Global commodity impact on IDX" />
      <Typography sx={{ color: bodyColor(isDark), fontSize: "1rem", lineHeight: 1.85, mb: 2.5, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{ca.summary}</Typography>
      <Grid container spacing={2}>
        {ca.commodities.map((c) => {
          const dirColor = c.priceDirection === "up" ? "#34d399" : c.priceDirection === "down" ? "#f87171" : "#fbbf24";
          const dirLabel = c.priceDirection === "up" ? "Price Up" : c.priceDirection === "down" ? "Price Down" : "Flat";
          return (
            <Grid size={{ xs: 12, sm: 6 }} key={c.commodity}>
              <Box sx={{ p: 2, borderRadius: 2.5, border: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)", transition: "border-color 0.2s", "&:hover": { borderColor: `${dirColor}33` } }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <OilBarrelIcon sx={{ fontSize: 18, color: dirColor, opacity: 0.7 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: '"Outfit", sans-serif' }}>{c.commodity}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    <Chip label={dirLabel} size="small" sx={{ bgcolor: `${dirColor}15`, color: dirColor, fontWeight: 700, fontSize: "0.68rem", height: 22, fontFamily: '"JetBrains Mono", monospace' }} />
                    <SentimentChip sentiment={c.sentiment} />
                  </Box>
                </Box>
                <Typography sx={{ color: bodyColor(isDark), fontSize: "0.9rem", lineHeight: 1.7, mb: 1.25, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{c.impact}</Typography>
                {c.affectedStocks?.length > 0 && (
                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                    {c.affectedStocks.map((s) => (
                      <Chip key={s.code} label={`${s.code} ${s.correlation === "positive" ? "+" : "-"}`} size="small" onClick={() => router.push(`/stock/${s.code}`)} sx={{ cursor: "pointer", fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.7rem", height: 24, bgcolor: s.correlation === "positive" ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: s.correlation === "positive" ? "#34d399" : "#f87171", "&:hover": { bgcolor: s.correlation === "positive" ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)" } }} />
                    ))}
                  </Box>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </GlassCard>
  );
}

function CorporateEventsSection({ report }: { report: MarketIntelligenceReport }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const events = report.corporateEvents;
  if (!events?.length) return null;

  const typeConfig: Record<string, { bg: string; color: string }> = {
    acquisition: { bg: "rgba(129,140,248,0.12)", color: "#818cf8" },
    cooperation: { bg: "rgba(52,211,153,0.12)", color: "#34d399" },
    merger: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
    divestment: { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
    rumor: { bg: "rgba(251,146,60,0.12)", color: "#fb923c" },
    ipo: { bg: "rgba(56,189,248,0.12)", color: "#38bdf8" },
    restructuring: { bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
    other: { bg: "rgba(107,127,163,0.1)", color: "#6b7fa3" },
  };

  return (
    <GlassCard className="animate-in animate-in-delay-6">
      <SectionHeader title="Corporate Events & Rumors" subtitle="Acquisitions, cooperations, and market gossip" />
      <Stack spacing={1.5}>
        {events.map((ev, i) => {
          const tc = typeConfig[ev.type] || typeConfig.other;
          return (
            <Box key={i} sx={{ p: 2, borderRadius: 2.5, border: 1, borderColor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.03)", transition: "border-color 0.2s", "&:hover": { borderColor: `${tc.color}33` } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75, flexWrap: "wrap" }}>
                <BusinessIcon sx={{ fontSize: 16, color: tc.color, opacity: 0.7 }} />
                <Chip label={ev.type.toUpperCase()} size="small" sx={{ bgcolor: tc.bg, color: tc.color, fontWeight: 700, fontSize: "0.68rem", height: 22, fontFamily: '"JetBrains Mono", monospace', letterSpacing: "0.03em" }} />
                <SentimentChip sentiment={ev.sentiment} />
                {ev.companies?.length > 0 && ev.companies.map((code) => (
                  <Chip key={code} label={code} size="small" onClick={() => router.push(`/stock/${code}`)} sx={{ cursor: "pointer", fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.7rem", height: 22, bgcolor: isDark ? "rgba(212,168,67,0.08)" : "rgba(161,124,47,0.06)", color: "primary.main", "&:hover": { bgcolor: isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.1)" } }} />
                ))}
              </Box>
              {ev.url ? (
                <Typography component="a" href={ev.url} target="_blank" rel="noopener noreferrer" sx={{ fontSize: "0.95rem", fontWeight: 600, lineHeight: 1.5, fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 0.5, display: "block", color: "text.primary", textDecoration: "none", "&:hover": { color: "primary.main", textDecoration: "underline" } }}>
                  {ev.headline}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, lineHeight: 1.5, fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 0.5 }}>{ev.headline}</Typography>
              )}
              <Typography sx={{ color: bodyColor(isDark), fontSize: "0.9rem", lineHeight: 1.7, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{ev.impact}</Typography>
              {ev.source && (
                <Typography sx={{ color: mutedColor(isDark), fontSize: "0.72rem", fontStyle: "italic", mt: 0.5 }}>{ev.source}</Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    </GlassCard>
  );
}

function PricePredictionCard({ p, isDark, onNavigate }: { p: PricePrediction; isDark: boolean; onNavigate: () => void }) {
  const confColor: Record<string, string> = { high: "#34d399", medium: "#fbbf24", low: "#f87171" };
  const cc = confColor[p.confidence] || confColor.medium;
  const upsideShort = p.currentPrice > 0 ? ((p.targetShortTerm - p.currentPrice) / p.currentPrice * 100) : 0;
  const upsideMid = p.currentPrice > 0 ? ((p.targetMidTerm - p.currentPrice) / p.currentPrice * 100) : 0;
  const downside = p.currentPrice > 0 ? ((p.stopLoss - p.currentPrice) / p.currentPrice * 100) : 0;
  const rrRatio = Math.abs(downside) > 0 ? (upsideShort / Math.abs(downside)).toFixed(1) : "-";

  return (
    <Box
      onClick={onNavigate}
      sx={{
        position: "relative",
        borderRadius: 3,
        overflow: "hidden",
        cursor: "pointer",
        border: 1,
        borderColor: isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.06)",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "&:hover": {
          borderColor: `${cc}44`,
          boxShadow: isDark ? `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${cc}22` : `0 8px 32px rgba(0,0,0,0.06), 0 0 0 1px ${cc}15`,
          transform: "translateY(-2px)",
        },
      }}
    >
      <Box sx={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: `linear-gradient(180deg, ${cc}, ${cc}33)` }} />

      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TimelineIcon sx={{ fontSize: 18, color: cc }} />
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.03em" }}>{p.code}</Typography>
            <Chip
              label={p.confidence.toUpperCase()}
              size="small"
              sx={{
                bgcolor: `${cc}15`,
                color: cc,
                fontWeight: 800,
                fontSize: "0.6rem",
                height: 22,
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: "0.06em",
                border: `1px solid ${cc}30`,
              }}
            />
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ color: mutedColor(isDark), fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1 }}>Now</Typography>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}>Rp {p.currentPrice?.toLocaleString()}</Typography>
          </Box>
        </Box>

        <Typography sx={{ color: mutedColor(isDark), fontSize: "0.78rem", fontWeight: 500, mb: 2, pl: 0.25 }}>{p.name}</Typography>

        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          {[
            { label: "Target 1-2W", value: p.targetShortTerm, pct: upsideShort, color: "#34d399", bg: "rgba(52,211,153,0.06)", borderColor: "rgba(52,211,153,0.12)" },
            { label: "Target 1-3M", value: p.targetMidTerm, pct: upsideMid, color: "#818cf8", bg: "rgba(129,140,248,0.06)", borderColor: "rgba(129,140,248,0.12)" },
            { label: "Stop Loss", value: p.stopLoss, pct: downside, color: "#f87171", bg: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.12)" },
          ].map((t) => (
            <Box
              key={t.label}
              sx={{
                flex: 1,
                textAlign: "center",
                py: 1.25,
                px: 1,
                borderRadius: 2,
                bgcolor: t.bg,
                border: `1px solid ${t.borderColor}`,
                position: "relative",
              }}
            >
              <Typography sx={{ fontSize: "0.58rem", color: t.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>{t.label}</Typography>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.95rem", color: t.color, lineHeight: 1.2 }}>Rp {t.value?.toLocaleString()}</Typography>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem", color: t.color, mt: 0.25, opacity: 0.8, fontWeight: 600 }}>
                {t.pct >= 0 ? "+" : ""}{t.pct.toFixed(1)}%
              </Typography>
            </Box>
          ))}
        </Box>

        <Typography sx={{ color: bodyColor(isDark), fontSize: "0.88rem", lineHeight: 1.75, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{p.rationale}</Typography>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.25 }}>
          <Typography sx={{ color: mutedColor(isDark), fontSize: "0.7rem", fontStyle: "italic", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Timeframe: {p.timeframe}</Typography>
          {rrRatio !== "-" && (
            <Chip
              label={`R:R ${rrRatio}`}
              size="small"
              sx={{
                height: 22,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.62rem",
                fontWeight: 700,
                bgcolor: `${Number(rrRatio) >= 2 ? "#34d399" : Number(rrRatio) >= 1 ? "#fbbf24" : "#f87171"}15`,
                color: Number(rrRatio) >= 2 ? "#34d399" : Number(rrRatio) >= 1 ? "#fbbf24" : "#f87171",
                letterSpacing: "0.03em",
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}

function PricePredictionsSection({ report }: { report: MarketIntelligenceReport }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const preds = report.pricePredictions;
  if (!preds?.length) return null;

  return (
    <GlassCard className="animate-in animate-in-delay-7">
      <SectionHeader title="Price Predictions" subtitle="Short and mid-term price targets with stop-loss" />
      <Grid container spacing={2.5}>
        {preds.map((p) => (
          <Grid size={{ xs: 12, sm: 6 }} key={p.code}>
            <PricePredictionCard p={p} isDark={isDark} onNavigate={() => router.push(`/stock/${p.code}`)} />
          </Grid>
        ))}
      </Grid>
    </GlassCard>
  );
}

export function ReportDashboard({
  report,
  compact = false,
}: {
  report: MarketIntelligenceReport;
  compact?: boolean;
}) {
  const content = (
    <>
      <MarketOverviewSection report={report} />
      <ChartsSection report={report} />
      <SectorHeatmapSection sectors={report.sectorPerformance} />
      <TopMoversSection report={report} />
      <TechnicalAnalysisSection report={report} />
      <PricePredictionsSection report={report} />
      <ForeignFlowSection report={report} />
      <CommodityAnalysisSection report={report} />
      <CorporateEventsSection report={report} />
      <Grid container spacing={compact ? 1.5 : 2.5}>
        <Grid
          size={{ xs: 12, lg: report.stockPicks?.length ? 6 : 12 }}
          sx={
            report.stockPicks?.length
              ? { display: "flex", flexDirection: "column", minHeight: 0 }
              : undefined
          }
        >
          <NewsSentimentSection
            news={report.newsSentiment}
            fillHeight={Boolean(report.stockPicks?.length)}
          />
        </Grid>
        {report.stockPicks?.length ? (
          <Grid
            size={{ xs: 12, lg: 6 }}
            sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            <StockPicksSection picks={report.stockPicks} fillHeight />
          </Grid>
        ) : null}
      </Grid>
      <MarketOutlookSection report={report} />
    </>
  );
  return (
    <ReportCompactContext.Provider value={compact}>
      {compact ? <Stack spacing={1.5}>{content}</Stack> : content}
    </ReportCompactContext.Provider>
  );
}
