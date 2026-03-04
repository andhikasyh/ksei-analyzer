"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import { KSEIRecord, INVESTOR_TYPE_MAP, formatShares } from "@/lib/types";
import { StatsCard, StatsCardSkeleton } from "@/components/StatsCard";
import { GlobalSearch } from "@/components/SearchInput";
import { InvestorTypeBadge, LocalForeignBadge } from "@/components/Badge";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PeopleIcon from "@mui/icons-material/People";
import PublicIcon from "@mui/icons-material/Public";
import FlagIcon from "@mui/icons-material/Flag";

interface TypeBreakdown {
  code: string;
  name: string;
  count: number;
  totalPct: number;
}

interface TopInvestor {
  name: string;
  type: string;
  stocks: string[];
  totalShares: number;
  maxPct: number;
}

interface Conglomerate {
  name: string;
  stockCount: number;
  stocks: string[];
  totalShares: number;
  maxPct: number;
  type: string;
  origin: string;
}

interface DashboardData {
  totalTickers: number;
  totalInvestors: number;
  avgLocalPct: number;
  avgForeignPct: number;
  investorTypeBreakdown: TypeBreakdown[];
  topForeignInvestors: TopInvestor[];
  topLocalInvestors: TopInvestor[];
  conglomerates: Conglomerate[];
}

