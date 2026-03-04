"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { IDXFinancialRatio, IDXStockSummary, formatBillion, formatRatio, formatValue } from "@/lib/types";
import { GlobalSearch } from "@/components/SearchInput";
import { StatsCard, StatsCardSkeleton } from "@/components/StatsCard";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
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
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import ScienceIcon from "@mui/icons-material/Science";
import BoltIcon from "@mui/icons-material/Bolt";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import ComputerIcon from "@mui/icons-material/Computer";
import ApartmentIcon from "@mui/icons-material/Apartment";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ConstructionIcon from "@mui/icons-material/Construction";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CategoryIcon from "@mui/icons-material/Category";

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  Financials: <AccountBalanceIcon />,
  "Consumer Cyclicals": <ShoppingBagIcon />,
  Industrials: <PrecisionManufacturingIcon />,
  "Basic Materials": <ScienceIcon />,
  Energy: <BoltIcon />,
  Healthcare: <LocalHospitalIcon />,
  Technology: <ComputerIcon />,
  "Properties & Real Estate": <ApartmentIcon />,
  "Consumer Non-Cyclicals": <ShoppingCartIcon />,
  Infrastructures: <ConstructionIcon />,
  "Transportation & Logistic": <LocalShippingIcon />,
};

interface ScreenerRow extends IDXFinancialRatio {
  close: number;
  change_pct: number;
  market_cap: number;
  daily_value: number;
  foreign_net: number;
}

type SortKey =
  | "code"
  | "stock_name"
  | "sector"
  | "close"
  | "change_pct"
  | "market_cap"
  | "assets"
  | "equity"
  | "per"
  | "price_bv"
  | "de_ratio"
  | "roe"
  | "npm"
  | "eps";

type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; align?: "right" | "left"; numeric?: boolean }[] = [
  { key: "code", label: "Code" },
  { key: "stock_name", label: "Company" },
  { key: "sector", label: "Sector" },
  { key: "close", label: "Price", align: "right", numeric: true },
  { key: "change_pct", label: "Chg%", align: "right", numeric: true },
  { key: "market_cap", label: "Mkt Cap", align: "right", numeric: true },
  { key: "per", label: "P/E", align: "right", numeric: true },
  { key: "price_bv", label: "P/BV", align: "right", numeric: true },
  { key: "de_ratio", label: "D/E", align: "right", numeric: true },
  { key: "roe", label: "ROE", align: "right", numeric: true },
  { key: "npm", label: "NPM", align: "right", numeric: true },
  { key: "eps", label: "EPS", align: "right", numeric: true },
];

const PAGE_SIZE = 50;

