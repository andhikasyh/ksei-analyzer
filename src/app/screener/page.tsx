"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import {
  IDXFinancialRatio,
  IDXStockSummary,
  formatBillion,
  formatRatio,
  formatValue,
} from "@/lib/types";
import { computeFinancialScore } from "@/lib/scoring";
import { INDEX_LABELS, INDEX_CONSTITUENTS } from "@/lib/index-constituents";
import { GlobalSearch } from "@/components/SearchInput";
import { StockTreemap, StockTreemapSkeleton } from "@/components/StockTreemap";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PeopleIcon from "@mui/icons-material/People";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { InvestorScreener } from "@/components/InvestorScreener";


interface ScreenerRow extends IDXFinancialRatio {
  close: number;
  change_pct: number;
  market_cap: number;
  volume: number;
  daily_value: number;
  foreign_net: number;
  score: number;
}

type SortKey =
  | "code"
  | "stock_name"
  | "sector"
  | "close"
  | "change_pct"
  | "market_cap"
  | "volume"
  | "daily_value"
  | "foreign_net"
  | "assets"
  | "equity"
  | "sales"
  | "per"
  | "price_bv"
  | "de_ratio"
  | "roe"
  | "roa"
  | "npm"
  | "eps"
  | "score";

type SortDir = "asc" | "desc";

const COLUMNS: {
  key: SortKey;
  label: string;
  align?: "right" | "left";
  numeric?: boolean;
}[] = [
  { key: "code", label: "Code" },
  { key: "score", label: "Score", align: "right", numeric: true },
  { key: "stock_name", label: "Company" },
  { key: "sector", label: "Sector" },
  { key: "close", label: "Price", align: "right", numeric: true },
  { key: "change_pct", label: "Chg%", align: "right", numeric: true },
  { key: "market_cap", label: "Mkt Cap", align: "right", numeric: true },
  { key: "volume", label: "Vol (shares)", align: "right", numeric: true },
  { key: "daily_value", label: "Value (Rp)", align: "right", numeric: true },
  { key: "foreign_net", label: "Foreign (Rp)", align: "right", numeric: true },
  { key: "per", label: "P/E", align: "right", numeric: true },
  { key: "price_bv", label: "P/BV", align: "right", numeric: true },
  { key: "de_ratio", label: "D/E", align: "right", numeric: true },
  { key: "roe", label: "ROE", align: "right", numeric: true },
  { key: "roa", label: "ROA", align: "right", numeric: true },
  { key: "npm", label: "NPM", align: "right", numeric: true },
  { key: "eps", label: "EPS", align: "right", numeric: true },
  { key: "sales", label: "Revenue", align: "right", numeric: true },
];

const PAGE_SIZE = 50;

interface RatioInfo {
  label: string;
  full: string;
  formula: [string, string, string];
  what: string;
  good: string;
  bad: string;
  tip: string;
}

