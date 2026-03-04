"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
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
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
      <Box
        sx={{
          width: 3, height: 20, borderRadius: 2,
          background: `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.primary.light}55)`,
          flexShrink: 0,
          boxShadow: `0 0 10px ${theme.palette.primary.main}30`,
        }}
      />
      <Box>
        <Typography variant="subtitle1" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", opacity: 0.7 }}>
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
    <Chip label={c.label} size={size} sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: size === "small" ? "0.65rem" : "0.75rem", height: size === "small" ? 20 : 26, fontFamily: '"Plus Jakarta Sans", sans-serif' }} />
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
    <Chip label={action} size="small" sx={{ bgcolor: c.bg, color: c.color, fontWeight: 800, fontSize: "0.6rem", height: 20, fontFamily: '"JetBrains Mono", monospace', letterSpacing: "0.05em" }} />
  );
}

function useBodyColor() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return isDark ? "rgba(220,225,235,0.82)" : "rgba(12,18,34,0.72)";
}

function useMutedColor() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return isDark ? "rgba(200,210,225,0.6)" : "rgba(12,18,34,0.52)";
}

function GlassCard({ children, className, sx }: { children: React.ReactNode; className?: string; sx?: Record<string, unknown> }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Paper className={className} sx={{ p: 2.5, borderRadius: 2.5, position: "relative", overflow: "hidden", transition: "border-color 0.25s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)", "&:hover": { borderColor: isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.1)", boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.35)" : "0 8px 32px rgba(0,0,0,0.07)", transform: "translateY(-1px)" }, ...sx }}>
      {children}
    </Paper>
  );
}

