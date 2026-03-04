"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import { KSEIRecord, IDXStockSummary, INVESTOR_TYPE_MAP, formatShares, formatValue } from "@/lib/types";
import { InvestorTypeBadge, LocalForeignBadge } from "@/components/Badge";
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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Button from "@mui/material/Button";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";

interface InvestorRow {
  name: string;
  type: string;
  origin: string;
  nationality: string;
  stockCount: number;
  stocks: string[];
  totalShares: number;
  totalValue: number;
  avgPercentage: number;
  maxPercentage: number;
  topStock: string;
}

type InvestorSortKey =
  | "name"
  | "type"
  | "origin"
  | "stockCount"
  | "totalShares"
  | "totalValue"
  | "avgPercentage"
  | "maxPercentage"
  | "topStock";

type SortDir = "asc" | "desc";

const COLUMNS: {
  key: InvestorSortKey;
  label: string;
  align?: "right" | "left";
  numeric?: boolean;
}[] = [
  { key: "name", label: "Investor Name" },
  { key: "type", label: "Type" },
  { key: "origin", label: "L/F" },
  { key: "stockCount", label: "Holdings", align: "right", numeric: true },
  { key: "totalShares", label: "Total Shares", align: "right", numeric: true },
  { key: "totalValue", label: "Portfolio Value", align: "right", numeric: true },
  { key: "topStock", label: "Top Holding" },
  { key: "maxPercentage", label: "Top Stake", align: "right", numeric: true },
  { key: "avgPercentage", label: "Avg Stake", align: "right", numeric: true },
];

const PAGE_SIZE = 50;