export default function ScreenerPage() {
  const router = useRouter();
  const [data, setData] = useState<ScreenerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    async function fetch() {
      const [finRes, stockRes] = await Promise.all([
        supabase.from("idx_financial_ratios").select("*").order("code"),
        supabase.from("idx_stock_summary").select("*").order("date", { ascending: false }).limit(2000),
      ]);

      const latestFin = new Map<string, IDXFinancialRatio>();
      if (finRes.data) {
        (finRes.data as IDXFinancialRatio[]).forEach((r) => {
          const existing = latestFin.get(r.code);
          if (!existing || r.fs_date > existing.fs_date) latestFin.set(r.code, r);
        });
      }

      const latestStock = new Map<string, IDXStockSummary>();
      if (stockRes.data) {
        (stockRes.data as IDXStockSummary[]).forEach((r) => {
          const existing = latestStock.get(r.stock_code);
          if (!existing || r.date > existing.date) latestStock.set(r.stock_code, r);
        });
      }

      const merged: ScreenerRow[] = Array.from(latestFin.values()).map((fin) => {
        const stk = latestStock.get(fin.code);
        const close = stk ? parseFloat(stk.close) || 0 : 0;
        const prev = stk ? parseFloat(stk.previous) || 0 : 0;
        const listed = stk ? parseFloat(stk.listed_shares) || 0 : 0;
        return {
          ...fin,
          close,
          change_pct: prev > 0 ? ((parseFloat(stk?.change || "0")) / prev) * 100 : 0,
          market_cap: close * listed,
          daily_value: stk ? parseFloat(stk.value) || 0 : 0,
          foreign_net: stk ? (parseFloat(stk.foreign_buy) || 0) - (parseFloat(stk.foreign_sell) || 0) : 0,
        };
      });
      setData(merged);
      setLoading(false);
    }
    fetch();
  }, []);

  const sectors = useMemo(() => {
    const s = new Set(data.map((r) => r.sector).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [data]);

  const sectorStats = useMemo(() => {
    const map: Record<string, { assets: number; count: number }> = {};
    data.forEach((r) => {
      if (!r.sector) return;
      if (!map[r.sector]) map[r.sector] = { assets: 0, count: 0 };
      map[r.sector].assets += parseFloat(r.assets) || 0;
      map[r.sector].count += 1;
    });
    return Object.entries(map)
      .map(([sector, v]) => ({ sector, ...v }))
      .sort((a, b) => b.assets - a.assets);
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;
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
    result = [...result].sort((a, b) => {
      const col = COLUMNS.find((c) => c.key === sortKey);
      if (col?.numeric) {
        const av = parseFloat((a as any)[sortKey] || "0");
        const bv = parseFloat((b as any)[sortKey] || "0");
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const av = String((a as any)[sortKey] || "");
      const bv = String((b as any)[sortKey] || "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return result;
  }, [data, search, sectorFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "code" || key === "stock_name" || key === "sector" ? "asc" : "desc");
    }
  };

  const visible = filtered.slice(0, visibleCount);

  const ratioColor = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return "text.primary";
    return n >= 0 ? "#22c55e" : "#ef4444";
  };

  if (loading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3 }} />
        <Skeleton width={160} height={28} />
        <Grid container spacing={1.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={i}>
              <StatsCardSkeleton />
            </Grid>
          ))}
        </Grid>
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

      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Stock Screener
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {data.length} companies with financial ratios
        </Typography>
      </Box>

      <Grid container spacing={1.5}>
        {sectorStats.map((s) => (
          <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={s.sector}>
            <StatsCard
              title={s.sector}
              value={formatBillion(s.assets)}
              subtitle={`${s.count} companies`}
              icon={SECTOR_ICONS[s.sector] || <CategoryIcon />}
            />
          </Grid>
        ))}
      </Grid>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
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
                  <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
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
        </Stack>
        <Chip
          label={`${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
          size="small"
          sx={{ fontFamily: "monospace", fontWeight: 600 }}
        />
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 36 }}>#</TableCell>
              {COLUMNS.map((col) => (
                <TableCell key={col.key} align={col.align || "left"}>
                  <TableSortLabel
                    active={sortKey === col.key}
                    direction={sortKey === col.key ? sortDir : "asc"}
                    onClick={() => handleSort(col.key)}
                    sx={{ fontSize: "inherit" }}
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
                <TableCell>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: "monospace", color: "text.secondary" }}
                  >
                    {i + 1}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, fontFamily: "monospace", color: "primary.main" }}
                  >
                    {r.code}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      maxWidth: 220,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.stock_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={r.sector}
                    size="small"
                    sx={{ fontSize: "0.65rem", height: 20 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                    {r.close > 0 ? r.close.toLocaleString() : "-"}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: "monospace",
                      fontWeight: 600,
                      color: r.change_pct > 0 ? "#22c55e" : r.change_pct < 0 ? "#ef4444" : "text.secondary",
                    }}
                  >
                    {r.change_pct > 0 ? "+" : ""}{r.change_pct.toFixed(2)}%
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                    {r.market_cap > 0 ? formatValue(r.market_cap) : "-"}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                    {formatRatio(r.per)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                    {formatRatio(r.price_bv)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                    {formatRatio(r.de_ratio)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: "monospace", color: ratioColor(r.roe) }}
                  >
                    {formatRatio(r.roe)}%
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: "monospace", color: ratioColor(r.npm) }}
                  >
                    {formatRatio(r.npm)}%
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                    {formatRatio(r.eps)}
                  </Typography>
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
    </Stack>
  );
}
