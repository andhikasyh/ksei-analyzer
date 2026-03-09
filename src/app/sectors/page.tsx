"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { formatBillion } from "@/lib/types";
import { useWatchlist } from "@/lib/watchlist";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from "recharts";

interface SectorData {
  sector: string;
  stockCount: number;
  avgPer: number;
  avgRoe: number;
  avgPbv: number;
  totalMarketCap: number;
  avgChangePct: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  topGainer: { code: string; name: string; changePct: number; close: number } | null;
  topLoser: { code: string; name: string; changePct: number; close: number } | null;
  stocks: { code: string; name: string; close: number; changePct: number; marketCap: number }[];
}

const SECTOR_NAME_MAP: Record<string, string> = {
  "Barang Baku": "Basic Materials",
  "Barang Konsumsi Primer": "Consumer Non-Cyclicals",
  "Barang Konsumsi Non-Primer": "Consumer Cyclicals",
  "Energi": "Energy",
  "Keuangan": "Financials",
  "Kesehatan": "Healthcare",
  "Industri": "Industrials",
  "Infrastruktur": "Infrastructures",
  "Properti & Real Estat": "Properties & Real Estate",
  "Teknologi": "Technology",
  "Transportasi & Logistik": "Transportation & Logistic",
  "Basic Materials": "Basic Materials",
  "Consumer Cyclicals": "Consumer Cyclicals",
  "Consumer Non-Cyclicals": "Consumer Non-Cyclicals",
  "Energy": "Energy",
  "Financials": "Financials",
  "Healthcare": "Healthcare",
  "Industrials": "Industrials",
  "Infrastructures": "Infrastructures",
  "Properties & Real Estate": "Properties & Real Estate",
  "Technology": "Technology",
  "Transportation & Logistic": "Transportation & Logistic",
  "Trade & Services": "Trade & Services",
  "Trade and Services": "Trade & Services",
  "Perdagangan & Jasa": "Trade & Services",
};

const SECTOR_COLORS: Record<string, string> = {
  "Basic Materials": "#f59e0b",
  "Consumer Cyclicals": "#8b5cf6",
  "Consumer Non-Cyclicals": "#06b6d4",
  "Energy": "#f97316",
  "Financials": "#3b82f6",
  "Healthcare": "#10b981",
  "Industrials": "#6366f1",
  "Infrastructures": "#ec4899",
  "Properties & Real Estate": "#84cc16",
  "Technology": "#0ea5e9",
  "Transportation & Logistic": "#a78bfa",
  "Trade & Services": "#fb7185",
};

const SECTOR_INDICES = [
  { code: "COMPOSITE", label: "IHSG", color: "#d4a843" },
  { code: "IDXFINANCE", label: "Finance", color: "#3b82f6" },
  { code: "IDXENERGY", label: "Energy", color: "#f97316" },
  { code: "IDXBASIC", label: "Basic Mat", color: "#f59e0b" },
  { code: "IDXTECHNO", label: "Technology", color: "#0ea5e9" },
  { code: "IDXHEALTH", label: "Healthcare", color: "#10b981" },
  { code: "IDXINDUST", label: "Industrials", color: "#6366f1" },
  { code: "IDXINFRA", label: "Infra", color: "#ec4899" },
  { code: "IDXPROPERT", label: "Property", color: "#84cc16" },
  { code: "IDXCYCLIC", label: "Cyclical", color: "#8b5cf6" },
  { code: "IDXNONCYC", label: "Non-Cycl", color: "#06b6d4" },
  { code: "IDXTRANS", label: "Transport", color: "#a78bfa" },
];

const MAJOR_INDICES = [
  { code: "COMPOSITE", label: "IHSG" },
  { code: "LQ45", label: "LQ45" },
  { code: "IDX30", label: "IDX30" },
  { code: "IDX80", label: "IDX80" },
  { code: "ISSI", label: "ISSI" },
  { code: "KOMPAS100", label: "KOMPAS100" },
  { code: "JII70", label: "JII70" },
];

interface IndexRow {
  index_code: string;
  date: string;
  close: number;
  change: number;
  volume: number;
  value: number;
}

interface IndexPerf {
  code: string;
  label: string;
  color: string;
  latestClose: number;
  changePct1d: number;
  changePct1w: number;
  changePctMtd: number;
  momentum: number;
  roc: number;
  curve: { date: string; normalized: number }[];
}

type PageTab = "overview" | "indices";

interface RRGStock {
  code: string;
  trail: { date: string; rs: number; mom: number }[];
}

const RRG_COLORS = [
  "#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#a78bfa",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1",
  "#14b8a6", "#e879f7", "#fb923c", "#4ade80", "#60a5fa",
  "#fbbf24", "#c084fc", "#f472b6", "#2dd4bf", "#818cf8",
  "#a3e635", "#fb7185", "#38bdf8", "#facc15", "#d946ef",
  "#34d399", "#f87171", "#93c5fd", "#fde047", "#c4b5fd",
  "#67e8f9", "#fdba74", "#86efac", "#7dd3fc", "#fca5a5",
  "#d4a843", "#ff6b6b", "#48dbfb", "#1dd1a1", "#ff9f43",
  "#5f27cd", "#54a0ff", "#00d2d3", "#feca57", "#ee5a24",
];

const RRG_INDEX_OPTIONS = [
  { code: "ISSI", label: "ISSI" },
  { code: "KOMPAS100", label: "KOMPAS100" },
  { code: "LQ45", label: "LQ45" },
  { code: "IDX30", label: "IDX30" },
  { code: "IDX80", label: "IDX80" },
  { code: "COMPOSITE", label: "IHSG" },
  { code: "IDXFINANCE", label: "Finance" },
  { code: "IDXENERGY", label: "Energy" },
  { code: "IDXBASIC", label: "Basic Mat" },
  { code: "IDXTECHNO", label: "Technology" },
  { code: "IDXHEALTH", label: "Healthcare" },
  { code: "IDXINDUST", label: "Industrials" },
  { code: "IDXINFRA", label: "Infra" },
  { code: "IDXPROPERT", label: "Property" },
  { code: "IDXCYCLIC", label: "Cyclical" },
  { code: "IDXNONCYC", label: "Non-Cycl" },
  { code: "IDXTRANS", label: "Transport" },
];