function MarketOverviewSection({ report }: { report: MarketIntelligenceReport }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { marketOverview: o } = report;
  const totalStocks = o.advancingCount + o.decliningCount + o.unchangedCount;
  const advPct = totalStocks > 0 ? (o.advancingCount / totalStocks) * 100 : 0;
  const decPct = totalStocks > 0 ? (o.decliningCount / totalStocks) * 100 : 0;

  return (
    <GlassCard className="animate-in animate-in-delay-1">
      <SectionHeader title="Market Overview" subtitle={`Trading day: ${o.tradingDate}`} />
      <Grid container spacing={2}>
        {([
          { label: "Total Volume", value: fmtVol(o.totalVolume) },
          { label: "Total Value", value: fmtValue(o.totalValue) },
          { label: "Advancing", value: String(o.advancingCount), color: "#34d399" },
          { label: "Declining", value: String(o.decliningCount), color: "#f87171" },
        ] as const).map((item) => (
          <Grid size={{ xs: 6, sm: 3 }} key={item.label}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.6rem" }}>{item.label}</Typography>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "1.1rem", ...("color" in item ? { color: item.color } : {}) }}>{item.value}</Typography>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#34d399", fontWeight: 600 }}>{advPct.toFixed(1)}% advancing</Typography>
          <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#f87171", fontWeight: 600 }}>{decPct.toFixed(1)}% declining</Typography>
        </Box>
        <Box sx={{ height: 6, borderRadius: 3, overflow: "hidden", display: "flex", bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
          <Box sx={{ width: `${advPct}%`, background: "linear-gradient(90deg, rgba(52,211,153,0.6), rgba(52,211,153,0.3))", transition: "width 0.6s ease" }} />
          <Box sx={{ width: `${decPct}%`, background: "linear-gradient(90deg, rgba(248,113,113,0.3), rgba(248,113,113,0.6))", transition: "width 0.6s ease", ml: "auto" }} />
        </Box>
      </Box>
      <Typography variant="body2" sx={{ mt: 2, color: useBodyColor(), fontSize: "0.85rem", lineHeight: 1.75, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{o.summary}</Typography>
    </GlassCard>
  );
}

function SectorHeatmapSection({ sectors }: { sectors: SectorPerformance[] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const sorted = [...sectors].sort((a, b) => b.change - a.change);

  return (
    <GlassCard className="animate-in animate-in-delay-2">
      <SectionHeader title="Sector Performance" subtitle="Average stock change by sector" />
      <Grid container spacing={1}>
        {sorted.map((s) => {
          const isPositive = s.change > 0;
          const changeColor = isPositive ? "#34d399" : s.change < 0 ? "#f87171" : "#fbbf24";
          const changeBg = isPositive ? "rgba(52,211,153,0.08)" : s.change < 0 ? "rgba(248,113,113,0.08)" : "rgba(251,191,36,0.06)";
          return (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={s.sector}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: changeBg, border: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)", transition: "all 0.2s ease", cursor: "default", "&:hover": { borderColor: `${changeColor}44`, transform: "translateY(-1px)" } }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 0.25, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sector}</Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.95rem", color: changeColor }}>{isPositive ? "+" : ""}{s.change.toFixed(2)}%</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", cursor: "pointer", "&:hover": { color: "primary.main" } }} onClick={() => router.push(`/stock/${s.topStock}`)}>Top: {s.topStock} ({s.topStockChange > 0 ? "+" : ""}{s.topStockChange.toFixed(1)}%)</Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </GlassCard>
  );
}

function MoverColumn({ title, icon, movers, accentColor }: { title: string; icon: React.ReactNode; movers: StockMover[]; accentColor: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box sx={{ color: accentColor, opacity: 0.7, "& .MuiSvgIcon-root": { fontSize: 18 } }}>{icon}</Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.8rem", fontFamily: '"Outfit", sans-serif' }}>{title}</Typography>
      </Box>
      <Stack spacing={0.5}>
        {movers.map((m) => (
          <Box key={m.code} onClick={() => router.push(`/stock/${m.code}`)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 0.75, borderRadius: 1.5, cursor: "pointer", transition: "all 0.15s ease", "&:hover": { bgcolor: isDark ? "rgba(212,168,67,0.06)" : "rgba(161,124,47,0.04)" } }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.02em" }}>{m.code}</Typography>
              <Typography variant="caption" sx={{ color: useMutedColor(), fontSize: "0.62rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.reason}</Typography>
            </Box>
            <Box sx={{ textAlign: "right", flexShrink: 0, ml: 1 }}>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.75rem", color: accentColor }}>{m.changePct > 0 ? "+" : ""}{m.changePct.toFixed(2)}%</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.55rem", fontFamily: '"JetBrains Mono", monospace' }}>{m.close.toLocaleString()}</Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function TopMoversSection({ report }: { report: MarketIntelligenceReport }) {
  return (
    <GlassCard className="animate-in animate-in-delay-3">
      <SectionHeader title="Top Movers" subtitle="Biggest moves of the day" />
      <Grid container spacing={3}>
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
  const { foreignFlow: f } = report;
  return (
    <GlassCard className="animate-in animate-in-delay-4">
      <SectionHeader title="Foreign Flow" subtitle="Foreign investor activity" />
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.6rem" }}>Net Foreign Flow</Typography>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "1.3rem", color: f.sentiment === "inflow" ? "#34d399" : f.sentiment === "outflow" ? "#f87171" : "text.primary" }}>{f.netFlowLabel}</Typography>
        </Box>
        <SentimentChip sentiment={f.sentiment} size="medium" />
      </Box>
      <Typography variant="body2" sx={{ color: useBodyColor(), fontSize: "0.85rem", lineHeight: 1.75, mb: 2, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{f.summary}</Typography>
      <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.04em" }}>Top Foreign Bought</Typography>
          <Stack spacing={0.25} sx={{ mt: 0.5 }}>
            {f.topBought.slice(0, 6).map((s) => (
              <Box key={s.code} onClick={() => router.push(`/stock/${s.code}`)} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5, px: 1, borderRadius: 1, cursor: "pointer", "&:hover": { bgcolor: isDark ? "rgba(52,211,153,0.06)" : "rgba(52,211,153,0.04)" } }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.7rem" }}>{s.code}</Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.7rem", color: "#34d399" }}>+{fmtValue(s.netBuy)}</Typography>
              </Box>
            ))}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: "#f87171", textTransform: "uppercase", letterSpacing: "0.04em" }}>Top Foreign Sold</Typography>
          <Stack spacing={0.25} sx={{ mt: 0.5 }}>
            {f.topSold.slice(0, 6).map((s) => (
              <Box key={s.code} onClick={() => router.push(`/stock/${s.code}`)} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5, px: 1, borderRadius: 1, cursor: "pointer", "&:hover": { bgcolor: isDark ? "rgba(248,113,113,0.06)" : "rgba(248,113,113,0.04)" } }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.7rem" }}>{s.code}</Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.7rem", color: "#f87171" }}>-{fmtValue(s.netSell)}</Typography>
              </Box>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </GlassCard>
  );
}

function NewsSentimentSection({ news }: { news: NewsItem[] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <GlassCard className="animate-in animate-in-delay-5">
      <SectionHeader title="News & Sentiment" subtitle="Market-moving headlines" />
      <Stack spacing={1}>
        {news.map((n, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 1, px: 1.5, borderRadius: 1.5, borderBottom: i < news.length - 1 ? 1 : 0, borderColor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.04)" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {n.url ? (
                <Typography
                  component="a"
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontSize: "0.78rem", fontWeight: 600, lineHeight: 1.4,
                    fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 0.25,
                    display: "block", color: "text.primary", textDecoration: "none",
                    transition: "color 0.15s ease",
                    "&:hover": { color: "primary.main", textDecoration: "underline" },
                  }}
                >
                  {n.headline}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, lineHeight: 1.4, fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 0.25 }}>{n.headline}</Typography>
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                {n.url ? (
                  <Typography
                    component="a"
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="caption"
                    sx={{
                      color: "text.secondary", fontSize: "0.6rem", fontStyle: "italic",
                      textDecoration: "none", "&:hover": { color: "primary.main", textDecoration: "underline" },
                    }}
                  >
                    {n.source}
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", fontStyle: "italic" }}>{n.source}</Typography>
                )}
                <SentimentChip sentiment={n.sentiment} />
              </Box>
              <Typography variant="caption" sx={{ color: useMutedColor(), fontSize: "0.68rem", mt: 0.5, display: "block", lineHeight: 1.5 }}>{n.impact}</Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </GlassCard>
  );
}

function StockPicksSection({ picks }: { picks: StockPick[] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  return (
    <GlassCard className="animate-in animate-in-delay-6">
      <SectionHeader title="Stock Picks" subtitle="AI-recommended stocks to watch" />
      <Grid container spacing={1.5}>
        {picks.map((p) => (
          <Grid size={{ xs: 12, sm: 6 }} key={p.code}>
            <Box onClick={() => router.push(`/stock/${p.code}`)} sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.06)", cursor: "pointer", transition: "all 0.2s ease", "&:hover": { borderColor: isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.15)", bgcolor: isDark ? "rgba(212,168,67,0.03)" : "rgba(161,124,47,0.02)", transform: "translateY(-1px)" } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.02em" }}>{p.code}</Typography>
                  <ActionChip action={p.action} />
                </Box>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>Rp {p.currentPrice.toLocaleString()}</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", fontWeight: 500, display: "block", mb: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</Typography>
              <Typography sx={{ fontSize: "0.76rem", lineHeight: 1.6, color: useBodyColor(), fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{p.rationale}</Typography>
              {p.targetPrice && (
                <Typography variant="caption" sx={{ mt: 0.5, display: "block", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", color: "primary.main", fontWeight: 600 }}>Target: Rp {p.targetPrice.toLocaleString()}</Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </GlassCard>
  );
}

function MarketOutlookSection({ report }: { report: MarketIntelligenceReport }) {
  const { marketOutlook: o } = report;
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <GlassCard className="animate-in animate-in-delay-7">
      <SectionHeader title="Market Outlook" subtitle="Short-term forecast" />
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <SentimentChip sentiment={o.sentiment} size="medium" />
      </Box>
      <Typography sx={{ fontSize: "0.88rem", lineHeight: 1.8, mb: 2, fontFamily: '"Plus Jakarta Sans", sans-serif', color: useBodyColor() }}>{o.summary}</Typography>
      <Grid container spacing={2}>
        {[
          { label: "Key Risks", items: o.keyRisks, icon: <WarningAmberIcon sx={{ fontSize: 16, color: "#f87171", opacity: 0.7 }} />, color: "#f87171", dotColor: "#f87171" },
          { label: "Key Catalysts", items: o.keyCatalysts, icon: <RocketLaunchIcon sx={{ fontSize: 16, color: "#34d399", opacity: 0.7 }} />, color: "#34d399", dotColor: "#34d399" },
        ].map((col) => (
          <Grid size={{ xs: 12, sm: 6 }} key={col.label}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              {col.icon}
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: col.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{col.label}</Typography>
            </Box>
            <Stack spacing={0.5}>
              {col.items.map((item, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1, pl: 0.5 }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: col.dotColor, mt: 0.8, flexShrink: 0, opacity: 0.6 }} />
                  <Typography variant="body2" sx={{ fontSize: "0.78rem", color: useBodyColor(), lineHeight: 1.6 }}>{item}</Typography>
                </Box>
              ))}
            </Stack>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)" }}>
        <Typography sx={{ fontSize: "0.82rem", lineHeight: 1.7, fontFamily: '"Plus Jakarta Sans", sans-serif', fontStyle: "italic", color: useBodyColor() }}>{o.shortTermForecast}</Typography>
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

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CandlestickChartIcon sx={{ fontSize: 18, color: trendColor, opacity: 0.8 }} />
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.6rem" }}>Market Trend</Typography>
        </Box>
        <Chip label={trendLabel} size="small" sx={{ bgcolor: `${trendColor}18`, color: trendColor, fontWeight: 700, fontSize: "0.65rem", height: 22, fontFamily: '"JetBrains Mono", monospace' }} />
      </Box>

      <Typography variant="body2" sx={{ color: useBodyColor(), fontSize: "0.85rem", lineHeight: 1.75, mb: 2, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{ta.marketTrendNotes}</Typography>

      {ta.keyLevels?.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: "primary.main", textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.75, display: "block" }}>Key Levels</Typography>
          <Grid container spacing={1}>
            {ta.keyLevels.map((lvl, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Box sx={{ p: 1.25, borderRadius: 1.5, border: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)", bgcolor: isDark ? "rgba(212,168,67,0.03)" : "rgba(161,124,47,0.02)" }}>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.7rem", color: "primary.main" }}>{lvl.value}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.65rem", display: "block" }}>{lvl.label}</Typography>
                  <Typography variant="caption" sx={{ color: useMutedColor(), fontSize: "0.62rem", lineHeight: 1.4 }}>{lvl.significance}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {ta.signals?.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: "primary.main", textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.75, display: "block" }}>Technical Signals</Typography>
          <Stack spacing={0.75}>
            {ta.signals.map((sig) => {
              const sigColor = sig.signal === "bullish" ? "#34d399" : sig.signal === "bearish" ? "#f87171" : "#fbbf24";
              const rsiColor = sig.rsi <= 30 ? "#34d399" : sig.rsi >= 70 ? "#f87171" : "#fbbf24";
              return (
                <Box key={sig.code} onClick={() => router.push(`/stock/${sig.code}`)} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 1, borderRadius: 1.5, cursor: "pointer", border: 1, borderColor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.03)", transition: "all 0.15s ease", "&:hover": { borderColor: `${sigColor}33`, bgcolor: isDark ? "rgba(212,168,67,0.04)" : "rgba(161,124,47,0.02)" } }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.02em" }}>{sig.code}</Typography>
                      <Chip label={sig.pattern} size="small" sx={{ bgcolor: `${sigColor}15`, color: sigColor, fontWeight: 600, fontSize: "0.55rem", height: 18, fontFamily: '"Plus Jakarta Sans", sans-serif' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: useMutedColor(), fontSize: "0.62rem", display: "block", lineHeight: 1.4 }}>{sig.notes}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0, alignItems: "center" }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="caption" sx={{ color: "#34d399", fontSize: "0.5rem", fontWeight: 600, textTransform: "uppercase", display: "block" }}>S</Typography>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.65rem" }}>{sig.support?.toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="caption" sx={{ color: "#f87171", fontSize: "0.5rem", fontWeight: 600, textTransform: "uppercase", display: "block" }}>R</Typography>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.65rem" }}>{sig.resistance?.toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="caption" sx={{ color: rsiColor, fontSize: "0.5rem", fontWeight: 600, textTransform: "uppercase", display: "block" }}>RSI</Typography>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.65rem", color: rsiColor }}>{sig.rsi}</Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {ta.volumeAnalysis && (
        <Box sx={{ pt: 1.5, borderTop: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)" }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.6rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.25, display: "block" }}>Volume Analysis</Typography>
          <Typography sx={{ fontSize: "0.82rem", lineHeight: 1.7, fontFamily: '"Plus Jakarta Sans", sans-serif', color: useBodyColor(), fontStyle: "italic" }}>{ta.volumeAnalysis}</Typography>
        </Box>
      )}
    </GlassCard>
  );
}

function ChartsSection({ report }: { report: MarketIntelligenceReport }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const cd = report.chartData;
  if (!cd) return null;

  const gridColor = isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.06)";
  const tooltipBg = isDark ? "#141b2d" : "#fff";
  const tooltipBorder = isDark ? "rgba(107,127,163,0.15)" : "rgba(12,18,34,0.08)";

  return (
    <GlassCard className="animate-in animate-in-delay-2">
      <SectionHeader title="Market Charts" subtitle="Visual data overview" />
      <Grid container spacing={2.5}>
        {cd.sectorPerformanceChart?.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: "primary.main", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1, display: "block" }}>Sector Performance</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cd.sectorPerformanceChart} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? "#8899b3" : "#6b7a90" }} tickFormatter={(v: number) => `${v.toFixed(1)}%`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 10, fill: isDark ? "#c0c8d8" : "#3d4a5c" }} width={100} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: "0.75rem" }} formatter={(v: number) => [`${v.toFixed(2)}%`, "Change"]} />
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
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: "primary.main", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1, display: "block" }}>Price History (Top Stocks)</Typography>
            <Grid container spacing={1}>
              {cd.priceHistoryCharts.slice(0, 4).map((stock) => (
                <Grid size={{ xs: 6 }} key={stock.code}>
                  <Box sx={{ p: 1, borderRadius: 1.5, border: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)" }}>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.65rem", mb: 0.25 }}>{stock.code}</Typography>
                    <ResponsiveContainer width="100%" height={60}>
                      <AreaChart data={stock.data} margin={{ left: 0, right: 0, top: 2, bottom: 2 }}>
                        <defs>
                          <linearGradient id={`grad-${stock.code}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={1.5} fill={`url(#grad-${stock.code})`} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>
        )}

        {cd.foreignFlowChart?.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: "primary.main", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1, display: "block" }}>Foreign Flow Trend</Typography>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={cd.foreignFlowChart} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: isDark ? "#8899b3" : "#6b7a90" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 9, fill: isDark ? "#8899b3" : "#6b7a90" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1e9).toFixed(0)}B`} />
                <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: "0.75rem" }} formatter={(v: number) => [`Rp ${(v / 1e9).toFixed(2)}B`, "Net Flow"]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
      <Typography variant="body2" sx={{ color: useBodyColor(), fontSize: "0.85rem", lineHeight: 1.75, mb: 2, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{ca.summary}</Typography>
      <Grid container spacing={1.5}>
        {ca.commodities.map((c) => {
          const dirColor = c.priceDirection === "up" ? "#34d399" : c.priceDirection === "down" ? "#f87171" : "#fbbf24";
          const dirLabel = c.priceDirection === "up" ? "Price Up" : c.priceDirection === "down" ? "Price Down" : "Flat";
          return (
            <Grid size={{ xs: 12, sm: 6 }} key={c.commodity}>
              <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)", transition: "border-color 0.2s", "&:hover": { borderColor: `${dirColor}33` } }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <OilBarrelIcon sx={{ fontSize: 16, color: dirColor, opacity: 0.7 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: "0.8rem", fontFamily: '"Outfit", sans-serif' }}>{c.commodity}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Chip label={dirLabel} size="small" sx={{ bgcolor: `${dirColor}15`, color: dirColor, fontWeight: 700, fontSize: "0.55rem", height: 18, fontFamily: '"JetBrains Mono", monospace' }} />
                    <SentimentChip sentiment={c.sentiment} />
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ color: useBodyColor(), fontSize: "0.75rem", lineHeight: 1.5, mb: 1, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{c.impact}</Typography>
                {c.affectedStocks?.length > 0 && (
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {c.affectedStocks.map((s) => (
                      <Chip key={s.code} label={`${s.code} ${s.correlation === "positive" ? "+" : "-"}`} size="small" onClick={() => router.push(`/stock/${s.code}`)} sx={{ cursor: "pointer", fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.55rem", height: 20, bgcolor: s.correlation === "positive" ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: s.correlation === "positive" ? "#34d399" : "#f87171", "&:hover": { bgcolor: s.correlation === "positive" ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)" } }} />
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
      <Stack spacing={1}>
        {events.map((ev, i) => {
          const tc = typeConfig[ev.type] || typeConfig.other;
          return (
            <Box key={i} sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.03)", transition: "border-color 0.2s", "&:hover": { borderColor: `${tc.color}33` } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                <BusinessIcon sx={{ fontSize: 14, color: tc.color, opacity: 0.7 }} />
                <Chip label={ev.type.toUpperCase()} size="small" sx={{ bgcolor: tc.bg, color: tc.color, fontWeight: 700, fontSize: "0.55rem", height: 18, fontFamily: '"JetBrains Mono", monospace', letterSpacing: "0.03em" }} />
                <SentimentChip sentiment={ev.sentiment} />
                {ev.companies?.length > 0 && ev.companies.map((code) => (
                  <Chip key={code} label={code} size="small" onClick={() => router.push(`/stock/${code}`)} sx={{ cursor: "pointer", fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.55rem", height: 18, bgcolor: isDark ? "rgba(212,168,67,0.08)" : "rgba(161,124,47,0.06)", color: "primary.main", "&:hover": { bgcolor: isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.1)" } }} />
                ))}
              </Box>
              {ev.url ? (
                <Typography component="a" href={ev.url} target="_blank" rel="noopener noreferrer" sx={{ fontSize: "0.8rem", fontWeight: 600, lineHeight: 1.4, fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 0.25, display: "block", color: "text.primary", textDecoration: "none", "&:hover": { color: "primary.main", textDecoration: "underline" } }}>
                  {ev.headline}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, lineHeight: 1.4, fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 0.25 }}>{ev.headline}</Typography>
              )}
              <Typography variant="body2" sx={{ color: useBodyColor(), fontSize: "0.75rem", lineHeight: 1.5, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{ev.impact}</Typography>
              {ev.source && (
                <Typography variant="caption" sx={{ color: useMutedColor(), fontSize: "0.6rem", fontStyle: "italic", mt: 0.25, display: "block" }}>{ev.source}</Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    </GlassCard>
  );
}

function PricePredictionsSection({ report }: { report: MarketIntelligenceReport }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const preds = report.pricePredictions;
  if (!preds?.length) return null;

  const confColor: Record<string, string> = { high: "#34d399", medium: "#fbbf24", low: "#f87171" };

  return (
    <GlassCard className="animate-in animate-in-delay-7">
      <SectionHeader title="Price Predictions" subtitle="Short and mid-term price targets with stop-loss" />
      <Grid container spacing={1.5}>
        {preds.map((p) => {
          const cc = confColor[p.confidence] || confColor.medium;
          const upside = p.currentPrice > 0 ? ((p.targetShortTerm - p.currentPrice) / p.currentPrice * 100).toFixed(1) : "0";
          const downside = p.currentPrice > 0 ? ((p.stopLoss - p.currentPrice) / p.currentPrice * 100).toFixed(1) : "0";
          return (
            <Grid size={{ xs: 12, sm: 6 }} key={p.code}>
              <Box onClick={() => router.push(`/stock/${p.code}`)} sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)", cursor: "pointer", transition: "all 0.2s", "&:hover": { borderColor: isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.15)", transform: "translateY(-1px)" } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TimelineIcon sx={{ fontSize: 14, color: cc, opacity: 0.7 }} />
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.85rem" }}>{p.code}</Typography>
                    <Chip label={p.confidence.toUpperCase()} size="small" sx={{ bgcolor: `${cc}18`, color: cc, fontWeight: 700, fontSize: "0.5rem", height: 16, fontFamily: '"JetBrains Mono", monospace' }} />
                  </Box>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "0.7rem", color: useMutedColor() }}>Now: Rp {p.currentPrice?.toLocaleString()}</Typography>
                </Box>
                <Typography variant="caption" sx={{ color: useMutedColor(), fontSize: "0.62rem", display: "block", mb: 0.75 }}>{p.name}</Typography>
                <Grid container spacing={1} sx={{ mb: 1 }}>
                  <Grid size={4}>
                    <Box sx={{ textAlign: "center", p: 0.5, borderRadius: 1, bgcolor: "rgba(52,211,153,0.06)" }}>
                      <Typography variant="caption" sx={{ fontSize: "0.5rem", color: "#34d399", fontWeight: 600, textTransform: "uppercase", display: "block" }}>Target 1-2w</Typography>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.7rem", color: "#34d399" }}>Rp {p.targetShortTerm?.toLocaleString()}</Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.5rem", color: "#34d399" }}>+{upside}%</Typography>
                    </Box>
                  </Grid>
                  <Grid size={4}>
                    <Box sx={{ textAlign: "center", p: 0.5, borderRadius: 1, bgcolor: "rgba(129,140,248,0.06)" }}>
                      <Typography variant="caption" sx={{ fontSize: "0.5rem", color: "#818cf8", fontWeight: 600, textTransform: "uppercase", display: "block" }}>Target 1-3m</Typography>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.7rem", color: "#818cf8" }}>Rp {p.targetMidTerm?.toLocaleString()}</Typography>
                    </Box>
                  </Grid>
                  <Grid size={4}>
                    <Box sx={{ textAlign: "center", p: 0.5, borderRadius: 1, bgcolor: "rgba(248,113,113,0.06)" }}>
                      <Typography variant="caption" sx={{ fontSize: "0.5rem", color: "#f87171", fontWeight: 600, textTransform: "uppercase", display: "block" }}>Stop Loss</Typography>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.7rem", color: "#f87171" }}>Rp {p.stopLoss?.toLocaleString()}</Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.5rem", color: "#f87171" }}>{downside}%</Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Typography variant="body2" sx={{ color: useBodyColor(), fontSize: "0.72rem", lineHeight: 1.5, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{p.rationale}</Typography>
                <Typography variant="caption" sx={{ color: useMutedColor(), fontSize: "0.58rem", mt: 0.5, display: "block", fontStyle: "italic" }}>Timeframe: {p.timeframe}</Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </GlassCard>
  );
}

export function ReportDashboard({ report }: { report: MarketIntelligenceReport }) {
  return (
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
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <NewsSentimentSection news={report.newsSentiment} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <StockPicksSection picks={report.stockPicks} />
        </Grid>
      </Grid>
      <MarketOutlookSection report={report} />
    </>
  );
}
