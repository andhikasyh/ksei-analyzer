"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { formatValue } from "@/lib/types";
import {
  FlowAnalysis,
  runFlowAnalysis,
  VerdictFactor,
  WyckoffPhase,
  CADIPoint,
  BrokerStreak,
  OHLCVPoint,
} from "@/lib/flowAnalysis";
import {
  ComposedChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import { TradingViewChart } from "@/components/TradingViewChart";

const PHASE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ACC: { bg: "rgba(34,197,94,0.12)", text: "#22c55e", label: "Accumulation" },
  MU: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", label: "Markup" },
  DIS: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", label: "Distribution" },
  MD: { bg: "rgba(249,115,22,0.12)", text: "#f97316", label: "Markdown" },
};

const SIGNAL_STYLES = {
  ACCUMULATION: { color: "#22c55e", arrow: "\u25B2", bg: "rgba(34,197,94,0.1)" },
  DISTRIBUTION: { color: "#ef4444", arrow: "\u25BC", bg: "rgba(239,68,68,0.1)" },
  NEUTRAL: { color: "#94a3b8", arrow: "\u25CF", bg: "rgba(148,163,184,0.1)" },
};

interface FlowAnalysisPanelProps {
  stockCode: string;
}

export function FlowAnalysisPanel({ stockCode }: FlowAnalysisPanelProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [data, setData] = useState<FlowAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    runFlowAnalysis(stockCode).then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [stockCode]);

  if (loading) return <FlowAnalysisSkeleton />;
  if (!data) return <EmptyState />;

  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const surfaceBg = isDark ? "rgba(255,255,255,0.02)" : "#f5f4f1";
  const textColor = isDark ? "#737373" : "#737373";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const tooltipStyle = {
    background: isDark ? "#0d1526" : "#f0eeeb",
    border: `1px solid ${isDark ? "rgba(107,127,163,0.2)" : "#e4e4e7"}`,
    borderRadius: "10px",
    fontSize: "11px",
    color: isDark ? "#e8edf5" : "#0c1222",
    boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.5)" : "0 8px 24px rgba(15,23,42,0.12)",
  };

  return (
    <Stack spacing={2}>
      <VerdictCard data={data} isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <CADIChart cadi={data.cadi} isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} textColor={textColor} gridColor={gridColor} tooltipStyle={tooltipStyle} />
            <VWAPDeviationCard data={data} isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Advanced Signals
            </Typography>
            <CorrelationCard data={data} isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} />
            <SMTCard data={data} isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} />
            <ExplosionRateCard isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} />
            <ConcentrationCard data={data} isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} />
          </Stack>
        </Grid>
      </Grid>
      <Box>
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase", mb: 1 }}>
          Price Chart
        </Typography>
        <TradingViewChart stockCode={stockCode} />
        {data.wyckoff.length > 0 && (
          <Box sx={{ display: "flex", gap: 0.5, mt: 1.5, flexWrap: "wrap" }}>
            {["ACC", "MU", "DIS", "MD"].map((key) => {
              const style = PHASE_COLORS[key];
              return (
                <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: style.bg, border: "1px solid", borderColor: style.text }} />
                  <Typography sx={{ fontSize: "0.55rem", fontWeight: 600, color: style.text }}>{style.label}</Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
      <BrokerActivitySection data={data} isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} />
      {data.persistence.length > 0 && (
        <PersistenceTable streaks={data.persistence} isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} />
      )}
      {data.wyckoff.length > 0 && (
        <WyckoffCard phases={data.wyckoff} isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} />
      )}
      <DivergenceCard data={data} isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} />
    </Stack>
  );
}

// ── Verdict Card ───────────────────────────────────────────────────────────────