function RRGChart({
  stocks,
  isDark,
  svgRef,
}: {
  stocks: RRGStock[];
  isDark: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; code: string; rs: number; mom: number;
  } | null>(null);

  const W = 900;
  const H = 520;
  const PAD = { top: 24, right: 160, bottom: 36, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const { minRS, maxRS, minMom, maxMom } = useMemo(() => {
    let mnR = 100, mxR = 100, mnM = 100, mxM = 100;
    for (const s of stocks) {
      for (const pt of s.trail) {
        if (pt.rs < mnR) mnR = pt.rs;
        if (pt.rs > mxR) mxR = pt.rs;
        if (pt.mom < mnM) mnM = pt.mom;
        if (pt.mom > mxM) mxM = pt.mom;
      }
    }
    const padR = Math.max((mxR - mnR) * 0.08, 0.3);
    const padM = Math.max((mxM - mnM) * 0.08, 0.3);
    return {
      minRS: mnR - padR,
      maxRS: mxR + padR,
      minMom: mnM - padM,
      maxMom: mxM + padM,
    };
  }, [stocks]);

  const scaleX = useCallback((v: number) => PAD.left + ((v - minRS) / (maxRS - minRS)) * plotW, [minRS, maxRS, plotW]);
  const scaleY = useCallback((v: number) => PAD.top + plotH - ((v - minMom) / (maxMom - minMom)) * plotH, [minMom, maxMom, plotH]);

  const cx100 = scaleX(100);
  const cy100 = scaleY(100);

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const axisColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const textColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";
  const crossColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";

  const xTicks = useMemo(() => {
    const step = Math.max(0.5, Math.round((maxRS - minRS) / 8 * 2) / 2);
    const ticks: number[] = [];
    let v = Math.ceil(minRS / step) * step;
    while (v <= maxRS) { ticks.push(Math.round(v * 100) / 100); v += step; }
    return ticks;
  }, [minRS, maxRS]);

  const yTicks = useMemo(() => {
    const step = Math.max(0.2, Math.round((maxMom - minMom) / 8 * 2) / 2);
    const ticks: number[] = [];
    let v = Math.ceil(minMom / step) * step;
    while (v <= maxMom) { ticks.push(Math.round(v * 100) / 100); v += step; }
    return ticks;
  }, [minMom, maxMom]);

  return (
    <Box sx={{ position: "relative", overflow: "hidden" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", cursor: "crosshair" }}
        onMouseLeave={() => setTooltip(null)}
      >
        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill={isDark ? "#0a0e1a" : "#fafaf8"} rx={2} />

        {xTicks.map((v) => (
          <line key={`gx${v}`} x1={scaleX(v)} x2={scaleX(v)} y1={PAD.top} y2={PAD.top + plotH} stroke={gridColor} strokeWidth={0.5} />
        ))}
        {yTicks.map((v) => (
          <line key={`gy${v}`} x1={PAD.left} x2={PAD.left + plotW} y1={scaleY(v)} y2={scaleY(v)} stroke={gridColor} strokeWidth={0.5} />
        ))}

        <line x1={cx100} x2={cx100} y1={PAD.top} y2={PAD.top + plotH} stroke={crossColor} strokeWidth={1.2} />
        <line x1={PAD.left} x2={PAD.left + plotW} y1={cy100} y2={cy100} stroke={crossColor} strokeWidth={1.2} />

        <text x={PAD.left + 6} y={PAD.top + 14} fill="#3b82f6" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600" opacity={0.7}>Improving</text>
        <text x={PAD.left + plotW - 6} y={PAD.top + 14} fill="#22c55e" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600" textAnchor="end" opacity={0.7}>Leading</text>
        <text x={PAD.left + 6} y={PAD.top + plotH - 6} fill="#ef4444" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600" opacity={0.7}>Lagging</text>
        <text x={PAD.left + plotW - 6} y={PAD.top + plotH - 6} fill="#f59e0b" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600" textAnchor="end" opacity={0.7}>Weakening</text>

        {xTicks.map((v) => (
          <text key={`tx${v}`} x={scaleX(v)} y={PAD.top + plotH + 14} fill={textColor} fontSize="8" fontFamily="JetBrains Mono, monospace" textAnchor="middle">{v.toFixed(1)}</text>
        ))}
        {yTicks.map((v) => (
          <text key={`ty${v}`} x={PAD.left - 6} y={scaleY(v) + 3} fill={textColor} fontSize="8" fontFamily="JetBrains Mono, monospace" textAnchor="end">{v.toFixed(1)}</text>
        ))}

        <text x={PAD.left + plotW / 2} y={H - 4} fill={textColor} fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="middle">Relative Strength</text>
        <text x={12} y={PAD.top + plotH / 2} fill={textColor} fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="middle" transform={`rotate(-90, 12, ${PAD.top + plotH / 2})`}>Relative Momentum</text>

        {stocks.map((stock, si) => {
          const c = RRG_COLORS[si % RRG_COLORS.length];
          const trail = stock.trail;
          if (trail.length < 2) return null;

          const points = trail.map((pt) => `${scaleX(pt.rs)},${scaleY(pt.mom)}`);
          const last = trail[trail.length - 1];
          const lastX = scaleX(last.rs);
          const lastY = scaleY(last.mom);

          const labelX = lastX + 5;
          const labelY = lastY - 5;

          return (
            <g key={stock.code}>
              <polyline
                points={points.join(" ")}
                fill="none"
                stroke={c}
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
              {trail.map((pt, pi) => {
                const px = scaleX(pt.rs);
                const py = scaleY(pt.mom);
                const isLast = pi === trail.length - 1;
                return (
                  <circle
                    key={pi}
                    cx={px}
                    cy={py}
                    r={isLast ? 3.5 : 1.5}
                    fill={isLast ? c : "transparent"}
                    stroke={c}
                    strokeWidth={isLast ? 1.5 : 0.8}
                    opacity={isLast ? 1 : 0.5 + (pi / trail.length) * 0.5}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setTooltip({ x: px, y: py, code: stock.code, rs: pt.rs, mom: pt.mom })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
              <text
                x={labelX}
                y={labelY}
                fill={c}
                fontSize="7.5"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
                opacity={0.9}
              >
                {stock.code}
              </text>
            </g>
          );
        })}

        <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top} y2={PAD.top} stroke={axisColor} strokeWidth={1} />
        <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke={axisColor} strokeWidth={1} />
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + plotH} stroke={axisColor} strokeWidth={1} />
        <line x1={PAD.left + plotW} x2={PAD.left + plotW} y1={PAD.top} y2={PAD.top + plotH} stroke={axisColor} strokeWidth={1} />

        {stocks.length === 0 && (
          <text x={W / 2} y={H / 2} fill={textColor} fontSize="12" fontFamily="JetBrains Mono, monospace" textAnchor="middle">No data available</text>
        )}
      </svg>

      {tooltip && (
        <Box
          sx={{
            position: "absolute",
            left: `${(tooltip.x / W) * 100}%`,
            top: `${(tooltip.y / H) * 100}%`,
            transform: "translate(-50%, -120%)",
            pointerEvents: "none",
            bgcolor: isDark ? "#1a1f2e" : "#fff",
            border: `1px solid ${isDark ? "#333" : "#ddd"}`,
            borderRadius: 1.5,
            px: 1, py: 0.5,
            zIndex: 10,
            whiteSpace: "nowrap",
          }}
        >
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem", fontWeight: 700, color: "text.primary" }}>
            {tooltip.code}
          </Typography>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", color: "text.secondary" }}>
            RS: {tooltip.rs.toFixed(2)} | Mom: {tooltip.mom.toFixed(2)}
          </Typography>
        </Box>
      )}

      {stocks.length > 0 && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 140,
            maxHeight: H,
            overflowY: "auto",
            py: 0.5,
            px: 0.5,
            "&::-webkit-scrollbar": { width: 3 },
            "&::-webkit-scrollbar-thumb": { bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)", borderRadius: 4 },
          }}
        >
          {stocks.map((s, i) => (
            <Stack
              key={s.code}
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ py: 0.15, cursor: "pointer", "&:hover": { opacity: 0.7 } }}
              onClick={() => {
                const last = s.trail[s.trail.length - 1];
                setTooltip({ x: scaleX(last.rs), y: scaleY(last.mom), code: s.code, rs: last.rs, mom: last.mom });
              }}
            >
              <Box sx={{ width: 16, height: 2, bgcolor: RRG_COLORS[i % RRG_COLORS.length], borderRadius: 1, flexShrink: 0 }} />
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.52rem", fontWeight: 600, color: RRG_COLORS[i % RRG_COLORS.length], lineHeight: 1.2 }}>
                {s.code}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default function SectorsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = isDark ? "#d4a843" : "#a17c2f";
  const router = useRouter();
  const { watchlist } = useWatchlist();

  const [pageTab, setPageTab] = useState<PageTab>("overview");

  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [stockSort, setStockSort] = useState<"change" | "mcap">("mcap");

  const [indexData, setIndexData] = useState<IndexPerf[]>([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexGroup, setIndexGroup] = useState<"sectors" | "majors">("sectors");
  const [enabledIndices, setEnabledIndices] = useState<Set<string>>(new Set());

  const [rrg, setRrg] = useState<RRGStock[]>([]);
  const [rrgLoading, setRrgLoading] = useState(false);
  const [rrgIndex, setRrgIndex] = useState("COMPOSITE");
  const [rrgTrail, setRrgTrail] = useState(8);
  const [rrgLikedOnly, setRrgLikedOnly] = useState(false);
  const [rrgLastDate, setRrgLastDate] = useState("");
  const rrgSvgRef = useRef<SVGSVGElement>(null);

  const [sectorActivity, setSectorActivity] = useState<{ dates: string[]; series: { code: string; data: number[] }[] }>({ dates: [], series: [] });
  const [saLoading, setSaLoading] = useState(false);
  const [saLastDate, setSaLastDate] = useState("");

  useEffect(() => {
    async function fetchData() {
      const { data: dateRow } = await supabase
        .from("idx_stock_summary")
        .select("date")
        .order("date", { ascending: false })
        .limit(1)
        .single();
      const latestDate = dateRow?.date ?? "";

      const [{ data: companies }, { data: summaries }, { data: ratios }] = await Promise.all([
        supabase.from("idx_companies").select("kode_emiten,nama_emiten,sektor"),
        supabase
          .from("idx_stock_summary")
          .select("stock_code,stock_name,close,change,listed_shares")
          .eq("date", latestDate),
        supabase.from("idx_financial_ratios").select("code,per,roe,price_bv"),
      ]);

      const sumMap: Record<string, any> = {};
      (summaries ?? []).forEach((s) => { sumMap[s.stock_code] = s; });

      const ratioMap: Record<string, any> = {};
      (ratios ?? []).forEach((r: any) => { ratioMap[r.code] = r; });

      interface SE {
        code: string; name: string; sector: string;
        close: number; changePct: number; marketCap: number;
        per: number | null; roe: number | null; pbv: number | null;
      }

      const entries: SE[] = (companies ?? []).map((c: any) => {
        const rawSector = c.sektor ?? "";
        const sector = SECTOR_NAME_MAP[rawSector] ?? rawSector;
        if (!sector) return null;
        const s = sumMap[c.kode_emiten];
        if (!s) return null;
        const close = parseFloat(s.close) || 0;
        if (close === 0) return null;
        const change = parseFloat(s.change) || 0;
        const previous = close - change;
        const changePct = previous > 0 ? (change / previous) * 100 : 0;
        const listedShares = parseFloat(s.listed_shares) || 0;
        const marketCap = close * listedShares;
        const r = ratioMap[c.kode_emiten];
        const per = r ? parseFloat(r.per) : null;
        const roe = r ? parseFloat(r.roe) : null;
        const pbv = r ? parseFloat(r.price_bv) : null;
        return {
          code: c.kode_emiten,
          name: s.stock_name || c.nama_emiten,
          sector, close, changePct, marketCap,
          per: per !== null && !isNaN(per) && per > 0 && per < 500 ? per : null,
          roe: roe !== null && !isNaN(roe) ? roe : null,
          pbv: pbv !== null && !isNaN(pbv) && pbv > 0 ? pbv : null,
        };
      }).filter((e): e is SE => e !== null);

      const avg = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
      const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

      const bySector: Record<string, { entries: SE[]; per: number[]; roe: number[]; pbv: number[] }> = {};
      entries.forEach((e) => {
        if (!bySector[e.sector]) bySector[e.sector] = { entries: [], per: [], roe: [], pbv: [] };
        bySector[e.sector].entries.push(e);
        if (e.per !== null) bySector[e.sector].per.push(e.per);
        if (e.roe !== null) bySector[e.sector].roe.push(e.roe);
        if (e.pbv !== null) bySector[e.sector].pbv.push(e.pbv);
      });

      const sectorList: SectorData[] = Object.entries(bySector).map(([sector, d]) => {
        const sorted = [...d.entries].sort((a, b) => b.changePct - a.changePct);
        const advancers = d.entries.filter((e) => e.changePct > 0).length;
        const decliners = d.entries.filter((e) => e.changePct < 0).length;
        const unchanged = d.entries.length - advancers - decliners;
        return {
          sector,
          stockCount: d.entries.length,
          avgPer: avg(d.per),
          avgRoe: avg(d.roe),
          avgPbv: avg(d.pbv),
          totalMarketCap: sum(d.entries.map((e) => e.marketCap)),
          avgChangePct: avg(d.entries.map((e) => e.changePct)),
          advancers,
          decliners,
          unchanged,
          topGainer: sorted[0] ? { code: sorted[0].code, name: sorted[0].name, changePct: sorted[0].changePct, close: sorted[0].close } : null,
          topLoser: sorted[sorted.length - 1]?.code !== sorted[0]?.code ? { code: sorted[sorted.length - 1].code, name: sorted[sorted.length - 1].name, changePct: sorted[sorted.length - 1].changePct, close: sorted[sorted.length - 1].close } : null,
          stocks: d.entries.map((e) => ({ code: e.code, name: e.name, close: e.close, changePct: e.changePct, marketCap: e.marketCap })),
        };
      }).filter((s) => s.stockCount >= 1).sort((a, b) => b.totalMarketCap - a.totalMarketCap);

      setSectors(sectorList);
      if (sectorList.length > 0) setSelected(sectorList[0].sector);
      setLoading(false);
    }
    fetchData();
  }, []);

  // ── Index Activity Data ──
  const fetchIndices = useCallback(async () => {
    setIndexLoading(true);
    const codes = indexGroup === "sectors"
      ? SECTOR_INDICES.map((i) => i.code)
      : MAJOR_INDICES.map((i) => i.code);

    const { data } = await supabase
      .from("idx_index_summary")
      .select("index_code, date, close, change, volume, value")
      .in("index_code", codes)
      .order("date", { ascending: true })
      .limit(codes.length * 50);

    if (!data?.length) { setIndexLoading(false); return; }

    const byCode = new Map<string, IndexRow[]>();
    for (const row of data) {
      const code = row.index_code as string;
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code)!.push({
        index_code: code,
        date: row.date as string,
        close: parseFloat(row.close as string) || 0,
        change: parseFloat(row.change as string) || 0,
        volume: parseFloat(row.volume as string) || 0,
        value: parseFloat(row.value as string) || 0,
      });
    }

    const lookup = indexGroup === "sectors" ? SECTOR_INDICES : MAJOR_INDICES.map((m) => ({
      code: m.code,
      label: m.label,
      color: SECTOR_INDICES.find((s) => s.code === m.code)?.color
        || ["#d4a843", "#3b82f6", "#22c55e", "#f97316", "#a78bfa", "#06b6d4", "#ec4899"][MAJOR_INDICES.indexOf(m) % 7],
    }));

    const perfs: IndexPerf[] = [];
    const defaultEnabled = new Set<string>();

    for (const idx of lookup) {
      const rows = byCode.get(idx.code);
      if (!rows?.length) continue;

      const first = rows[0];
      const last = rows[rows.length - 1];
      const baseClose = first.close;
      if (baseClose <= 0) continue;

      const changePct1d = last.close > 0 && rows.length >= 2
        ? ((last.close - rows[rows.length - 2].close) / rows[rows.length - 2].close) * 100
        : 0;
      const weekAgoIdx = Math.max(0, rows.length - 6);
      const changePct1w = rows[weekAgoIdx].close > 0
        ? ((last.close - rows[weekAgoIdx].close) / rows[weekAgoIdx].close) * 100
        : 0;
      const changePctMtd = ((last.close - baseClose) / baseClose) * 100;

      const midIdx = Math.floor(rows.length / 2);
      const firstHalfAvg = rows.slice(0, midIdx).reduce((s, r) => s + r.close, 0) / midIdx;
      const secondHalfAvg = rows.slice(midIdx).reduce((s, r) => s + r.close, 0) / (rows.length - midIdx);
      const momentum = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

      const tenAgoIdx = Math.max(0, rows.length - 11);
      const roc = rows[tenAgoIdx].close > 0
        ? ((last.close - rows[tenAgoIdx].close) / rows[tenAgoIdx].close) * 100
        : 0;

      perfs.push({
        code: idx.code,
        label: idx.label,
        color: idx.color,
        latestClose: last.close,
        changePct1d: Math.round(changePct1d * 100) / 100,
        changePct1w: Math.round(changePct1w * 100) / 100,
        changePctMtd: Math.round(changePctMtd * 100) / 100,
        momentum: Math.round(momentum * 100) / 100,
        roc: Math.round(roc * 100) / 100,
        curve: rows.map((r) => ({
          date: r.date.slice(5),
          normalized: Math.round(((r.close / baseClose) * 100) * 100) / 100,
        })),
      });

      if (idx.code !== "COMPOSITE") defaultEnabled.add(idx.code);
    }

    setIndexData(perfs);
    if (enabledIndices.size === 0) setEnabledIndices(defaultEnabled);
    setIndexLoading(false);
  }, [indexGroup, enabledIndices.size]);

  useEffect(() => {
    if (pageTab === "indices") fetchIndices();
  }, [pageTab, fetchIndices]);

  const mergedCurve = useMemo(() => {
    if (!indexData.length) return [];
    const dateMap = new Map<string, Record<string, number>>();
    for (const idx of indexData) {
      if (!enabledIndices.has(idx.code) && idx.code !== "COMPOSITE") continue;
      for (const pt of idx.curve) {
        if (!dateMap.has(pt.date)) dateMap.set(pt.date, {});
        dateMap.get(pt.date)![idx.label] = pt.normalized;
      }
    }
    return [...dateMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [indexData, enabledIndices]);

  const fetchRRG = useCallback(async () => {
    setRrgLoading(true);
    try {
      const res = await fetch(`/api/rrg?index=${rrgIndex}&trail=${rrgTrail}`);
      const data = await res.json();
      setRrg(data.stocks || []);
      setRrgLastDate(data.lastDate || "");
    } catch {
      setRrg([]);
    }
    setRrgLoading(false);
  }, [rrgIndex, rrgTrail]);

  useEffect(() => {
    if (pageTab === "indices") fetchRRG();
  }, [pageTab, fetchRRG]);

  const rrgFiltered = useMemo(() => {
    if (!rrgLikedOnly) return rrg;
    const codes = new Set(watchlist.map((w) => w.code));
    return rrg.filter((s) => codes.has(s.code));
  }, [rrg, rrgLikedOnly, watchlist]);

  const fetchSectorActivity = useCallback(async () => {
    setSaLoading(true);
    try {
      const res = await fetch("/api/sector-activity?mode=sector");
      const data = await res.json();
      setSectorActivity({ dates: data.dates || [], series: data.series || [] });
      setSaLastDate(data.lastDate || "");
    } catch {
      setSectorActivity({ dates: [], series: [] });
    }
    setSaLoading(false);
  }, []);

  useEffect(() => {
    if (pageTab === "indices") fetchSectorActivity();
  }, [pageTab, fetchSectorActivity]);

  const activityChartData = useMemo(() => {
    if (!sectorActivity.dates.length) return [];
    return sectorActivity.dates.map((dt, i) => {
      const row: Record<string, string | number> = { date: dt.slice(5) };
      for (const s of sectorActivity.series) {
        row[s.code] = s.data[i] ?? 0;
      }
      return row;
    });
  }, [sectorActivity]);

  const toggleIndex = useCallback((code: string) => {
    setEnabledIndices((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const totalMarketCap = useMemo(() => sectors.reduce((s, sec) => s + sec.totalMarketCap, 0), [sectors]);
  const color = (s: string) => SECTOR_COLORS[s] ?? accent;

  const activeSector = useMemo(() => sectors.find((s) => s.sector === selected) ?? null, [sectors, selected]);

  const sortedStocks = useMemo(() => {
    if (!activeSector) return [];
    const s = [...activeSector.stocks];
    return stockSort === "change"
      ? s.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      : s.sort((a, b) => b.marketCap - a.marketCap);
  }, [activeSector, stockSort]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#060a14" : "#f5f7fa", pt: { xs: 3, md: 4 }, pb: 6 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>

        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: { xs: "1.5rem", md: "1.9rem" }, color: "text.primary", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Sectors
            </Typography>
            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.8rem", color: "text.secondary", mt: 0.4 }}>
              {sectors.length} sectors · {sectors.reduce((s, x) => s + x.stockCount, 0)} stocks
            </Typography>
          </Box>
        </Stack>

        {/* Page Tab Bar */}
        <Paper
          elevation={0}
          sx={{
            display: "inline-flex", borderRadius: 2, mb: 3, overflow: "hidden",
            border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
            bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
          }}
        >
          {([
            { key: "overview" as PageTab, label: "Sector Overview" },
            { key: "indices" as PageTab, label: "Index Activity & Rotation" },
          ]).map((t) => (
            <Box
              key={t.key}
              onClick={() => setPageTab(t.key)}
              sx={{
                px: { xs: 1.5, sm: 2.5 }, py: 1, cursor: "pointer",
                fontFamily: '"JetBrains Mono", monospace', fontSize: { xs: "0.65rem", sm: "0.72rem" }, fontWeight: 700,
                transition: "all 0.15s",
                color: pageTab === t.key ? (isDark ? "#fff" : "#0c1222") : "text.secondary",
                bgcolor: pageTab === t.key ? `${accent}20` : "transparent",
                borderBottom: pageTab === t.key ? `2px solid ${accent}` : "2px solid transparent",
                "&:hover": { bgcolor: pageTab === t.key ? undefined : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)") },
              }}
            >
              {t.label}
            </Box>
          ))}
        </Paper>

        {/* ═══ INDEX ACTIVITY & ROTATION TAB ═══ */}
        {pageTab === "indices" && (
          <Stack spacing={2.5}>

            {/* Sector Activity Chart */}
            <Paper
              elevation={0}
              sx={{
                p: 2, borderRadius: "14px",
                border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
                bgcolor: isDark ? "#060a14" : "#fff",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Box>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.82rem", color: accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Sector Activity
                  </Typography>
                  {saLastDate && (
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.62rem", color: "text.secondary", mt: 0.3 }}>
                      Last data: {saLastDate}
                    </Typography>
                  )}
                </Box>
              </Stack>

              {saLoading ? (
                <Skeleton variant="rounded" height={380} sx={{ borderRadius: 2 }} />
              ) : activityChartData.length > 0 ? (
                <>
                  <Stack direction="row" spacing={0.4} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                    {SECTOR_INDICES.filter((s) => s.code !== "COMPOSITE").map((idx) => (
                      <Stack key={idx.code} direction="row" spacing={0.3} alignItems="center">
                        <Box sx={{ width: 12, height: 2.5, bgcolor: idx.color, borderRadius: 1, flexShrink: 0 }} />
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.5rem", fontWeight: 700, color: idx.color, lineHeight: 1 }}>
                          {idx.code}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <ResponsiveContainer width="100%" height={380}>
                    <LineChart data={activityChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace' }}
                        stroke={isDark ? "#333" : "#ccc"}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}
                        stroke={isDark ? "#333" : "#ccc"}
                        domain={[0, "auto"]}
                        tickFormatter={(v: number) => v.toFixed(2)}
                        label={{ value: "Activity", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fill: isDark ? "#666" : "#999" } }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem",
                          backgroundColor: isDark ? "#111827" : "#fff",
                          border: `1px solid ${isDark ? "#333" : "#ddd"}`,
                          borderRadius: 8, maxHeight: 300, overflowY: "auto",
                        }}
                        formatter={(value: number, name: string) => {
                          const idx = SECTOR_INDICES.find((s) => s.code === name);
                          return [`${(value * 100).toFixed(1)}%`, idx?.code || name];
                        }}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      {SECTOR_INDICES.filter((s) => s.code !== "COMPOSITE").map((idx) => (
                        <Line
                          key={idx.code}
                          type="monotone"
                          dataKey={idx.code}
                          stroke={idx.color}
                          strokeWidth={1.5}
                          dot={false}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", color: "text.secondary", textAlign: "center", py: 6 }}>
                  No activity data available
                </Typography>
              )}
            </Paper>

            {/* Group selector */}
            <Stack direction="row" spacing={1} alignItems="center">
              {([
                { key: "sectors" as const, label: "Sector Indices" },
                { key: "majors" as const, label: "Major Indices" },
              ]).map((g) => (
                <Box
                  key={g.key}
                  onClick={() => { setIndexGroup(g.key); setEnabledIndices(new Set()); }}
                  sx={{
                    px: 1.5, py: 0.5, cursor: "pointer", borderRadius: 1.5,
                    fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem", fontWeight: 600,
                    color: indexGroup === g.key ? (isDark ? "#fff" : "#0c1222") : "text.secondary",
                    bgcolor: indexGroup === g.key ? `${accent}20` : "transparent",
                    border: `1px solid ${indexGroup === g.key ? accent + "40" : "transparent"}`,
                    transition: "all 0.15s",
                    "&:hover": { bgcolor: indexGroup === g.key ? undefined : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)") },
                  }}
                >
                  {g.label}
                </Box>
              ))}
            </Stack>

            {indexLoading ? (
              <Stack spacing={1.5}>
                <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2.5 }} />
                <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2.5 }} />
              </Stack>
            ) : indexData.length > 0 && (
              <>
                {/* Performance Chart */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2, borderRadius: "14px",
                    border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
                    bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#fff",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Normalized Performance (base = 100)
                    </Typography>
                  </Stack>

                  {/* Index toggle chips */}
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                    {indexData.filter((d) => d.code !== "COMPOSITE" || indexGroup === "majors").map((idx) => (
                      <Box
                        key={idx.code}
                        onClick={() => toggleIndex(idx.code)}
                        sx={{
                          px: 0.9, py: 0.25, borderRadius: 1, cursor: "pointer",
                          fontFamily: '"JetBrains Mono", monospace', fontSize: "0.58rem", fontWeight: 700,
                          border: `1px solid ${idx.color}50`,
                          bgcolor: enabledIndices.has(idx.code) ? `${idx.color}20` : "transparent",
                          color: enabledIndices.has(idx.code) ? idx.color : "text.disabled",
                          opacity: enabledIndices.has(idx.code) ? 1 : 0.5,
                          transition: "all 0.12s",
                          "&:hover": { opacity: 1 },
                        }}
                      >
                        {idx.label}
                      </Box>
                    ))}
                  </Stack>

                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={mergedCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }} stroke={isDark ? "#444" : "#ccc"} />
                      <YAxis tick={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }} stroke={isDark ? "#444" : "#ccc"} domain={["dataMin - 2", "dataMax + 2"]} />
                      <RechartsTooltip
                        contentStyle={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem", backgroundColor: isDark ? "#111827" : "#fff", border: `1px solid ${isDark ? "#333" : "#ddd"}`, borderRadius: 8 }}
                        formatter={(value: number) => [`${value.toFixed(2)}`, undefined]}
                      />
                      <ReferenceLine y={100} stroke={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"} strokeDasharray="5 5" />
                      {indexGroup === "sectors" && (
                        <Line type="monotone" dataKey="IHSG" stroke="#d4a843" strokeWidth={2.5} dot={false} strokeDasharray="6 3" opacity={0.6} />
                      )}
                      {indexData
                        .filter((d) => enabledIndices.has(d.code))
                        .map((idx) => (
                          <Line key={idx.code} type="monotone" dataKey={idx.label} stroke={idx.color} strokeWidth={1.8} dot={false} connectNulls />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>

                {/* RRG Rotation Chart */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2, borderRadius: "14px",
                    border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
                    bgcolor: isDark ? "#060a14" : "#fff",
                  }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
                    <Box>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.82rem", color: accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {RRG_INDEX_OPTIONS.find((o) => o.code === rrgIndex)?.label || rrgIndex} Rotation Chart
                      </Typography>
                      {rrgLastDate && (
                        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.62rem", color: "text.secondary", mt: 0.3 }}>
                          Last data: {rrgLastDate}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <TextField
                        select
                        size="small"
                        value={rrgIndex}
                        onChange={(e) => setRrgIndex(e.target.value)}
                        SelectProps={{ native: true }}
                        sx={{
                          minWidth: 120,
                          "& .MuiInputBase-input": { fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem", py: 0.6, px: 1 },
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 1.5,
                            "& fieldset": { borderColor: isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.12)" },
                          },
                        }}
                      >
                        {RRG_INDEX_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>{opt.label}</option>
                        ))}
                      </TextField>

                      <TextField
                        size="small"
                        type="number"
                        value={rrgTrail}
                        onChange={(e) => setRrgTrail(Math.max(3, Math.min(20, parseInt(e.target.value) || 8)))}
                        inputProps={{ min: 3, max: 20 }}
                        sx={{
                          width: 60,
                          "& .MuiInputBase-input": { fontFamily: '"JetBrains Mono", monospace', fontSize: "0.68rem", py: 0.6, px: 1, textAlign: "center" },
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 1.5,
                            "& fieldset": { borderColor: isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.12)" },
                          },
                        }}
                      />

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={rrgLikedOnly}
                            onChange={(e) => setRrgLikedOnly(e.target.checked)}
                            size="small"
                            sx={{ p: 0.3, "& .MuiSvgIcon-root": { fontSize: "1rem" } }}
                          />
                        }
                        label="liked only"
                        sx={{
                          ml: 0, mr: 0,
                          "& .MuiFormControlLabel-label": {
                            fontFamily: '"JetBrains Mono", monospace', fontSize: "0.62rem", color: "text.secondary",
                          },
                        }}
                      />
                    </Stack>
                  </Stack>

                  {rrgLoading ? (
                    <Skeleton variant="rounded" height={520} sx={{ borderRadius: 2 }} />
                  ) : (
                    <RRGChart
                      stocks={rrgFiltered}
                      isDark={isDark}
                      svgRef={rrgSvgRef}
                    />
                  )}

                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5, px: 0.5 }}>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.56rem", fontWeight: 600, color: "#3b82f6" }}>Improving</Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.56rem", fontWeight: 600, color: "#22c55e" }}>Leading</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" sx={{ px: 0.5 }}>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.56rem", fontWeight: 600, color: "#ef4444" }}>Lagging</Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.56rem", fontWeight: 600, color: "#f59e0b" }}>Weakening</Typography>
                  </Stack>

                  {rrgFiltered.length > 0 && (
                    <Stack direction="row" spacing={0.4} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                      {rrgFiltered.map((s, i) => {
                        const c = RRG_COLORS[i % RRG_COLORS.length];
                        const last = s.trail[s.trail.length - 1];
                        const quadrant = last.rs >= 100 && last.mom >= 100 ? "Leading"
                          : last.rs < 100 && last.mom >= 100 ? "Improving"
                          : last.rs < 100 && last.mom < 100 ? "Lagging" : "Weakening";
                        return (
                          <Tooltip key={s.code} title={`RS: ${last.rs.toFixed(2)} | Mom: ${last.mom.toFixed(2)} | ${quadrant}`} arrow>
                            <Box
                              onClick={() => router.push(`/stock/${s.code}`)}
                              sx={{
                                px: 0.5, py: 0.15, borderRadius: 0.5, cursor: "pointer",
                                fontFamily: '"JetBrains Mono", monospace', fontSize: "0.5rem", fontWeight: 700,
                                color: c, bgcolor: `${c}12`,
                                "&:hover": { bgcolor: `${c}25` },
                                transition: "background 0.12s",
                              }}
                            >
                              {s.code}
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>

                {/* Index Summary Table */}
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "14px", overflow: "hidden",
                    border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
                    bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#fff",
                  }}
                >
                  <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.09)" : "rgba(12,18,34,0.06)"}` }}>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Index Summary
                    </Typography>
                  </Box>
                  <Box sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {["Index", "Close", "1D %", "1W %", "MTD %", "Momentum", "RoC (10d)"].map((h) => (
                            <TableCell key={h} sx={{
                              fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", fontWeight: 700,
                              bgcolor: isDark ? "#0c1222" : "#f8f7f4", color: "text.secondary",
                              textTransform: "uppercase", letterSpacing: "0.04em", py: 0.75, whiteSpace: "nowrap",
                            }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {indexData.map((idx) => (
                          <TableRow key={idx.code} sx={{ "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" } }}>
                            <TableCell sx={{ py: 0.6 }}>
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: idx.color, flexShrink: 0 }} />
                                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.72rem", color: idx.color }}>{idx.label}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", py: 0.6 }}>{idx.latestClose.toLocaleString("id-ID", { maximumFractionDigits: 1 })}</TableCell>
                            {([idx.changePct1d, idx.changePct1w, idx.changePctMtd, idx.momentum, idx.roc] as number[]).map((v, i) => (
                              <TableCell key={i} sx={{
                                fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", fontWeight: 600, py: 0.6,
                                color: v > 0 ? "#22c55e" : v < 0 ? "#ef4444" : "text.secondary",
                              }}>
                                {v > 0 ? "+" : ""}{v.toFixed(2)}%
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              </>
            )}
          </Stack>
        )}

        {/* ═══ SECTOR OVERVIEW TAB ═══ */}
        {pageTab === "overview" && (
        <>
        {/* Two-panel layout */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "320px 1fr" },
            gap: 2,
            alignItems: "start",
          }}
        >
            {/* LEFT: sector list */}
            <Paper
              elevation={0}
              sx={{
                border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
                borderRadius: "14px",
                overflow: "hidden",
                bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#fff",
                position: { lg: "sticky" },
                top: { lg: 80 },
              }}
            >
              {loading ? (
                <Stack spacing={0}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} height={56} sx={{ borderRadius: 0, transform: "none" }} />
                  ))}
                </Stack>
              ) : (
                sectors.map((sec, i) => {
                  const c = color(sec.sector);
                  const isActive = selected === sec.sector;
                  const isUp = sec.avgChangePct >= 0;
                  return (
                    <Box
                      key={sec.sector}
                      onClick={() => setSelected(sec.sector)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        px: 2,
                        py: 1.25,
                        cursor: "pointer",
                        borderBottom: i < sectors.length - 1
                          ? `1px solid ${isDark ? "rgba(107,127,163,0.07)" : "rgba(12,18,34,0.05)"}`
                          : "none",
                        bgcolor: isActive
                          ? isDark ? `${c}14` : `${c}0d`
                          : "transparent",
                        borderLeft: `3px solid ${isActive ? c : "transparent"}`,
                        transition: "all 0.12s ease",
                        "&:hover": {
                          bgcolor: isDark ? `${c}0c` : `${c}08`,
                        },
                      }}
                    >
                      {/* Color dot */}
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: c, flexShrink: 0, opacity: isActive ? 1 : 0.5 }} />

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: "0.82rem",
                            color: isActive ? "text.primary" : "text.secondary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sec.sector}
                        </Typography>
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", color: "text.secondary", mt: 0.1 }}>
                          {sec.stockCount} stocks · {formatBillion(sec.totalMarketCap / 1e9)}
                        </Typography>
                      </Box>

                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          color: isUp ? "#22c55e" : "#ef4444",
                          flexShrink: 0,
                        }}
                      >
                        {isUp ? "+" : ""}{sec.avgChangePct.toFixed(2)}%
                      </Typography>
                    </Box>
                  );
                })
              )}
            </Paper>

            {/* RIGHT: sector detail */}
            {activeSector ? (
              <Stack spacing={2}>
                {/* Sector stats header */}
                <Paper
                  elevation={0}
                  sx={{
                    border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
                    borderRadius: "14px",
                    overflow: "hidden",
                    bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#fff",
                  }}
                >
                  {/* Top band */}
                  <Box
                    sx={{
                      px: 2.5,
                      pt: 2,
                      pb: 1.75,
                      borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.09)" : "rgba(12,18,34,0.06)"}`,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1.25}>
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color(activeSector.sector), flexShrink: 0 }} />
                        <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: "1.2rem", color: "text.primary", letterSpacing: "-0.02em" }}>
                          {activeSector.sector}
                        </Typography>
                      </Stack>
                      <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.75rem", color: "text.secondary", mt: 0.4 }}>
                        {activeSector.stockCount} listed stocks &nbsp;·&nbsp; {formatBillion(activeSector.totalMarketCap / 1e9)} market cap
                      </Typography>
                    </Box>

                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 800,
                          fontSize: "1.5rem",
                          letterSpacing: "-0.03em",
                          color: activeSector.avgChangePct >= 0 ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {activeSector.avgChangePct >= 0 ? "+" : ""}{activeSector.avgChangePct.toFixed(2)}%
                      </Typography>
                      <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary" }}>
                        avg
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Stats row */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                      borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.09)" : "rgba(12,18,34,0.06)"}`,
                    }}
                  >
                    {[
                      { label: "Avg PER", value: activeSector.avgPer > 0 ? activeSector.avgPer.toFixed(1) + "×" : "—" },
                      { label: "Avg ROE", value: activeSector.avgRoe !== 0 ? activeSector.avgRoe.toFixed(1) + "%" : "—" },
                      { label: "Avg PBV", value: activeSector.avgPbv > 0 ? activeSector.avgPbv.toFixed(2) + "×" : "—" },
                      { label: "Advancers", value: activeSector.advancers.toString(), color: "#22c55e" },
                      { label: "Decliners", value: activeSector.decliners.toString(), color: "#ef4444" },
                      { label: "Unchanged", value: activeSector.unchanged.toString() },
                    ].map(({ label, value, color: vc }, i, arr) => (
                      <Box
                        key={label}
                        sx={{
                          px: 2.5,
                          py: 1.5,
                          borderRight: i < arr.length - 1
                            ? `1px solid ${isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.05)"}`
                            : "none",
                        }}
                      >
                        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.62rem", color: "text.secondary", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", mb: 0.3 }}>
                          {label}
                        </Typography>
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.95rem", color: vc ?? "text.primary" }}>
                          {value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Top gainer / loser */}
                  {(activeSector.topGainer || activeSector.topLoser) && (
                    <Box sx={{ display: "flex", gap: 0, borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.09)" : "rgba(12,18,34,0.06)"}` }}>
                      {activeSector.topGainer && (
                        <Box
                          onClick={(e) => { e.stopPropagation(); router.push(`/stock/${activeSector.topGainer!.code}`); }}
                          sx={{
                            flex: 1, px: 2.5, py: 1.5, cursor: "pointer",
                            borderRight: `1px solid ${isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.05)"}`,
                            "&:hover": { bgcolor: isDark ? "rgba(34,197,94,0.04)" : "rgba(34,197,94,0.03)" },
                          }}
                        >
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.62rem", color: "text.secondary", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", mb: 0.3 }}>
                            Top Gainer
                          </Typography>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.88rem", color: color(activeSector.sector) }}>
                                {activeSector.topGainer.code}
                              </Typography>
                              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.7rem", color: "text.secondary", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {activeSector.topGainer.name}
                              </Typography>
                            </Stack>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.88rem", color: "#22c55e" }}>
                              +{activeSector.topGainer.changePct.toFixed(2)}%
                            </Typography>
                          </Stack>
                        </Box>
                      )}
                      {activeSector.topLoser && (
                        <Box
                          onClick={(e) => { e.stopPropagation(); router.push(`/stock/${activeSector.topLoser!.code}`); }}
                          sx={{
                            flex: 1, px: 2.5, py: 1.5, cursor: "pointer",
                            "&:hover": { bgcolor: isDark ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.03)" },
                          }}
                        >
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.62rem", color: "text.secondary", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", mb: 0.3 }}>
                            Top Loser
                          </Typography>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: "0.88rem", color: "text.secondary" }}>
                                {activeSector.topLoser.code}
                              </Typography>
                              <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.7rem", color: "text.secondary", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {activeSector.topLoser.name}
                              </Typography>
                            </Stack>
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.88rem", color: "#ef4444" }}>
                              {activeSector.topLoser.changePct.toFixed(2)}%
                            </Typography>
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Advancer/decliner visual band */}
                  {activeSector.stockCount > 0 && (
                    <Box sx={{ display: "flex", height: 6 }}>
                      <Box sx={{ flex: activeSector.advancers, bgcolor: "#22c55e", opacity: 0.7 }} />
                      <Box sx={{ flex: activeSector.unchanged, bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" }} />
                      <Box sx={{ flex: activeSector.decliners, bgcolor: "#ef4444", opacity: 0.7 }} />
                    </Box>
                  )}
                </Paper>

                {/* Stock list */}
                <Paper
                  elevation={0}
                  sx={{
                    border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
                    borderRadius: "14px",
                    overflow: "hidden",
                    bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#fff",
                  }}
                >
                  {/* List header */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 2.5,
                      py: 1.5,
                      borderBottom: `1px solid ${isDark ? "rgba(107,127,163,0.09)" : "rgba(12,18,34,0.06)"}`,
                    }}
                  >
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: "0.82rem", color: "text.primary" }}>
                      All Stocks ({activeSector.stockCount})
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {(["mcap", "change"] as const).map((s) => (
                        <Box
                          key={s}
                          onClick={() => setStockSort(s)}
                          sx={{
                            px: 1.25, py: 0.4, borderRadius: "6px", cursor: "pointer",
                            bgcolor: stockSort === s
                              ? isDark ? "rgba(212,168,67,0.12)" : "rgba(161,124,47,0.09)"
                              : "transparent",
                            border: `1px solid ${stockSort === s
                              ? isDark ? "rgba(212,168,67,0.22)" : "rgba(161,124,47,0.18)"
                              : "transparent"}`,
                            transition: "all 0.12s ease",
                          }}
                        >
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.68rem", fontWeight: stockSort === s ? 700 : 500, color: stockSort === s ? accent : "text.secondary" }}>
                            {s === "mcap" ? "By Mkt Cap" : "By Move"}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  {/* Stock rows */}
                  <Box sx={{ maxHeight: 480, overflowY: "auto" }}>
                    {sortedStocks.map((s, i) => {
                      const isUp = s.changePct > 0;
                      const isFlat = s.changePct === 0;
                      return (
                        <Box
                          key={s.code}
                          onClick={() => router.push(`/stock/${s.code}`)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            px: 2.5,
                            py: 0.9,
                            cursor: "pointer",
                            borderBottom: i < sortedStocks.length - 1
                              ? `1px solid ${isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.04)"}`
                              : "none",
                            transition: "background 0.1s ease",
                            "&:hover": {
                              bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)",
                            },
                          }}
                        >
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: "0.78rem", color: color(activeSector.sector), minWidth: 52 }}>
                            {s.code}
                          </Typography>
                          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.72rem", color: "text.secondary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mx: 1.5 }}>
                            {s.name}
                          </Typography>
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", color: "text.primary", minWidth: 52, textAlign: "right" }}>
                            {s.close.toLocaleString()}
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              color: isFlat ? "text.secondary" : isUp ? "#22c55e" : "#ef4444",
                              minWidth: 64,
                              textAlign: "right",
                            }}
                          >
                            {isFlat ? "0.00%" : (isUp ? "+" : "") + s.changePct.toFixed(2) + "%"}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>

                  {/* Footer: browse in screener */}
                  <Box
                    onClick={() => router.push(`/screener?sector=${encodeURIComponent(activeSector.sector)}`)}
                    sx={{
                      px: 2.5, py: 1.25,
                      borderTop: `1px solid ${isDark ? "rgba(107,127,163,0.09)" : "rgba(12,18,34,0.06)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75,
                      cursor: "pointer",
                      bgcolor: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.015)",
                      "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" },
                      transition: "background 0.12s ease",
                    }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 14, color: accent }} />
                    <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.75rem", fontWeight: 600, color: accent }}>
                      Browse all in Screener
                    </Typography>
                  </Box>
                </Paper>
              </Stack>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
                <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "0.82rem", color: "text.secondary" }}>
                  Select a sector
                </Typography>
              </Box>
            )}
          </Box>
        </>
        )}
      </Container>
    </Box>
  );
}
