"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import { KSEIRecord, INVESTOR_TYPE_MAP, formatShares } from "@/lib/types";
import { StatsCard, StatsCardSkeleton } from "@/components/StatsCard";
import { GlobalSearch } from "@/components/SearchInput";
import { InvestorTypeBadge, LocalForeignBadge } from "@/components/Badge";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PeopleIcon from "@mui/icons-material/People";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PublicIcon from "@mui/icons-material/Public";
import FlagIcon from "@mui/icons-material/Flag";

interface InvestorRow {
  name: string;
  origin: string;
  stocks: string[];
  stockCount: number;
  totalShares: number;
  maxPct: number;
  avgPct: number;
  topHoldingCode: string;
  topHoldingPct: number;
}

export default function CategoryPage() {
  const params = useParams();
  const typeCode = (params.type as string).toUpperCase();
  const typeName = INVESTOR_TYPE_MAP[typeCode] || typeCode;
  const router = useRouter();
  const [records, setRecords] = useState<KSEIRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("totalShares");
  const [visibleCount, setVisibleCount] = useState(50);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setVisibleCount(50);
    }, 250);
  }, []);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("INVESTOR_TYPE", typeCode)
        .order("PERCENTAGE", { ascending: false });

      if (!error && data) setRecords(data as KSEIRecord[]);
      setLoading(false);
    }
    fetchData();
  }, [typeCode]);

  const stats = useMemo(() => {
    if (records.length === 0) return null;

    const uniqueInvestors = new Set(records.map((r) => r.INVESTOR_NAME));
    const uniqueStocks = new Set(records.map((r) => r.SHARE_CODE));
    const totalShares = records.reduce(
      (s, r) => s + parseInt(r.TOTAL_HOLDING_SHARES || "0", 10),
      0
    );
    const localCount = new Set(
      records.filter((r) => r.LOCAL_FOREIGN === "L").map((r) => r.INVESTOR_NAME)
    ).size;
    const foreignCount = new Set(
      records.filter((r) => r.LOCAL_FOREIGN === "A").map((r) => r.INVESTOR_NAME)
    ).size;
    const avgPct =
      records.reduce((s, r) => s + r.PERCENTAGE, 0) / records.length;

    return {
      investors: uniqueInvestors.size,
      stocks: uniqueStocks.size,
      totalShares,
      localCount,
      foreignCount,
      avgPct: parseFloat(avgPct.toFixed(2)),
    };
  }, [records]);

  const investors = useMemo(() => {
    const grouped: Record<string, KSEIRecord[]> = {};
    records.forEach((r) => {
      if (!grouped[r.INVESTOR_NAME]) grouped[r.INVESTOR_NAME] = [];
      grouped[r.INVESTOR_NAME].push(r);
    });

    return Object.entries(grouped).map(([name, recs]): InvestorRow => {
      const totalShares = recs.reduce(
        (s, r) => s + parseInt(r.TOTAL_HOLDING_SHARES || "0", 10),
        0
      );
      const avgPct =
        recs.reduce((s, r) => s + r.PERCENTAGE, 0) / recs.length;
      const topRec = recs.reduce((best, r) =>
        r.PERCENTAGE > best.PERCENTAGE ? r : best
      );
      return {
        name,
        origin: recs[0].LOCAL_FOREIGN,
        stocks: [...new Set(recs.map((r) => r.SHARE_CODE))],
        stockCount: new Set(recs.map((r) => r.SHARE_CODE)).size,
        totalShares,
        maxPct: Math.max(...recs.map((r) => r.PERCENTAGE)),
        avgPct: parseFloat(avgPct.toFixed(2)),
        topHoldingCode: topRec.SHARE_CODE,
        topHoldingPct: topRec.PERCENTAGE,
      };
    });
  }, [records]);

  const filtered = useMemo(() => {
    let result = investors;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.name.toLowerCase().includes(q) ||
          inv.stocks.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (originFilter !== "ALL") {
      result = result.filter((inv) => inv.origin === originFilter);
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "totalShares":
          return b.totalShares - a.totalShares;
        case "maxPct":
          return b.maxPct - a.maxPct;
        case "stockCount":
          return b.stockCount - a.stockCount;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return b.totalShares - a.totalShares;
      }
    });

    return result;
  }, [investors, search, originFilter, sortBy]);

  useEffect(() => {
    setVisibleCount(50);
  }, [originFilter, sortBy]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  if (loading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={40} sx={{ borderRadius: 2 }} />
        <Skeleton width={200} height={32} />
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid size={{ xs: 6, md: 4, lg: 2 }} key={i}>
              <StatsCardSkeleton />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Stack>
    );
  }

  if (records.length === 0) {
    return (
      <Stack spacing={3}>
        <GlobalSearch compact />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/")}
          size="small"
          sx={{ alignSelf: "flex-start" }}
        >
          Dashboard
        </Button>
        <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
          <Typography color="text.secondary">
            No data found for category: {typeName} ({typeCode})
          </Typography>
        </Paper>
      </Stack>
    );
  }

  const localPct =
    stats && stats.investors > 0
      ? ((stats.localCount / stats.investors) * 100).toFixed(1)
      : "0";
  const foreignPct =
    stats && stats.investors > 0
      ? ((stats.foreignCount / stats.investors) * 100).toFixed(1)
      : "0";

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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {typeName}
          </Typography>
          <Chip
            label={typeCode}
            size="small"
            sx={{
              fontFamily: "monospace",
              fontWeight: 700,
              bgcolor: "primary.main",
              color: "#fff",
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          All {typeName.toLowerCase()} investors across the market
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 4, lg: 2 }}>
          <StatsCard
            title="Investors"
            value={stats?.investors ?? 0}
            icon={<PeopleIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 2 }}>
          <StatsCard
            title="Stocks Covered"
            value={stats?.stocks ?? 0}
            icon={<ShowChartIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 2 }}>
          <StatsCard
            title="Total Value"
            value={formatShares(stats?.totalShares ?? 0)}
            icon={<AccountBalanceIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 2 }}>
          <StatsCard
            title="Avg Ownership"
            value={`${stats?.avgPct ?? 0}%`}
            icon={<TrendingUpIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 2 }}>
          <StatsCard
            title="Local"
            value={stats?.localCount ?? 0}
            subtitle={`${localPct}%`}
            icon={<FlagIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 2 }}>
          <StatsCard
            title="Foreign"
            value={stats?.foreignCount ?? 0}
            subtitle={`${foreignPct}%`}
            icon={<PublicIcon />}
          />
        </Grid>
      </Grid>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          {typeName} Investors ({filtered.length})
        </Typography>

        <Paper sx={{ p: 1.5, borderRadius: 2.5, mb: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <TextField
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search investor or ticker..."
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        sx={{ color: "text.secondary", fontSize: 18 }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                flex: 1,
                minWidth: 200,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "rgba(0,0,0,0.02)",
                  "& fieldset": { borderColor: "divider" },
                },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                sx={{ borderRadius: 2, "& fieldset": { borderColor: "divider" } }}
              >
                <MenuItem value="ALL">All Origins</MenuItem>
                <MenuItem value="L">Local</MenuItem>
                <MenuItem value="A">Foreign</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                sx={{ borderRadius: 2, "& fieldset": { borderColor: "divider" } }}
              >
                <MenuItem value="totalShares">Sort: Total Value</MenuItem>
                <MenuItem value="maxPct">Sort: Max %</MenuItem>
                <MenuItem value="stockCount">Sort: Stock Count</MenuItem>
                <MenuItem value="name">Sort: Name</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        <TableContainer
          component={Paper}
          sx={{ borderRadius: 3, overflow: "hidden" }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell>Investor</TableCell>
                <TableCell>Origin</TableCell>
                <TableCell align="center">Stocks</TableCell>
                <TableCell>Tickers</TableCell>
                <TableCell>Top Holding</TableCell>
                <TableCell align="right">Total Value</TableCell>
                <TableCell align="right">Max %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((inv, i) => (
                <TableRow
                  key={inv.name}
                  hover
                  sx={{
                    cursor: "pointer",
                    "&:last-child td": { borderBottom: 0 },
                  }}
                  onClick={() =>
                    router.push(
                      `/investor/${encodeURIComponent(inv.name)}`
                    )
                  }
                >
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "monospace",
                        color: "text.secondary",
                      }}
                    >
                      {i + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {inv.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <LocalForeignBadge type={inv.origin} />
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace", fontWeight: 600 }}
                    >
                      {inv.stockCount}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        flexWrap: "wrap",
                        maxWidth: 200,
                      }}
                    >
                      {inv.stocks.slice(0, 3).map((s) => (
                        <Chip
                          key={s}
                          label={s}
                          size="small"
                          sx={{
                            fontFamily: "monospace",
                            fontSize: "0.7rem",
                            height: 22,
                            bgcolor: "action.hover",
                            color: "primary.main",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/stock/${s}`);
                          }}
                        />
                      ))}
                      {inv.stocks.length > 3 && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            alignSelf: "center",
                          }}
                        >
                          +{inv.stocks.length - 3}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          fontWeight: 600,
                          color: "primary.main",
                          cursor: "pointer",
                          "&:hover": { textDecoration: "underline" },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/stock/${inv.topHoldingCode}`);
                        }}
                      >
                        {inv.topHoldingCode}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: "monospace", color: "text.secondary" }}
                      >
                        {inv.topHoldingPct.toFixed(2)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace", fontWeight: 600 }}
                    >
                      {formatShares(inv.totalShares)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace" }}
                    >
                      {inv.maxPct.toFixed(2)}%
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {hasMore && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setVisibleCount((c) => c + 50)}
              sx={{ borderRadius: 2, px: 3 }}
            >
              Load more ({filtered.length - visibleCount} remaining)
            </Button>
          </Box>
        )}

        {filtered.length === 0 && (
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3, mt: 1.5 }}>
            <Typography color="text.secondary">
              No investors found matching your criteria
            </Typography>
          </Paper>
        )}
      </Box>
    </Stack>
  );
}