export function InvestorScreener() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [data, setData] = useState<InvestorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [originFilter, setOriginFilter] = useState("All");
  const [sortKey, setSortKey] = useState<InvestorSortKey>("totalShares");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    async function fetchInvestors() {
      const [kseiRes, stockRes] = await Promise.all([
        supabase
          .from(TABLE_NAME)
          .select("INVESTOR_NAME, INVESTOR_TYPE, LOCAL_FOREIGN, NATIONALITY, SHARE_CODE, PERCENTAGE, TOTAL_HOLDING_SHARES"),
        supabase
          .from("idx_stock_summary")
          .select("stock_code, date, close")
          .order("date", { ascending: false })
          .limit(2000),
      ]);

      if (kseiRes.error || !kseiRes.data) {
        setLoading(false);
        return;
      }

      const latestPrice = new Map<string, number>();
      if (stockRes.data) {
        (stockRes.data as Pick<IDXStockSummary, "stock_code" | "date" | "close">[]).forEach((r) => {
          if (!latestPrice.has(r.stock_code)) {
            latestPrice.set(r.stock_code, parseFloat(r.close) || 0);
          }
        });
      }

      const records = kseiRes.data as KSEIRecord[];
      const investorMap = new Map<
        string,
        {
          type: string;
          origin: string;
          nationality: string;
          stocks: Set<string>;
          totalShares: number;
          totalValue: number;
          totalPct: number;
          maxPct: number;
          topStock: string;
        }
      >();

      records.forEach((r) => {
        const existing = investorMap.get(r.INVESTOR_NAME);
        const shares = parseInt(r.TOTAL_HOLDING_SHARES || "0", 10);
        const pct = r.PERCENTAGE || 0;
        const price = latestPrice.get(r.SHARE_CODE) || 0;
        const holdingValue = shares * price;

        if (existing) {
          existing.stocks.add(r.SHARE_CODE);
          existing.totalShares += shares;
          existing.totalValue += holdingValue;
          existing.totalPct += pct;
          if (pct > existing.maxPct) {
            existing.maxPct = pct;
            existing.topStock = r.SHARE_CODE;
          }
        } else {
          investorMap.set(r.INVESTOR_NAME, {
            type: r.INVESTOR_TYPE,
            origin: r.LOCAL_FOREIGN,
            nationality: r.NATIONALITY || "-",
            stocks: new Set([r.SHARE_CODE]),
            totalShares: shares,
            totalValue: holdingValue,
            totalPct: pct,
            maxPct: pct,
            topStock: r.SHARE_CODE,
          });
        }
      });

      const rows: InvestorRow[] = Array.from(investorMap.entries()).map(
        ([name, v]) => ({
          name,
          type: v.type,
          origin: v.origin,
          nationality: v.nationality,
          stockCount: v.stocks.size,
          stocks: Array.from(v.stocks),
          totalShares: v.totalShares,
          totalValue: v.totalValue,
          avgPercentage: v.stocks.size > 0 ? v.totalPct / v.stocks.size : 0,
          maxPercentage: v.maxPct,
          topStock: v.topStock,
        })
      );

      setData(rows);
      setLoading(false);
    }
    fetchInvestors();
  }, []);

  const investorTypes = useMemo(() => {
    const types = new Set(data.map((r) => r.type).filter(Boolean));
    return ["All", ...Array.from(types).sort()];
  }, [data]);

  const typeStats = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((r) => {
      const label = INVESTOR_TYPE_MAP[r.type] || r.type || "Unknown";
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.stocks.some((s) => s.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== "All") {
      result = result.filter((r) => r.type === typeFilter);
    }
    if (originFilter !== "All") {
      result = result.filter((r) => r.origin === originFilter);
    }
    result = [...result].sort((a, b) => {
      const col = COLUMNS.find((c) => c.key === sortKey);
      if (col?.numeric) {
        const av = (a as any)[sortKey] || 0;
        const bv = (b as any)[sortKey] || 0;
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const av = String((a as any)[sortKey] || "");
      const bv = String((b as any)[sortKey] || "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return result;
  }, [data, search, typeFilter, originFilter, sortKey, sortDir]);

  const handleSort = (key: InvestorSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "name" || key === "type" || key === "origin" || key === "topStock"
          ? "asc"
          : "desc"
      );
    }
  };

  const visible = filtered.slice(0, visibleCount);

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3 }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {data.length} unique investors across all listed stocks
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {typeStats.slice(0, 8).map((s) => (
          <Chip
            key={s.type}
            label={`${s.type} (${s.count})`}
            size="small"
            onClick={() => {
              const code = Object.entries(INVESTOR_TYPE_MAP).find(
                ([, v]) => v === s.type
              )?.[0];
              setTypeFilter(
                typeFilter === (code || s.type) ? "All" : code || s.type
              );
              setVisibleCount(PAGE_SIZE);
            }}
            sx={{
              fontSize: "0.68rem",
              height: 24,
              fontWeight: 600,
              cursor: "pointer",
              bgcolor:
                typeFilter !== "All" &&
                (INVESTOR_TYPE_MAP[typeFilter] === s.type || typeFilter === s.type)
                  ? isDark
                    ? "rgba(212,168,67,0.15)"
                    : "rgba(161,124,47,0.1)"
                  : undefined,
              color:
                typeFilter !== "All" &&
                (INVESTOR_TYPE_MAP[typeFilter] === s.type || typeFilter === s.type)
                  ? "primary.main"
                  : undefined,
            }}
          />
        ))}
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ sm: "center" }}
      >
        <TextField
          size="small"
          placeholder="Search investor name or stock code..."
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
            minWidth: 280,
            "& .MuiOutlinedInput-root": { borderRadius: 2 },
          }}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <FilterListIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              sx={{ borderRadius: 2, fontSize: "0.85rem" }}
            >
              <MenuItem value="All" sx={{ fontSize: "0.85rem" }}>
                All Types
              </MenuItem>
              {investorTypes
                .filter((t) => t !== "All")
                .map((t) => (
                  <MenuItem key={t} value={t} sx={{ fontSize: "0.85rem" }}>
                    {INVESTOR_TYPE_MAP[t] || t}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={originFilter}
              onChange={(e) => {
                setOriginFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              sx={{ borderRadius: 2, fontSize: "0.85rem" }}
            >
              <MenuItem value="All" sx={{ fontSize: "0.85rem" }}>
                All Origins
              </MenuItem>
              <MenuItem value="L" sx={{ fontSize: "0.85rem" }}>
                Local
              </MenuItem>
              <MenuItem value="A" sx={{ fontSize: "0.85rem" }}>
                Foreign
              </MenuItem>
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
            tableLayout: "fixed",
            minWidth: 980,
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
                    width:
                      col.key === "name"
                        ? 200
                        : col.key === "type"
                          ? 105
                          : col.key === "origin"
                            ? 58
                            : col.key === "topStock"
                              ? 72
                              : col.key === "totalValue"
                                ? 90
                                : col.key === "totalShares"
                                  ? 82
                                  : 66,
                  }}
                >
                  <TableSortLabel
                    active={sortKey === col.key}
                    direction={sortKey === col.key ? sortDir : "asc"}
                    onClick={() => handleSort(col.key)}
                    sx={{
                      fontSize: "inherit",
                      "& .MuiTableSortLabel-icon": { fontSize: "0.8rem" },
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
                key={r.name}
                hover
                sx={{
                  cursor: "pointer",
                  "&:last-child td": { borderBottom: 0 },
                }}
                onClick={() =>
                  router.push(`/investor/${encodeURIComponent(r.name)}`)
                }
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
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.name}
                </TableCell>
                <TableCell>
                  <InvestorTypeBadge type={r.type} />
                </TableCell>
                <TableCell>
                  <LocalForeignBadge type={r.origin} />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}
                >
                  {r.stockCount}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {formatShares(r.totalShares)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}
                >
                  {r.totalValue > 0 ? formatValue(r.totalValue) : "-"}
                </TableCell>
                <TableCell>
                  <Chip
                    label={r.topStock}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/stock/${r.topStock}`);
                    }}
                    sx={{
                      fontSize: "0.62rem",
                      height: 18,
                      fontWeight: 700,
                      fontFamily: '"JetBrains Mono", monospace',
                      cursor: "pointer",
                      bgcolor: isDark
                        ? "rgba(212,168,67,0.1)"
                        : "rgba(161,124,47,0.06)",
                      color: "primary.main",
                      "& .MuiChip-label": { px: 0.75 },
                    }}
                  />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}
                >
                  {r.maxPercentage.toFixed(2)}%
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: "text.secondary",
                  }}
                >
                  {r.avgPercentage.toFixed(2)}%
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