const RATIO_DATA: RatioInfo[] = [
  {
    label: "P/E",
    full: "Price-to-Earnings Ratio",
    formula: ["Stock Price", "Earnings Per Share", "P/E Ratio"],
    what: "Shows how much investors pay for each rupiah of earnings. A P/E of 15 means you pay Rp15 for every Rp1 of profit the company makes.",
    good: "10 - 20 is generally considered fair value for most sectors.",
    bad: "Very high P/E (>40) may signal overvaluation. Negative P/E means the company is losing money.",
    tip: "Compare P/E within the same sector. Tech companies typically have higher P/E than banks.",
  },
  {
    label: "P/BV",
    full: "Price-to-Book Value",
    formula: ["Stock Price", "Book Value Per Share", "P/BV Ratio"],
    what: "Compares the stock price to the company's net asset value. A P/BV of 1 means you're paying exactly what the company's assets are worth.",
    good: "Below 1.0 may indicate undervaluation (buying assets at a discount).",
    bad: "Very high P/BV (>5) means you're paying a large premium over asset value.",
    tip: "Banks and property companies are best evaluated using P/BV since their assets are mostly financial.",
  },
  {
    label: "D/E",
    full: "Debt-to-Equity Ratio",
    formula: ["Total Liabilities", "Shareholder Equity", "D/E Ratio"],
    what: "Measures how much debt the company uses compared to its own capital. A D/E of 2 means Rp2 of debt for every Rp1 of equity.",
    good: "Below 1.0 means the company has more equity than debt (conservative).",
    bad: "Above 2.0 signals heavy debt reliance, increasing financial risk.",
    tip: "Financial companies (banks) naturally have high D/E. Compare within sector.",
  },
  {
    label: "ROE",
    full: "Return on Equity",
    formula: ["Net Income", "Shareholder Equity", "ROE %"],
    what: "Shows how efficiently the company generates profit from shareholders' investment. An ROE of 20% means Rp20 profit per Rp100 of equity.",
    good: "Above 15% is generally excellent. Consistent high ROE signals a strong business.",
    bad: "Below 5% suggests poor capital efficiency. Negative means the company is losing money.",
    tip: "Look for companies with consistently high ROE over multiple years, not just one quarter.",
  },
  {
    label: "NPM",
    full: "Net Profit Margin",
    formula: ["Net Income", "Total Revenue", "NPM %"],
    what: "Shows what percentage of revenue becomes actual profit after all expenses. An NPM of 10% means Rp10 profit from every Rp100 of sales.",
    good: "Above 10% is generally healthy. Some industries (software, banking) can exceed 20%.",
    bad: "Below 5% means thin margins with little room for error. Negative means operating at a loss.",
    tip: "Retail and manufacturing typically have lower margins than tech or banking.",
  },
  {
    label: "EPS",
    full: "Earnings Per Share",
    formula: ["Net Income", "Outstanding Shares", "EPS (Rp)"],
    what: "The actual profit allocated to each share. If EPS is Rp500, each share you own earned Rp500 in profit.",
    good: "Growing EPS year-over-year signals a healthy, expanding business.",
    bad: "Declining or negative EPS suggests deteriorating profitability.",
    tip: "EPS is the foundation of P/E ratio. Rising EPS with stable price means the stock gets cheaper (lower P/E).",
  },
];

function FormulaFlow({
  formula,
  isDark,
}: {
  formula: [string, string, string];
  isDark: boolean;
}) {
  const boxSx = {
    px: 1.5,
    py: 0.75,
    borderRadius: 1.5,
    bgcolor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.03)",
    border: `1px solid ${isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.06)"}`,
    textAlign: "center" as const,
    flex: 1,
    minWidth: 0,
  };
  const labelSx = {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontSize: "0.72rem",
    fontWeight: 600,
    lineHeight: 1.3,
    color: "text.primary",
  };
  const dividerSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "text.secondary",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  };
  const resultSx = {
    ...boxSx,
    bgcolor: isDark ? "rgba(212,168,67,0.08)" : "rgba(161,124,47,0.06)",
    border: `1px solid ${isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.15)"}`,
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 2,
      }}
    >
      <Box sx={boxSx}>
        <Typography sx={labelSx}>{formula[0]}</Typography>
      </Box>
      <Box sx={dividerSx}>/</Box>
      <Box sx={boxSx}>
        <Typography sx={labelSx}>{formula[1]}</Typography>
      </Box>
      <Box sx={dividerSx}>=</Box>
      <Box sx={resultSx}>
        <Typography
          sx={{
            ...labelSx,
            color: "primary.main",
            fontWeight: 700,
          }}
        >
          {formula[2]}
        </Typography>
      </Box>
    </Box>
  );
}

function InterpretBlock({
  label,
  text,
  color,
  isDark,
}: {
  label: string;
  text: string;
  color: string;
  isDark: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "flex-start",
        mb: 1,
      }}
    >
      <Box
        sx={{
          width: 4,
          minHeight: 16,
          borderRadius: 1,
          bgcolor: color,
          opacity: 0.7,
          mt: 0.25,
          flexShrink: 0,
        }}
      />
      <Box>
        <Typography
          sx={{
            fontSize: "0.68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color,
            mb: 0.15,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.78rem",
            color: "text.secondary",
            lineHeight: 1.5,
          }}
        >
          {text}
        </Typography>
      </Box>
    </Box>
  );
}

function RatioGuideModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [tab, setTab] = useState(0);
  const ratio = RATIO_DATA[tab];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: "background.paper",
            border: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
            maxHeight: "80vh",
          },
        },
        backdrop: {
          sx: {
            bgcolor: isDark
              ? "rgba(6,10,20,0.75)"
              : "rgba(12,18,34,0.3)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 0,
          px: 2.5,
          pt: 2,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <HelpOutlineIcon
            sx={{ fontSize: 18, color: "primary.main", opacity: 0.7 }}
          />
          <Typography
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "-0.01em",
            }}
          >
            Financial Ratios Guide
          </Typography>
        </Stack>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            width: 28,
            height: 28,
            color: "text.secondary",
            "&:hover": { color: "text.primary" },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 2.5 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 34,
            "& .MuiTab-root": {
              minHeight: 34,
              py: 0.5,
              px: 1.25,
              fontSize: "0.75rem",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
              textTransform: "none",
              minWidth: "auto",
              letterSpacing: 0,
            },
            "& .MuiTabs-indicator": {
              height: 2,
              borderRadius: 1,
              bgcolor: "primary.main",
            },
          }}
        >
          {RATIO_DATA.map((r) => (
            <Tab key={r.label} label={r.label} />
          ))}
        </Tabs>
      </Box>

      <DialogContent sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
        <Typography
          sx={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 700,
            fontSize: "0.95rem",
            mb: 0.25,
            letterSpacing: "-0.01em",
          }}
        >
          {ratio.full}
        </Typography>
        <Typography
          sx={{ fontSize: "0.7rem", color: "text.secondary", mb: 2 }}
        >
          Formula
        </Typography>

        <FormulaFlow formula={ratio.formula} isDark={isDark} />

        <Typography
          sx={{
            fontSize: "0.82rem",
            lineHeight: 1.6,
            mb: 2,
            color: "text.primary",
          }}
        >
          {ratio.what}
        </Typography>

        <InterpretBlock
          label="Good sign"
          text={ratio.good}
          color={theme.palette.success.main}
          isDark={isDark}
        />
        <InterpretBlock
          label="Warning"
          text={ratio.bad}
          color={theme.palette.error.main}
          isDark={isDark}
        />

        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: isDark
              ? "rgba(212,168,67,0.05)"
              : "rgba(161,124,47,0.03)",
            border: `1px solid ${isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.06)"}`,
            display: "flex",
            gap: 1,
            alignItems: "flex-start",
          }}
        >
          <ArrowForwardIcon
            sx={{
              fontSize: 14,
              color: "primary.main",
              mt: 0.25,
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontSize: "0.76rem",
              color: "text.secondary",
              lineHeight: 1.5,
              fontStyle: "italic",
            }}
          >
            {ratio.tip}
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default function ScreenerPage() {
  return (
    <Suspense>
      <ScreenerContent />
    </Suspense>
  );
}

function ScreenerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [data, setData] = useState<ScreenerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [indexFilter, setIndexFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [guideOpen, setGuideOpen] = useState(false);
  const [screenerTab, setScreenerTab] = useState(0);
  const [regimeFilter, setRegimeFilter] = useState("All");
  const [regimeMap, setRegimeMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetch("/api/stock-regime")
      .then((r) => r.json())
      .then((d) => {
        const m = new Map<string, string>();
        for (const r of d.regimes || []) m.set(r.symbol, r.regime);
        setRegimeMap(m);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const idx = searchParams.get("index");
    if (idx && (idx === "COMPOSITE" || INDEX_CONSTITUENTS[idx])) {
      setIndexFilter(idx === "COMPOSITE" ? "All" : idx);
    }
    const sec = searchParams.get("sector");
    if (sec) {
      setSectorFilter(sec);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetch() {
      const [finRes, stockRes] = await Promise.all([
        supabase.from("idx_financial_ratios").select("*").order("code"),
        supabase
          .from("idx_stock_summary")
          .select("*")
          .order("date", { ascending: false })
          .limit(2000),
      ]);

      const latestFin = new Map<string, IDXFinancialRatio>();
      if (finRes.data) {
        (finRes.data as IDXFinancialRatio[]).forEach((r) => {
          const existing = latestFin.get(r.code);
          if (!existing || r.fs_date > existing.fs_date)
            latestFin.set(r.code, r);
        });
      }

      const latestStock = new Map<string, IDXStockSummary>();
      if (stockRes.data) {
        (stockRes.data as IDXStockSummary[]).forEach((r) => {
          const existing = latestStock.get(r.stock_code);
          if (!existing || r.date > existing.date)
            latestStock.set(r.stock_code, r);
        });
      }

      const merged: ScreenerRow[] = Array.from(latestFin.values()).map(
        (fin) => {
          const stk = latestStock.get(fin.code);
          const close = stk ? parseFloat(stk.close) || 0 : 0;
          const prev = stk ? parseFloat(stk.previous) || 0 : 0;
          const listed = stk ? parseFloat(stk.listed_shares) || 0 : 0;
          return {
            ...fin,
            close,
            change_pct:
              prev > 0
                ? (parseFloat(stk?.change || "0") / prev) * 100
                : 0,
            market_cap: close * listed,
            volume: stk ? parseFloat(stk.volume) || 0 : 0,
            daily_value: stk ? parseFloat(stk.value) || 0 : 0,
            foreign_net: stk
              ? ((parseFloat(stk.foreign_buy) || 0) -
                (parseFloat(stk.foreign_sell) || 0)) * close
              : 0,
            score: computeFinancialScore(fin),
          };
        }
      );
      setData(merged);
      setLoading(false);
    }
    fetch();
  }, []);

  const sectors = useMemo(() => {
    const s = new Set(data.map((r) => r.sector).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (indexFilter !== "All") {
      const members = INDEX_CONSTITUENTS[indexFilter];
      if (members) {
        const set = new Set(members);
        result = result.filter((r) => set.has(r.code));
      }
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.stock_name.toLowerCase().includes(q)
      );
    }
    if (sectorFilter !== "All") {
      result = result.filter((r) => r.sector === sectorFilter);
    }
    if (regimeFilter !== "All") {
      result = result.filter((r) => regimeMap.get(r.code) === regimeFilter);
    }
    result = [...result].sort((a, b) => {
      const col = COLUMNS.find((c) => c.key === sortKey);
      if (col?.numeric) {
        const av = parseFloat((a as any)[sortKey] || "0");
        const bv = parseFloat((b as any)[sortKey] || "0");
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const av = String((a as any)[sortKey] || "");
      const bv = String((b as any)[sortKey] || "");
      return sortDir === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    });
    return result;
  }, [data, search, sectorFilter, indexFilter, regimeFilter, regimeMap, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "code" || key === "stock_name" || key === "sector"
          ? "asc"
          : "desc"
      );
    }
  };

  const visible = filtered.slice(0, visibleCount);

  const ratioColor = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return "text.primary";
    return n >= 0 ? "#34d399" : "#fb7185";
  };

  if (loading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3 }} />
        <Skeleton width={160} height={28} />
        <StockTreemapSkeleton />
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3 }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <GlobalSearch compact />

      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/")}
        size="small"
        sx={{ alignSelf: "flex-start", minWidth: "auto" }}
      >
        Dashboard
      </Button>

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Screener
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.25 }}
          >
            Browse stocks and investors on the IDX
          </Typography>
        </Box>
        {screenerTab === 0 && (
          <Button
            startIcon={<HelpOutlineIcon sx={{ fontSize: 16 }} />}
            onClick={() => setGuideOpen(true)}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontSize: "0.78rem",
              fontWeight: 600,
              px: 1.5,
              borderColor: isDark
                ? "rgba(212,168,67,0.25)"
                : "rgba(161,124,47,0.2)",
              color: "primary.main",
              flexShrink: 0,
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: isDark
                  ? "rgba(212,168,67,0.06)"
                  : "rgba(161,124,47,0.04)",
              },
            }}
          >
            Learn Ratios
          </Button>
        )}
      </Box>

      <Paper sx={{ borderRadius: 2.5, overflow: "hidden" }}>
        <Tabs
          value={screenerTab}
          onChange={(_, v) => setScreenerTab(v)}
          sx={{
            minHeight: 38,
            px: 1,
            "& .MuiTab-root": {
              minHeight: 38,
              py: 0,
              px: 2,
              fontSize: "0.8rem",
              textTransform: "none",
              fontWeight: 600,
            },
          }}
        >
          <Tab icon={<ShowChartIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Stocks" />
          <Tab icon={<PeopleIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Investors" />
        </Tabs>
      </Paper>

      {screenerTab === 1 && <InvestorScreener />}

      {screenerTab === 0 && <>

      {/* ── Quick Presets ── */}
      <Stack direction="row" spacing={0.75} sx={{ overflowX: "auto", pb: 0.5, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
        {([
          { label: "All", apply: () => { setSortKey("market_cap"); setSortDir("desc"); setSectorFilter("All"); } },
          { label: "Value Stocks", apply: () => { setSortKey("per"); setSortDir("asc"); setSectorFilter("All"); } },
          { label: "High ROE", apply: () => { setSortKey("roe"); setSortDir("desc"); setSectorFilter("All"); } },
          { label: "High Dividend", apply: () => { setSortKey("eps"); setSortDir("desc"); setSectorFilter("All"); } },
          { label: "Most Active", apply: () => { setSortKey("daily_value"); setSortDir("desc"); setSectorFilter("All"); } },
          { label: "Foreign Inflow", apply: () => { setSortKey("foreign_net"); setSortDir("desc"); setSectorFilter("All"); } },
          { label: "Top Gainers", apply: () => { setSortKey("change_pct"); setSortDir("desc"); setSectorFilter("All"); } },
        ]).map((preset) => (
          <Chip
            key={preset.label}
            label={preset.label}
            size="small"
            onClick={() => {
              preset.apply();
              setVisibleCount(PAGE_SIZE);
              setSearch("");
              setIndexFilter("All");
            }}
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
              fontSize: "0.68rem",
              height: 26,
              cursor: "pointer",
              flexShrink: 0,
              bgcolor: isDark ? "rgba(212,168,67,0.08)" : "rgba(161,124,47,0.05)",
              border: "1px solid",
              borderColor: isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.1)",
              color: "primary.main",
              "&:hover": {
                bgcolor: isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.1)",
              },
            }}
          />
        ))}
      </Stack>

      {/* ── Index Filter ── */}
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          overflowX: "auto",
          pb: 0.5,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {["All", ...Object.keys(INDEX_CONSTITUENTS)].map((key) => {
          const active = indexFilter === key;
          const label = key === "All" ? "All Stocks" : (INDEX_LABELS[key] || key);
          return (
            <Chip
              key={key}
              label={label}
              size="small"
              onClick={() => {
                setIndexFilter(key);
                setVisibleCount(PAGE_SIZE);
              }}
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: active ? 700 : 500,
                fontSize: "0.72rem",
                borderRadius: 1.5,
                bgcolor: active
                  ? isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.1)"
                  : "transparent",
                border: `1px solid ${
                  active
                    ? isDark ? "rgba(212,168,67,0.35)" : "rgba(161,124,47,0.25)"
                    : isDark ? "rgba(107,127,163,0.15)" : "rgba(12,18,34,0.08)"
                }`,
                color: active ? "primary.main" : "text.secondary",
                "&:hover": {
                  bgcolor: active
                    ? isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.12)"
                    : isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)",
                },
              }}
            />
          );
        })}
      </Stack>

      <StockTreemap
        data={indexFilter !== "All" && INDEX_CONSTITUENTS[indexFilter]
          ? data.filter((r) => INDEX_CONSTITUENTS[indexFilter].includes(r.code))
          : data}
        onStockClick={(code) => router.push(`/stock/${code}`)}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ sm: "center" }}
      >
        <TextField
          size="small"
          placeholder="Search by code or name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            minWidth: 260,
            "& .MuiOutlinedInput-root": { borderRadius: 2 },
          }}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <FilterListIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              sx={{ borderRadius: 2, fontSize: "0.85rem" }}
            >
              {sectors.map((s) => (
                <MenuItem key={s} value={s} sx={{ fontSize: "0.85rem" }}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={regimeFilter}
              onChange={(e) => {
                setRegimeFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              sx={{ borderRadius: 2, fontSize: "0.85rem" }}
            >
              {["All", "accumulation", "markup", "distribution", "markdown", "neutral"].map((r) => (
                <MenuItem key={r} value={r} sx={{ fontSize: "0.85rem" }}>
                  {r === "All" ? "All Regimes" : r.charAt(0).toUpperCase() + r.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Chip
          label={`${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
          size="small"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 600,
          }}
        />
      </Stack>

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 0, overflow: "auto" }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            minWidth: 1400,
            "& th, & td": {
              px: 0.75,
              py: 0.4,
              fontSize: "0.72rem",
              whiteSpace: "nowrap",
            },
            "& th": {
              fontWeight: 700,
              fontSize: "0.68rem",
              letterSpacing: "0.02em",
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 28 }}>#</TableCell>
              {COLUMNS.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align || "left"}
                  sx={{
                    maxWidth:
                      col.key === "stock_name"
                        ? 160
                        : col.key === "sector"
                          ? 120
                          : undefined,
                  }}
                >
                  <TableSortLabel
                    active={sortKey === col.key}
                    direction={sortKey === col.key ? sortDir : "asc"}
                    onClick={() => handleSort(col.key)}
                    sx={{
                      fontSize: "inherit",
                      "& .MuiTableSortLabel-icon": {
                        fontSize: "0.8rem",
                      },
                    }}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((r, i) => (
              <TableRow
                key={r.id}
                hover
                sx={{
                  cursor: "pointer",
                  "&:last-child td": { borderBottom: 0 },
                }}
                onClick={() => router.push(`/stock/${r.code}`)}
              >
                <TableCell
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: "text.secondary",
                  }}
                >
                  {i + 1}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontFamily: '"JetBrains Mono", monospace',
                    color: "primary.main",
                  }}
                >
                  {r.code}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
                    <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                      <Box sx={{
                        width: `${Math.min(r.score, 100)}%`, height: "100%", borderRadius: 2,
                        bgcolor: r.score >= 60 ? "#34d399" : r.score >= 35 ? "#fbbf24" : "#fb7185",
                        transition: "width 0.3s ease",
                      }} />
                    </Box>
                    <Typography sx={{
                      fontSize: "0.65rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace',
                      minWidth: 20, textAlign: "right",
                      color: r.score >= 60 ? "#34d399" : r.score >= 35 ? "#fbbf24" : "#fb7185",
                    }}>{r.score}</Typography>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.stock_name}
                </TableCell>
                <TableCell>
                  <Chip
                    label={r.sector}
                    size="small"
                    sx={{
                      fontSize: "0.6rem",
                      height: 18,
                      "& .MuiChip-label": { px: 0.75 },
                    }}
                  />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 600,
                  }}
                >
                  {r.close > 0 ? r.close.toLocaleString() : "-"}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 600,
                    color:
                      r.change_pct > 0
                        ? "#34d399"
                        : r.change_pct < 0
                          ? "#fb7185"
                          : "text.secondary",
                  }}
                >
                  {r.change_pct > 0 ? "+" : ""}
                  {r.change_pct.toFixed(1)}%
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {r.market_cap > 0 ? formatValue(r.market_cap) : "-"}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: "text.secondary",
                  }}
                >
                  {r.volume > 0 ? formatValue(r.volume) : "-"}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {r.daily_value > 0 ? formatValue(r.daily_value) : "-"}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 600,
                    color:
                      r.foreign_net > 0
                        ? "#34d399"
                        : r.foreign_net < 0
                          ? "#fb7185"
                          : "text.secondary",
                  }}
                >
                  {r.foreign_net !== 0 ? (r.foreign_net > 0 ? "+" : "") + formatValue(r.foreign_net) : "-"}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {formatRatio(r.per)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {formatRatio(r.price_bv)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {formatRatio(r.de_ratio)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: ratioColor(r.roe),
                  }}
                >
                  {formatRatio(r.roe)}%
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: ratioColor(r.roa),
                  }}
                >
                  {formatRatio(r.roa)}%
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: ratioColor(r.npm),
                  }}
                >
                  {formatRatio(r.npm)}%
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {formatRatio(r.eps)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: "text.secondary",
                  }}
                >
                  {parseFloat(r.sales) > 0 ? formatBillion(r.sales) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {visibleCount < filtered.length && (
        <Box sx={{ textAlign: "center" }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Load more ({filtered.length - visibleCount} remaining)
          </Button>
        </Box>
      )}
      </>}

      <RatioGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </Stack>
  );
}