function aggregateInvestors(records: KSEIRecord[]): TopInvestor[] {
  const grouped: Record<string, { stocks: Set<string>; records: KSEIRecord[] }> = {};
  records.forEach((r) => {
    if (!grouped[r.INVESTOR_NAME]) {
      grouped[r.INVESTOR_NAME] = { stocks: new Set(), records: [] };
    }
    grouped[r.INVESTOR_NAME].stocks.add(r.SHARE_CODE);
    grouped[r.INVESTOR_NAME].records.push(r);
  });

  return Object.entries(grouped)
    .map(([name, d]) => ({
      name,
      type: d.records[0].INVESTOR_TYPE,
      stocks: [...d.stocks],
      totalShares: d.records.reduce(
        (s, r) => s + parseInt(r.TOTAL_HOLDING_SHARES || "0", 10),
        0
      ),
      maxPct: Math.max(...d.records.map((r) => r.PERCENTAGE)),
    }))
    .sort((a, b) => b.totalShares - a.totalShares)
    .slice(0, 10);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: records, error: fetchError } = await supabase
          .from(TABLE_NAME)
          .select("*")
          .order("PERCENTAGE", { ascending: false });

        if (fetchError) throw fetchError;
        if (!records || records.length === 0) {
          setError("No data found. Check your table name in src/lib/supabase.ts");
          setLoading(false);
          return;
        }

        const typed = records as KSEIRecord[];

        const uniqueTickers = new Set(typed.map((r) => r.SHARE_CODE));
        const uniqueInvestors = new Set(typed.map((r) => r.INVESTOR_NAME));

        const stockOwnership = new Map<string, { local: number; foreign: number }>();
        typed.forEach((r) => {
          if (!stockOwnership.has(r.SHARE_CODE)) {
            stockOwnership.set(r.SHARE_CODE, { local: 0, foreign: 0 });
          }
          const entry = stockOwnership.get(r.SHARE_CODE)!;
          if (r.LOCAL_FOREIGN === "L") entry.local += r.PERCENTAGE;
          else entry.foreign += r.PERCENTAGE;
        });
        const stockCount = stockOwnership.size;
        const rawAvgLocal =
          [...stockOwnership.values()].reduce((s, v) => s + v.local, 0) / stockCount;
        const rawAvgForeign =
          [...stockOwnership.values()].reduce((s, v) => s + v.foreign, 0) / stockCount;
        const rawAvgTotal = rawAvgLocal + rawAvgForeign;
        const avgLocal = rawAvgTotal > 0 ? (rawAvgLocal / rawAvgTotal) * 100 : 0;
        const avgForeign = rawAvgTotal > 0 ? (rawAvgForeign / rawAvgTotal) * 100 : 0;

        const typeGroups: Record<string, KSEIRecord[]> = {};
        typed.forEach((r) => {
          const code = r.INVESTOR_TYPE;
          if (!code || code === "null" || !INVESTOR_TYPE_MAP[code]) return;
          if (!typeGroups[code]) typeGroups[code] = [];
          typeGroups[code].push(r);
        });
        const investorTypeBreakdown = Object.entries(typeGroups)
          .map(([code, recs]) => ({
            code,
            name: INVESTOR_TYPE_MAP[code] || code,
            count: new Set(recs.map((r) => r.INVESTOR_NAME)).size,
            totalPct: recs.reduce((s, r) => s + r.PERCENTAGE, 0),
          }))
          .sort((a, b) => b.count - a.count);

        const foreignRecords = typed.filter((r) => r.LOCAL_FOREIGN === "A");
        const localRecords = typed.filter((r) => r.LOCAL_FOREIGN === "L");
        const topForeignInvestors = aggregateInvestors(foreignRecords);
        const topLocalInvestors = aggregateInvestors(localRecords);

        const investorHoldings: Record<
          string,
          { stocks: Set<string>; records: KSEIRecord[] }
        > = {};
        typed.forEach((r) => {
          if (!investorHoldings[r.INVESTOR_NAME]) {
            investorHoldings[r.INVESTOR_NAME] = { stocks: new Set(), records: [] };
          }
          investorHoldings[r.INVESTOR_NAME].stocks.add(r.SHARE_CODE);
          investorHoldings[r.INVESTOR_NAME].records.push(r);
        });
        const conglomerates = Object.entries(investorHoldings)
          .filter(([, d]) => d.stocks.size >= 2)
          .map(([name, d]) => ({
            name,
            stockCount: d.stocks.size,
            stocks: [...d.stocks],
            totalShares: d.records.reduce(
              (s, r) => s + parseInt(r.TOTAL_HOLDING_SHARES || "0", 10),
              0
            ),
            maxPct: Math.max(...d.records.map((r) => r.PERCENTAGE)),
            type: d.records[0].INVESTOR_TYPE,
            origin: d.records[0].LOCAL_FOREIGN,
          }))
          .sort((a, b) => b.totalShares - a.totalShares)
          .slice(0, 15);

        setData({
          totalTickers: uniqueTickers.size,
          totalInvestors: uniqueInvestors.size,
          avgLocalPct: parseFloat(avgLocal.toFixed(1)),
          avgForeignPct: parseFloat(avgForeign.toFixed(1)),
          investorTypeBreakdown,
          topForeignInvestors,
          topLocalInvestors,
          conglomerates,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const maxTypeCount = useMemo(() => {
    if (!data) return 1;
    return Math.max(...data.investorTypeBreakdown.map((t) => t.count), 1);
  }, [data]);

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Paper sx={{ p: 4, textAlign: "center", maxWidth: 420, borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Connection Error
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (loading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3 }} />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid size={{ xs: 6, lg: 3 }} key={i}>
              <StatsCardSkeleton />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
      </Stack>
    );
  }

  if (!data) return null;

  const localForeignTotal = data.avgLocalPct + data.avgForeignPct;
  const localBarWidth =
    localForeignTotal > 0 ? (data.avgLocalPct / localForeignTotal) * 100 : 50;

  return (
    <Stack spacing={3}>
      {/* 1. MAIN SEARCH */}
      <GlobalSearch />

      {/* 2. STAT CARDS */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard
            title="Total Tickers"
            value={data.totalTickers}
            subtitle="Unique stocks"
            icon={<ShowChartIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard
            title="Total Investors"
            value={data.totalInvestors.toLocaleString()}
            subtitle="Unique entities"
            icon={<PeopleIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard
            title="Avg Local Ownership"
            value={`${data.avgLocalPct}%`}
            subtitle="Per ticker average"
            icon={<FlagIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard
            title="Avg Foreign Ownership"
            value={`${data.avgForeignPct}%`}
            subtitle="Per ticker average"
            icon={<PublicIcon />}
          />
        </Grid>
      </Grid>

      {/* LOCAL/FOREIGN COMPARISON BAR */}
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
          Local vs Foreign Ownership
        </Typography>
        <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "#22c55e", minWidth: 52 }}
          >
            {data.avgLocalPct}%
          </Typography>
          <Box
            sx={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              bgcolor: "rgba(245,158,11,0.2)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${localBarWidth}%`,
                height: "100%",
                borderRadius: 4,
                bgcolor: "#22c55e",
                transition: "width 0.6s ease",
              }}
            />
          </Box>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "#f59e0b", minWidth: 52, textAlign: "right" }}
          >
            {data.avgForeignPct}%
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.75 }}>
          <Typography variant="caption" color="text.secondary">
            Local
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Foreign
          </Typography>
        </Box>
      </Paper>

      {/* 3. MARKET OVERVIEW */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Market Overview
        </Typography>
        <Grid container spacing={1.5}>
          {data.investorTypeBreakdown.map((t) => (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={t.code}>
              <Paper
                onClick={() => router.push(`/category/${t.code}`)}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  cursor: "pointer",
                  transition: "border-color 0.15s ease, background-color 0.15s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "rgba(59,130,246,0.04)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color: "primary.main",
                    }}
                  >
                    {t.code}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {t.count}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, fontSize: "0.8rem" }}
                >
                  {t.name}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(t.count / maxTypeCount) * 100}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: "rgba(59,130,246,0.1)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: "primary.main",
                      borderRadius: 2,
                    },
                  }}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 4a. TOP FOREIGN INVESTORS */}
      <InvestorTable
        title="Top Foreign Investors"
        investors={data.topForeignInvestors}
        router={router}
      />

      {/* 4b. TOP LOCAL INVESTORS */}
      <InvestorTable
        title="Top Local Investors"
        investors={data.topLocalInvestors}
        router={router}
      />

      {/* 5. CONGLOMERATES (GROUPS) */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Conglomerates
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "block", mb: 1.5 }}
        >
          Investors holding positions across multiple stocks, sorted by total value
        </Typography>
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 3, overflow: "hidden" }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell>Investor</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Origin</TableCell>
                <TableCell align="center">Stocks</TableCell>
                <TableCell>Tickers</TableCell>
                <TableCell align="right">Total Value</TableCell>
                <TableCell align="right">Max %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.conglomerates.map((g, i) => (
                <TableRow
                  key={g.name}
                  hover
                  sx={{
                    cursor: "pointer",
                    "&:last-child td": { borderBottom: 0 },
                  }}
                  onClick={() =>
                    router.push(`/investor/${encodeURIComponent(g.name)}`)
                  }
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
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {g.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <InvestorTypeBadge type={g.type} />
                  </TableCell>
                  <TableCell>
                    <LocalForeignBadge type={g.origin} />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={g.stockCount}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontFamily: "monospace",
                        minWidth: 32,
                        bgcolor: "primary.main",
                        color: "#fff",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        flexWrap: "wrap",
                        maxWidth: 240,
                      }}
                    >
                      {g.stocks.slice(0, 4).map((s) => (
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
                      {g.stocks.length > 4 && (
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", alignSelf: "center" }}
                        >
                          +{g.stocks.length - 4}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace", fontWeight: 600 }}
                    >
                      {formatShares(g.totalShares)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace" }}
                    >
                      {g.maxPct.toFixed(2)}%
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Stack>
  );
}

function InvestorTable({
  title,
  investors,
  router,
}: {
  title: string;
  investors: TopInvestor[];
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        {title}
      </Typography>
      <TableContainer
        component={Paper}
        sx={{ borderRadius: 3, overflow: "hidden" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40 }}>#</TableCell>
              <TableCell>Investor</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Stocks</TableCell>
              <TableCell align="right">Total Value</TableCell>
              <TableCell align="right">Max %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {investors.map((inv, i) => (
              <TableRow
                key={inv.name}
                hover
                sx={{
                  cursor: "pointer",
                  "&:last-child td": { borderBottom: 0 },
                }}
                onClick={() =>
                  router.push(`/investor/${encodeURIComponent(inv.name)}`)
                }
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
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {inv.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <InvestorTypeBadge type={inv.type} />
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
                        sx={{ color: "text.secondary", alignSelf: "center" }}
                      >
                        +{inv.stocks.length - 3}
                      </Typography>
                    )}
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
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {inv.maxPct.toFixed(2)}%
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