function VerdictCard({ data, isDark, borderColor, surfaceBg }: { data: FlowAnalysis; isDark: boolean; borderColor: string; surfaceBg: string }) {
  const { verdict, regime } = data;
  const style = SIGNAL_STYLES[verdict.signal];
  const regimeLabel = regime?.regime
    ? regime.regime.charAt(0).toUpperCase() + regime.regime.slice(1)
    : "Unknown";

  return (
    <Paper sx={{ borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, overflow: "hidden", boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
          {/* Signal */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
              bgcolor: style.bg, border: "1px solid", borderColor: `${style.color}30`,
            }}>
              <Typography sx={{ fontSize: "1.2rem", color: style.color, lineHeight: 1, fontWeight: 700 }}>{style.arrow}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.85rem", color: style.color, letterSpacing: "0.08em" }}>
                {verdict.signal}
              </Typography>
              <Typography sx={{ fontSize: "0.6rem", color: "text.secondary" }}>Flow Verdict</Typography>
            </Box>
          </Box>

          {/* Conviction */}
          <Box sx={{ textAlign: "center", px: 2 }}>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "1.4rem", color: style.color, lineHeight: 1 }}>
              {verdict.conviction}%
            </Typography>
            <Typography sx={{ fontSize: "0.58rem", color: "text.secondary", mt: 0.3 }}>Conviction</Typography>
          </Box>

          {/* Regime badge */}
          {regime && (
            <Box sx={{ ml: "auto" }}>
              <Box sx={{
                px: 1.5, py: 0.6, borderRadius: 1.5,
                bgcolor: isDark ? "rgba(212,168,67,0.12)" : "rgba(161,124,47,0.08)",
                border: "1px solid",
                borderColor: isDark ? "rgba(212,168,67,0.25)" : "rgba(161,124,47,0.2)",
              }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.65rem", color: "primary.main", letterSpacing: "0.04em" }}>
                  {regimeLabel}
                </Typography>
                <Typography sx={{ fontSize: "0.55rem", color: "text.secondary" }}>
                  {(regime.confidence_score * 100).toFixed(0)}% confidence
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Factor bars */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {verdict.factors.map((f) => (
            <FactorBar key={f.name} factor={f} isDark={isDark} />
          ))}
        </Box>
      </Box>
    </Paper>
  );
}

function FactorBar({ factor, isDark }: { factor: VerdictFactor; isDark: boolean }) {
  const color = factor.direction === "bullish" ? "#22c55e" : factor.direction === "bearish" ? "#ef4444" : "#64748b";
  const arrow = factor.direction === "bullish" ? "\u25B2" : factor.direction === "bearish" ? "\u25BC" : "\u25CF";
  const width = Math.max(8, factor.strength * 100);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography sx={{ fontSize: "0.58rem", color, fontWeight: 700, width: 10, textAlign: "center" }}>{arrow}</Typography>
      <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: "text.secondary", width: 90, flexShrink: 0 }}>{factor.name}</Typography>
      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Box sx={{ height: "100%", width: `${width}%`, borderRadius: 3, bgcolor: color, transition: "width 600ms cubic-bezier(0.4,0,0.2,1)" }} />
      </Box>
      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", fontWeight: 600, color, width: 30, textAlign: "right" }}>
        {(factor.strength * 100).toFixed(0)}
      </Typography>
    </Box>
  );
}

// ── CADI Chart ─────────────────────────────────────────────────────────────────

function CADIChart({ cadi, isDark, borderColor, surfaceBg, textColor, gridColor, tooltipStyle }: {
  cadi: CADIPoint[]; isDark: boolean; borderColor: string; surfaceBg: string; textColor: string; gridColor: string; tooltipStyle: Record<string, string>;
}) {
  if (cadi.length < 3) return null;

  const lastVal = cadi[cadi.length - 1].cadi;
  const firstVal = cadi[0].cadi;
  const trending = lastVal > firstVal ? "Rising" : lastVal < firstVal ? "Falling" : "Flat";
  const trendColor = trending === "Rising" ? "#22c55e" : trending === "Falling" ? "#ef4444" : "#94a3b8";

  return (
    <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            CADI - Cumulative Accumulation Distribution
          </Typography>
          <Typography sx={{ fontSize: "0.6rem", color: "text.secondary", mt: 0.2 }}>
            Running total of top-10 brokers' daily net activity
          </Typography>
        </Box>
        <Box sx={{ px: 1.2, py: 0.4, borderRadius: 1.2, bgcolor: `${trendColor}15`, border: "1px solid", borderColor: `${trendColor}30` }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.65rem", color: trendColor }}>
            {trending}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        {["VWAP", "Trading", "Fair Value"].map((t) => (
          <Box key={t} sx={{ px: 1, py: 0.4, borderRadius: 1, bgcolor: t === "Trading" ? (isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)") : "transparent", border: "1px solid", borderColor: t === "Trading" ? "#22c55e" : borderColor }}>
            <Typography sx={{ fontSize: "0.55rem", fontWeight: 600, color: t === "Trading" ? "#22c55e" : "text.secondary" }}>{t}</Typography>
          </Box>
        ))}
      </Box>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={cadi}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: textColor, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }} tickFormatter={(v) => formatValue(v)} width={65} axisLine={false} tickLine={false} />
          <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [formatValue(v), name === "cadi" ? "CADI" : "Daily Net"]} />
          <ReferenceLine y={0} stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"} strokeDasharray="4 3" />
          <Line type="monotone" dataKey="cadi" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="CADI" />
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  );
}

function VWAPDeviationCard({ data, isDark, borderColor, surfaceBg }: { data: FlowAnalysis; isDark: boolean; borderColor: string; surfaceBg: string }) {
  const lastPrice = data.prices.length > 0 ? data.prices[data.prices.length - 1].close : 0;
  const lastCadi = data.cadi.length > 0 ? data.cadi[data.cadi.length - 1].cadi : 0;
  const prevCadi = data.cadi.length > 1 ? data.cadi[data.cadi.length - 2].cadi : lastCadi;
  const cadiChange = lastCadi - prevCadi;
  const above = cadiChange >= 0;
  const pct = lastCadi !== 0 ? Math.abs((cadiChange / Math.abs(lastCadi)) * 100) : 0;

  return (
    <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase", mb: 0.5 }}>
        VWAP Deviation Rate
      </Typography>
      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "1.1rem", color: lastPrice >= 0 ? "text.primary" : "text.primary", mb: 0.5 }}>
        {lastPrice.toLocaleString("id-ID")}
      </Typography>
      <Typography sx={{ fontSize: "0.62rem", color: above ? "#22c55e" : "#ef4444", mb: 1.5 }}>
        {above ? "Above" : "Below"} flow {pct.toFixed(1)}% vs prior
      </Typography>
      <Stack spacing={1}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: "0.6rem", color: "text.secondary" }}>CADI</Typography>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", fontWeight: 700 }}>{formatValue(lastCadi)}</Typography>
        </Box>
        <Box sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <Box sx={{ height: "100%", width: `${Math.min(100, 50 + (lastCadi >= 0 ? 50 : 0))}%`, borderRadius: 3, bgcolor: above ? "#22c55e" : "#ef4444", opacity: 0.8 }} />
        </Box>
      </Stack>
    </Paper>
  );
}

function ExplosionRateCard({ isDark, borderColor, surfaceBg }: { isDark: boolean; borderColor: string; surfaceBg: string }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase", mb: 0.5 }}>
        Explosion Rate Detection
      </Typography>
      <Box sx={{ py: 2, textAlign: "center", bgcolor: isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)", borderRadius: 2, border: "1px solid", borderColor: "rgba(239,68,68,0.2)" }}>
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "1rem", color: "#ef4444" }}>N/A</Typography>
      </Box>
      <Typography sx={{ fontSize: "0.55rem", color: "#ef4444", mt: 0.5 }}>
        Price changed significantly, causing probable anomaly
      </Typography>
    </Paper>
  );
}

// ── Wyckoff Price Chart (kept for reference; price now via TradingView) ───────────

function WyckoffPriceChart({
  stockCode,
  prices,
  phases,
  isDark,
  borderColor,
  surfaceBg,
  textColor,
  gridColor,
  tooltipStyle,
}: {
  stockCode: string;
  prices: OHLCVPoint[];
  phases: WyckoffPhase[];
  isDark: boolean;
  borderColor: string;
  surfaceBg: string;
  textColor: string;
  gridColor: string;
  tooltipStyle: Record<string, string>;
}) {
  const [phasesOn, setPhasesOn] = useState(true);
  const chartData = useMemo(() => {
    return prices.map((p) => ({
      ...p,
      label: new Date(p.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
    }));
  }, [prices]);

  if (chartData.length < 2) return null;

  const dateSet = new Set(chartData.map((d) => d.date));
  const phaseAreas = phasesOn
    ? phases.filter((p) => dateSet.has(p.startDate) || dateSet.has(p.endDate))
    : [];

  return (
    <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {stockCode} Price
          </Typography>
          <Typography sx={{ fontSize: "0.6rem", color: "text.secondary", mt: 0.2 }}>
            Close price and volume with Wyckoff phase overlays
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem", color: "text.secondary" }}>
            {chartData.length}D
          </Typography>
          <Box
            onClick={() => setPhasesOn((v) => !v)}
            sx={{
              px: 1.2,
              py: 0.5,
              borderRadius: 1.2,
              cursor: "pointer",
              userSelect: "none",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              fontSize: "0.65rem",
              bgcolor: phasesOn ? (isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.15)") : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
              border: "1px solid",
              borderColor: phasesOn ? "rgba(59,130,246,0.4)" : borderColor,
              color: phasesOn ? "#3b82f6" : "text.secondary",
            }}
          >
            Phases {phasesOn ? "On" : "Off"}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 1.5 }}>
        {["ACC", "MU", "DIS", "MD"].map((key) => {
          const style = PHASE_COLORS[key];
          return (
            <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: style.bg, border: "1px solid", borderColor: style.text }} />
              <Typography sx={{ fontSize: "0.58rem", fontWeight: 600, color: style.text }}>{style.label}</Typography>
            </Box>
          );
        })}
      </Box>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          {phaseAreas.map((p, i) => {
            const style = PHASE_COLORS[p.phase];
            return (
              <ReferenceArea
                key={i}
                x1={p.startDate}
                x2={p.endDate}
                fill={style.text}
                fillOpacity={0.12}
                strokeOpacity={0}
              />
            );
          })}
          <XAxis
            dataKey="date"
            tick={{ fill: textColor, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
            tickFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="price"
            orientation="right"
            domain={["auto", "auto"]}
            tick={{ fill: textColor, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v))}
            width={52}
            axisLine={false}
            tickLine={false}
          />
          <RechartsTooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string, props: { payload?: (typeof chartData)[0] }) => {
              const p = props.payload;
              if (!p) return [value, name];
              if (name === "close") return [p.close?.toLocaleString() ?? "", "Close"];
              if (name === "volume") return [formatValue(p.volume ?? 0), "Volume"];
              return [value, name];
            }}
            labelFormatter={(label) => new Date(String(label) + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke={isDark ? "#e2e8f0" : "#0f172a"}
            strokeWidth={2}
            dot={false}
            name="close"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  );
}

// ── Concentration Asymmetry (CNE) Card ─────────────────────────────────────────

function ConcentrationCard({ data, isDark, borderColor, surfaceBg }: { data: FlowAnalysis; isDark: boolean; borderColor: string; surfaceBg: string }) {
  const c = data.concentration;
  const history = data.concentrationHistory ?? [];
  const hasHistory = history.length > 1;

  if (!c && !hasHistory) return <EmptyMetricCard title="Concentration Asymmetry (CNE)" isDark={isDark} borderColor={borderColor} surfaceBg={surfaceBg} />;

  const buyHHI = c?.buy_concentration ?? 0;
  const sellHHI = c?.sell_concentration ?? 0;
  const diff = buyHHI - sellHHI;
  const badge = diff > 200 ? "Institutional Buying" : diff < -200 ? "Institutional Selling" : "Balanced";
  const badgeColor = diff > 200 ? "#22c55e" : diff < -200 ? "#ef4444" : "#94a3b8";
  const maxHHI = Math.max(buyHHI, sellHHI, 500);
  const buyPct = Math.min(100, Math.round((buyHHI / 10000) * 100));
  const sellPct = Math.min(100, Math.round((sellHHI / 10000) * 100));

  const chartData = hasHistory
    ? history.map((h) => ({
        date: h.date,
        label: new Date(h.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        buy: Math.min(100, (h.buy_concentration / 10000) * 100),
        sell: Math.min(100, (h.sell_concentration / 10000) * 100),
      }))
    : [];

  return (
    <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase", mb: 0.5 }}>
        Concentration Asymmetry (CNE)
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.75rem", color: "#22c55e" }}>{buyPct}%</Typography>
        <Typography sx={{ fontSize: "0.58rem", color: "text.secondary" }}>Buy Side</Typography>
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.75rem", color: "#ef4444" }}>{sellPct}%</Typography>
        <Typography sx={{ fontSize: "0.58rem", color: "text.secondary" }}>Sell Side</Typography>
        <Box sx={{ px: 1, py: 0.3, borderRadius: 1, bgcolor: `${badgeColor}15`, border: "1px solid", borderColor: `${badgeColor}30` }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.58rem", color: badgeColor }}>{badge}</Typography>
        </Box>
      </Box>
      {hasHistory && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={120}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="2 2" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "text.secondary", fontSize: 8 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} hide />
            <RechartsTooltip formatter={(v: number) => [v.toFixed(0) + "%", ""]} />
            <Line type="monotone" dataKey="buy" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Buy" />
            <Line type="monotone" dataKey="sell" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Sell" />
          </ComposedChart>
        </ResponsiveContainer>
      )}
      {!hasHistory && (
        <Stack spacing={1}>
          <MetricBar label="Buy Conc." value={buyHHI} max={maxHHI} color="#22c55e" isDark={isDark} />
          <MetricBar label="Sell Conc." value={sellHHI} max={maxHHI} color="#ef4444" isDark={isDark} />
        </Stack>
      )}
      {c && (
        <Box sx={{ mt: 1.5, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <MiniStat label="Top Buyer" value={`${c.top_buyer_code} ${c.top_buyer_share.toFixed(1)}%`} color="text.secondary" />
          <MiniStat label="Buyers" value={String(c.total_buyers)} color="#22c55e" />
          <MiniStat label="Sellers" value={String(c.total_sellers)} color="#ef4444" />
        </Box>
      )}
    </Paper>
  );
}

function MetricBar({ label, value, max, color, isDark }: { label: string; value: number; max: number; color: string; isDark: boolean }) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.3 }}>
        <Typography sx={{ fontSize: "0.6rem", fontWeight: 600, color: "text.secondary" }}>{label}</Typography>
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem", fontWeight: 700, color }}>{value.toFixed(0)}</Typography>
      </Box>
      <Box sx={{ height: 8, borderRadius: 4, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Box sx={{ height: "100%", width: `${width}%`, borderRadius: 4, bgcolor: color, opacity: 0.8, transition: "width 600ms cubic-bezier(0.4,0,0.2,1)" }} />
      </Box>
    </Box>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: "0.52rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</Typography>
      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", fontWeight: 700, color }}>{value}</Typography>
    </Box>
  );
}

// ── Smart Money Tracker Card ───────────────────────────────────────────────────

function SMTCard({ data, isDark, borderColor, surfaceBg }: { data: FlowAnalysis; isDark: boolean; borderColor: string; surfaceBg: string }) {
  const { smt } = data;
  const scoreColor = smt.score > 55 ? "#22c55e" : smt.score < 45 ? "#ef4444" : "#94a3b8";
  const scoreLabel = smt.score > 70 ? "Heavy Buying" : smt.score > 55 ? "Buying Detected" : smt.score < 30 ? "Heavy Selling" : smt.score < 45 ? "Selling Detected" : "Neutral";

  const components = [
    { key: "blockTrade", label: "Block Trade", weight: "25%", value: smt.components.blockTrade },
    { key: "stealthAccum", label: "Stealth Accum.", weight: "20%", value: smt.components.stealthAccum },
    { key: "absorption", label: "Absorption", weight: "20%", value: smt.components.absorption },
    { key: "concMomentum", label: "Conc. Momentum", weight: "20%", value: smt.components.concMomentum },
    { key: "freqVolDiv", label: "Freq-Vol Div.", weight: "15%", value: smt.components.freqVolDiv },
  ];

  return (
    <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, height: "100%", boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase", mb: 0.5 }}>
        Smart Money Tracker
      </Typography>
      <Typography sx={{ fontSize: "0.58rem", color: "text.secondary", mb: 2 }}>
        Composite institutional behavior score (0-100)
      </Typography>

      {/* Score display */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
        <Box sx={{
          width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: `conic-gradient(${scoreColor} ${smt.score * 3.6}deg, ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} ${smt.score * 3.6}deg)`,
          position: "relative",
        }}>
          <Box sx={{
            width: 50, height: 50, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            bgcolor: isDark ? "#0d1526" : "#f5f4f1",
          }}>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "1rem", color: scoreColor }}>{smt.score}</Typography>
          </Box>
        </Box>
        <Box>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.72rem", color: scoreColor }}>{scoreLabel}</Typography>
          <Typography sx={{ fontSize: "0.55rem", color: "text.secondary" }}>
            {smt.score > 55 ? "Institutional buying detected across multiple channels" : smt.score < 45 ? "Institutional selling detected across multiple channels" : "No clear directional signal from institutional activity"}
          </Typography>
        </Box>
      </Box>

      {/* Component bars */}
      <Stack spacing={0.75}>
        {components.map((c) => {
          const barColor = c.value > 55 ? "#22c55e" : c.value < 45 ? "#ef4444" : "#64748b";
          return (
            <Box key={c.key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: "0.58rem", fontWeight: 600, color: "text.secondary", width: 90, flexShrink: 0 }}>{c.label}</Typography>
              <Typography sx={{ fontSize: "0.5rem", color: "text.secondary", width: 24, flexShrink: 0 }}>{c.weight}</Typography>
              <Box sx={{ flex: 1, height: 5, borderRadius: 3, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <Box sx={{ height: "100%", width: `${c.value}%`, borderRadius: 3, bgcolor: barColor, transition: "width 600ms cubic-bezier(0.4,0,0.2,1)" }} />
              </Box>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", fontWeight: 700, color: barColor, width: 22, textAlign: "right" }}>{c.value}</Typography>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}

// ── Wyckoff Phases Card ────────────────────────────────────────────────────────

function WyckoffCard({ phases, isDark, borderColor, surfaceBg }: { phases: WyckoffPhase[]; isDark: boolean; borderColor: string; surfaceBg: string }) {
  const currentPhase = phases[phases.length - 1];
  const pc = PHASE_COLORS[currentPhase.phase];

  return (
    <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Wyckoff Phase Detection
          </Typography>
          <Typography sx={{ fontSize: "0.6rem", color: "text.secondary", mt: 0.2 }}>
            Price structure analysis -- where the stock has been
          </Typography>
        </Box>
        <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: pc.bg, border: "1px solid", borderColor: `${pc.text}30` }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.68rem", color: pc.text }}>
            Current: {pc.label}
          </Typography>
          <Typography sx={{ fontSize: "0.55rem", color: pc.text, opacity: 0.8 }}>
            {(currentPhase.confidence * 100).toFixed(0)}% confidence
          </Typography>
        </Box>
      </Box>

      {/* Phase timeline */}
      <Box sx={{ display: "flex", gap: 0.5, mb: 2, overflowX: "auto" }}>
        {phases.map((p, i) => {
          const style = PHASE_COLORS[p.phase];
          const totalDays = phases.reduce((s, ph) => s + ph.days, 0);
          const widthPct = Math.max(8, (p.days / totalDays) * 100);
          return (
            <Tooltip key={i} title={`${style.label}: ${p.startDate} to ${p.endDate} (${p.days}d, ${p.priceChange > 0 ? "+" : ""}${p.priceChange.toFixed(1)}%, conf: ${(p.confidence * 100).toFixed(0)}%)`} arrow>
              <Box sx={{
                flex: `0 0 ${widthPct}%`, minWidth: 32, py: 0.8, px: 0.5, borderRadius: 1.2,
                bgcolor: style.bg, border: "1px solid", borderColor: `${style.text}20`,
                textAlign: "center", cursor: "default", transition: "transform 150ms ease",
                "&:hover": { transform: "translateY(-2px)" },
              }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.58rem", color: style.text }}>{p.phase}</Typography>
                <Typography sx={{ fontSize: "0.48rem", color: style.text, opacity: 0.7 }}>{p.days}d</Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Phase table */}
      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ display: "flex", gap: 1, px: 1, py: 0.5, borderBottom: "1px solid", borderColor, mb: 0.5 }}>
          {["Phase", "Period", "Days", "Change", "Range", "Confidence"].map((h) => (
            <Typography key={h} sx={{ fontSize: "0.52rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em", flex: h === "Period" ? 2 : 1, minWidth: h === "Period" ? 100 : 50 }}>
              {h}
            </Typography>
          ))}
        </Box>
        {phases.map((p, i) => {
          const style = PHASE_COLORS[p.phase];
          const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
          return (
            <Box key={i} sx={{ display: "flex", gap: 1, px: 1, py: 0.6, borderBottom: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", "&:last-child": { borderBottom: "none" } }}>
              <Box sx={{ flex: 1, minWidth: 50 }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.6rem", color: style.text }}>{style.label}</Typography>
              </Box>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", color: "text.secondary", flex: 2, minWidth: 100 }}>
                {fmtDate(p.startDate)} - {fmtDate(p.endDate)}
              </Typography>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", color: "text.secondary", flex: 1, minWidth: 50 }}>{p.days}</Typography>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", fontWeight: 600, flex: 1, minWidth: 50, color: p.priceChange > 0 ? "#22c55e" : "#ef4444" }}>
                {p.priceChange > 0 ? "+" : ""}{p.priceChange.toFixed(1)}%
              </Typography>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", color: "text.secondary", flex: 1, minWidth: 50 }}>
                {p.priceRange[0].toLocaleString()} - {p.priceRange[1].toLocaleString()}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 50, display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  <Box sx={{ height: "100%", width: `${p.confidence * 100}%`, borderRadius: 2, bgcolor: style.text, opacity: 0.7 }} />
                </Box>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.52rem", fontWeight: 600, color: style.text }}>{(p.confidence * 100).toFixed(0)}%</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

// ── Broker Activity (calendar + selected day) ───────────────────────────────────

function BrokerActivitySection({ data, isDark, borderColor, surfaceBg }: { data: FlowAnalysis; isDark: boolean; borderColor: string; surfaceBg: string }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const cadiByDate = useMemo(() => {
    const m = new Map<string, { dailyNet: number; label: string }>();
    data.cadi.forEach((c) => m.set(c.date, { dailyNet: c.dailyNet, label: c.label }));
    return m;
  }, [data.cadi]);

  const dateToPhase = useMemo(() => {
    const m = new Map<string, string>();
    data.wyckoff.forEach((p) => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        m.set(d.toISOString().split("T")[0], p.phase);
      }
    });
    return m;
  }, [data.wyckoff]);

  const { monthLabel, days } = useMemo(() => {
    const dates = data.cadi.length ? data.cadi.map((c) => c.date) : [];
    const lastDate = dates.length ? dates[dates.length - 1] : new Date().toISOString().split("T")[0];
    const d = new Date(lastDate + "T12:00:00");
    d.setMonth(d.getMonth() + monthOffset);
    const y = d.getFullYear();
    const m = d.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const monthLabel = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const dayList: { date: string; day: number; weekday: number; phase: string | null; dailyNet: number }[] = [];
    for (let i = 1; i <= last.getDate(); i++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const cd = cadiByDate.get(dateStr);
      const phase = dateToPhase.get(dateStr) ?? null;
      const weekday = new Date(y, m, i).getDay();
      if (weekday !== 0 && weekday !== 6) {
        dayList.push({ date: dateStr, day: i, weekday, phase, dailyNet: cd?.dailyNet ?? 0 });
      }
    }
    return { monthLabel, days: dayList };
  }, [data.cadi, monthOffset, cadiByDate, dateToPhase]);

  const selectedPoint = selectedDate ? (cadiByDate.get(selectedDate) ?? null) : null;
  const selectedPhase: string | null = selectedDate ? (dateToPhase.get(selectedDate) ?? null) : null;
  const concentration = data.concentration;

  return (
    <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, overflow: "hidden", boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase", mb: 1.5 }}>
        Broker Activity
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Box sx={{ cursor: "pointer", px: 1, py: 0.5, borderRadius: 1, "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" } }} onClick={() => setMonthOffset((o) => o - 1)}>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{"<"}</Typography>
          </Box>
          <Box sx={{ cursor: "pointer", px: 1, py: 0.5, borderRadius: 1, "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" } }} onClick={() => setMonthOffset((o) => o + 1)}>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{">"}</Typography>
          </Box>
        </Box>
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.7rem" }}>{monthLabel}</Typography>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
        {["MON", "TUE", "WED", "THU", "FRI"].map((w) => (
          <Box key={w} sx={{ width: "18%", minWidth: 32, textAlign: "center" }}><Typography sx={{ fontSize: "0.5rem", fontWeight: 600, color: "text.secondary" }}>{w}</Typography></Box>
        ))}
        {days.map((cell) => {
          const style = cell.phase ? PHASE_COLORS[cell.phase] : cell.dailyNet >= 0 ? { bg: "rgba(34,197,94,0.15)", text: "#22c55e" } : { bg: "rgba(239,68,68,0.15)", text: "#ef4444" };
          const isSelected = selectedDate === cell.date;
          return (
            <Box
              key={cell.date}
              onClick={() => setSelectedDate(cell.date)}
              sx={{
                width: "18%", minWidth: 32, py: 0.6, px: 0.3, borderRadius: 1, textAlign: "center", cursor: "pointer",
                bgcolor: isSelected ? "rgba(59,130,246,0.25)" : style.bg,
                border: "1px solid", borderColor: isSelected ? "#3b82f6" : "transparent",
                "&:hover": { bgcolor: isSelected ? "rgba(59,130,246,0.3)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
              }}
            >
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", fontWeight: 700, color: style.text }}>{cell.day}</Typography>
              <Typography sx={{ fontSize: "0.45rem", color: "text.secondary" }}>{cell.phase ?? (cell.dailyNet >= 0 ? "ACC" : "DIST")}</Typography>
            </Box>
          );
        })}
      </Box>
      {selectedDate && (
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: "1px solid", borderColor }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.7rem", mb: 0.5 }}>
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </Typography>
          {selectedPhase && selectedPhase in PHASE_COLORS && (
            <Typography sx={{ fontSize: "0.62rem", color: PHASE_COLORS[selectedPhase as keyof typeof PHASE_COLORS].text, fontWeight: 600 }}>
              {PHASE_COLORS[selectedPhase as keyof typeof PHASE_COLORS].label}
            </Typography>
          )}
          {selectedPoint && (
            <Typography sx={{ fontSize: "0.6rem", color: selectedPoint.dailyNet >= 0 ? "#22c55e" : "#ef4444" }}>
              Daily net: {formatValue(selectedPoint.dailyNet)}
            </Typography>
          )}
          {concentration && (
            <Box sx={{ mt: 0.5, display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Typography sx={{ fontSize: "0.55rem", color: "text.secondary" }}>Top buyer: {concentration.top_buyer_code} ({concentration.top_buyer_share.toFixed(1)}%)</Typography>
              <Typography sx={{ fontSize: "0.55rem", color: "text.secondary" }}>Buy count: {concentration.buyer_participation.toFixed(0)}%</Typography>
            </Box>
          )}
        </Box>
      )}
      <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: "rgba(34,197,94,0.3)" }} />
        <Typography sx={{ fontSize: "0.5rem", color: "text.secondary" }}>Accumulation</Typography>
        <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: "rgba(239,68,68,0.3)" }} />
        <Typography sx={{ fontSize: "0.5rem", color: "text.secondary" }}>Distribution</Typography>
      </Box>
    </Paper>
  );
}

// ── Persistence Table (BROKER, ACTION, DURATION bar, VOL, AVG, %) ───────────────

function PersistenceTable({ streaks, isDark, borderColor, surfaceBg }: { streaks: BrokerStreak[]; isDark: boolean; borderColor: string; surfaceBg: string }) {
  const topStreaks = streaks.slice(0, 24);
  const maxStreak = Math.max(...topStreaks.map((s) => s.max_streak), 1);
  const buyCount = topStreaks.filter((s) => s.direction === "buy").length;
  const sellCount = topStreaks.filter((s) => s.direction === "sell").length;

  return (
    <Paper sx={{ borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, overflow: "hidden", boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor, bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.015)" }}>
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Broker Persistence
        </Typography>
        <Typography sx={{ fontSize: "0.58rem", color: "text.secondary", mt: 0.2 }}>
          {buyCount} of {topStreaks.length} buying, {sellCount} selling
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 0.8, borderBottom: "1px solid", borderColor, bgcolor: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.01)" }}>
        {["BROKER", "ACTION", "DURATION", "VOL", "AVG", "%"].map((h, i) => (
          <Typography key={h} sx={{ fontSize: "0.52rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em", flex: i === 2 ? 1.8 : 1, minWidth: i === 0 ? 50 : 36, textAlign: i > 0 ? "center" : "left" }}>
            {h}
          </Typography>
        ))}
      </Box>

      <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
        {topStreaks.map((s, i) => {
          const color = s.direction === "buy" ? "#22c55e" : "#ef4444";
          const durationPct = (s.current_streak / maxStreak) * 100;
          const arrow = s.direction === "buy" ? "\u25B2" : "\u25BC";
          return (
            <Box key={`${s.broker_code}-${i}`} sx={{
              display: "flex", alignItems: "center", px: 2, py: 0.7,
              borderBottom: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
              "&:last-child": { borderBottom: "none" },
              "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)" },
            }}>
              <Box sx={{ flex: 1, minWidth: 50 }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.62rem", color: "text.primary" }}>{s.broker_code}</Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.3 }}>
                <Typography sx={{ fontSize: "0.65rem", color }}>{arrow}</Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.55rem", fontWeight: 600, color, textTransform: "capitalize" }}>{s.direction}</Typography>
              </Box>
              <Box sx={{ flex: 1.8, minWidth: 70, display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ flex: 1, height: 5, borderRadius: 3, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  <Box sx={{ height: "100%", width: `${durationPct}%`, borderRadius: 3, bgcolor: "#3b82f6", transition: "width 400ms ease" }} />
                </Box>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", fontWeight: 700, color: "text.secondary", minWidth: 22 }}>{s.current_streak}d</Typography>
              </Box>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", color: "text.secondary", flex: 1, minWidth: 36, textAlign: "center" }}>
                {s.days_active}d
              </Typography>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", color: "text.secondary", flex: 1, minWidth: 36, textAlign: "center" }}>
                {Math.round((s.days_active / Math.max(s.total_days, 1)) * 100)}
              </Typography>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", fontWeight: 700, color, flex: 1, minWidth: 36, textAlign: "center" }}>
                {(s.activity_ratio * 100).toFixed(0)}%
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

// ── Divergence Card ────────────────────────────────────────────────────────────

function DivergenceCard({ data, isDark, borderColor, surfaceBg }: { data: FlowAnalysis; isDark: boolean; borderColor: string; surfaceBg: string }) {
  const { divergence } = data;
  const color = divergence.type === "bullish" ? "#22c55e" : divergence.type === "bearish" ? "#ef4444" : "#64748b";
  const title = divergence.type === "bullish" ? "Bullish Divergence" : divergence.type === "bearish" ? "Bearish Divergence" : "No Divergence";
  const desc = divergence.type === "bullish"
    ? "Price dropping but brokers are buying -- possible bottom forming"
    : divergence.type === "bearish"
    ? "Price rising but brokers are selling -- early warning to be cautious"
    : "Price and broker flow are aligned -- no conflicting signals";

  return (
    <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, height: "100%", boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase", mb: 0.5 }}>
        Divergence Detection
      </Typography>
      <Typography sx={{ fontSize: "0.58rem", color: "text.secondary", mb: 2 }}>
        Price vs broker flow agreement
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: `${color}12`, border: "1px solid", borderColor: `${color}25` }}>
          <Typography sx={{ fontSize: "1rem", fontWeight: 700, color }}>
            {divergence.type === "bullish" ? "\u25B2" : divergence.type === "bearish" ? "\u25BC" : "\u25CF"}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.72rem", color }}>{title}</Typography>
          {divergence.type !== "none" && (
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", color: "text.secondary" }}>
              Strength: {(divergence.strength * 100).toFixed(0)}%
            </Typography>
          )}
        </Box>
      </Box>

      <Typography sx={{ fontSize: "0.6rem", color: "text.secondary", lineHeight: 1.5, mb: 2 }}>{desc}</Typography>

      <Box sx={{ display: "flex", gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: "0.5rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase" }}>Price</Typography>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", fontWeight: 700, color: divergence.priceTrend === "up" ? "#22c55e" : divergence.priceTrend === "down" ? "#ef4444" : "#94a3b8", textTransform: "capitalize" }}>
            {divergence.priceTrend}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: "0.5rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase" }}>Flow</Typography>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", fontWeight: 700, color: divergence.flowTrend === "up" ? "#22c55e" : divergence.flowTrend === "down" ? "#ef4444" : "#94a3b8", textTransform: "capitalize" }}>
            {divergence.flowTrend}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

// ── Correlation Card ───────────────────────────────────────────────────────────

function CorrelationCard({ data, isDark, borderColor, surfaceBg }: { data: FlowAnalysis; isDark: boolean; borderColor: string; surfaceBg: string }) {
  const { correlation, cadi } = data;
  const badgeColors: Record<string, string> = { Strong: "#22c55e", Moderate: "#3b82f6", Weak: "#f59e0b", Minimal: "#94a3b8" };
  const color = badgeColors[correlation.badge];
  const inPhasePct = Math.round(correlation.rankIC * 100);
  const goodPct = Math.round(correlation.rSquared * 100);
  const barData = useMemo(() => {
    const slice = cadi.slice(-14);
    const maxAbs = Math.max(...slice.map((x) => Math.abs(x.dailyNet)), 1);
    return slice.map((c) => ({ label: c.label, value: maxAbs > 0 ? Math.min(100, (Math.abs(c.dailyNet) / maxAbs) * 100) : 0 }));
  }, [cadi]);

  return (
    <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(15,23,42,0.06)" }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase", mb: 0.5 }}>
        Flow Price Correlation
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.9rem", color: "#22c55e" }}>{inPhasePct}%</Typography>
          <Typography sx={{ fontSize: "0.52rem", color: "text.secondary" }}>IN-PHASE</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.9rem", color: "#ef4444" }}>{goodPct}%</Typography>
          <Typography sx={{ fontSize: "0.52rem", color: "text.secondary" }}>GOOD</Typography>
        </Box>
        <Box sx={{ px: 1, py: 0.3, borderRadius: 1, bgcolor: `${color}15`, border: "1px solid", borderColor: `${color}30` }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.58rem", color }}>{correlation.badge}</Typography>
        </Box>
      </Box>
      {barData.length > 0 && (
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={barData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <XAxis dataKey="label" tick={{ fontSize: 7 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, 100]} />
            <Bar dataKey="value" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function EmptyMetricCard({ title, isDark, borderColor, surfaceBg }: { title: string; isDark: boolean; borderColor: string; surfaceBg: string }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor, bgcolor: surfaceBg, height: "100%" }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase", mb: 1 }}>{title}</Typography>
      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", py: 3, textAlign: "center" }}>No data available</Typography>
    </Paper>
  );
}

function EmptyState() {
  return (
    <Box sx={{ py: 6, textAlign: "center" }}>
      <Typography color="text.secondary" sx={{ fontSize: "0.8rem" }}>
        No flow analysis data available for this stock
      </Typography>
    </Box>
  );
}

function FlowAnalysisSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
      <Box sx={{ display: "flex", gap: 2 }}>
        <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3, flex: 1 }} />
        <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3, flex: 1 }} />
      </Box>
      <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
    </Stack>
  );
}
