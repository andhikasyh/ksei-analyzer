"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import { KSEIRecord, INVESTOR_TYPE_MAP, formatShares } from "@/lib/types";
import { StatsCard, StatsCardSkeleton } from "@/components/StatsCard";
import { GlobalSearch } from "@/components/SearchInput";
import { OwnershipPieChart, ChartSkeleton } from "@/components/Charts";
import { InvestorTypeBadge, LocalForeignBadge } from "@/components/Badge";
import {
  ConnectionGraph,
  ConnectionGraphSkeleton,
  GraphNode,
  GraphLink,
} from "@/components/ConnectionGraph";
import { BrokerSummaryPanel } from "@/components/BrokerSummary";
import { CompanyProfilePanel } from "@/components/CompanyProfile";
import { TradingViewChart } from "@/components/TradingViewChart";
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PeopleIcon from "@mui/icons-material/People";
import PublicIcon from "@mui/icons-material/Public";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import FlagIcon from "@mui/icons-material/Flag";

export default function StockDetailPage() {
  const params = useParams();
  const code = params.code as string;
  const router = useRouter();
  const [records, setRecords] = useState<KSEIRecord[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("SHARE_CODE", code)
        .order("PERCENTAGE", { ascending: false });

      if (!error && data) {
        const typed = data as KSEIRecord[];
        setRecords(typed);
        await buildGraph(typed);
      }
      setLoading(false);
    }

    async function buildGraph(primary: KSEIRecord[]) {
      const top = primary.slice(0, 12);
      const investorNames = top.map((r) => r.INVESTOR_NAME);

      const { data: cross } = await supabase
        .from(TABLE_NAME)
        .select("INVESTOR_NAME, SHARE_CODE, PERCENTAGE")
        .in("INVESTOR_NAME", investorNames)
        .neq("SHARE_CODE", code)
        .order("PERCENTAGE", { ascending: false });

      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];
      const nodeIds = new Set<string>();

      nodes.push({ id: code, label: code, type: "stock", size: 1, isCenter: true });
      nodeIds.add(code);

      top.forEach((r) => {
        if (!nodeIds.has(r.INVESTOR_NAME)) {
          nodes.push({
            id: r.INVESTOR_NAME,
            label: r.INVESTOR_NAME,
            type: "investor",
            size: Math.max(0.2, r.PERCENTAGE / 50),
          });
          nodeIds.add(r.INVESTOR_NAME);
        }
        links.push({
          source: r.INVESTOR_NAME,
          target: code,
          value: r.PERCENTAGE,
        });
      });

      if (cross) {
        const crossByInvestor: Record<string, typeof cross> = {};
        (cross as any[]).forEach((r) => {
          if (!crossByInvestor[r.INVESTOR_NAME])
            crossByInvestor[r.INVESTOR_NAME] = [];
          crossByInvestor[r.INVESTOR_NAME].push(r);
        });

        Object.entries(crossByInvestor).forEach(([inv, recs]) => {
          recs.slice(0, 3).forEach((r: any) => {
            if (!nodeIds.has(r.SHARE_CODE)) {
              nodes.push({
                id: r.SHARE_CODE,
                label: r.SHARE_CODE,
                type: "stock",
                size: Math.max(0.15, r.PERCENTAGE / 80),
              });
              nodeIds.add(r.SHARE_CODE);
            }
            links.push({
              source: inv,
              target: r.SHARE_CODE,
              value: r.PERCENTAGE,
            });
          });
        });
      }

      setGraphNodes(nodes);
      setGraphLinks(links);
    }

    fetchData();
  }, [code]);

  if (loading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={40} sx={{ borderRadius: 2 }} />
        <Skeleton width={160} height={28} />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid size={{ xs: 6, lg: 3 }} key={i}>
              <StatsCardSkeleton />
            </Grid>
          ))}
        </Grid>
        <ConnectionGraphSkeleton />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
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
            No data found for stock code: {code}
          </Typography>
        </Paper>
      </Stack>
    );
  }

  const issuerName = records[0].ISSUER_NAME;
  const totalInvestors = records.length;
  const rawLocalPct = records
    .filter((r) => r.LOCAL_FOREIGN === "L")
    .reduce((sum, r) => sum + r.PERCENTAGE, 0);
  const rawForeignPct = records
    .filter((r) => r.LOCAL_FOREIGN === "A")
    .reduce((sum, r) => sum + r.PERCENTAGE, 0);
  const rawTotal = rawLocalPct + rawForeignPct;
  const localPct = rawTotal > 0 ? (rawLocalPct / rawTotal) * 100 : 0;
  const foreignPct = rawTotal > 0 ? (rawForeignPct / rawTotal) * 100 : 0;
  const topHolder = records[0];

  const typeGroups: Record<string, number> = {};
  records.forEach((r) => {
    const label = INVESTOR_TYPE_MAP[r.INVESTOR_TYPE] || r.INVESTOR_TYPE;
    if (label) typeGroups[label] = (typeGroups[label] || 0) + r.PERCENTAGE;
  });

  const ownershipData = records.slice(0, 8).map((r) => ({
    name:
      r.INVESTOR_NAME.length > 25
        ? r.INVESTOR_NAME.slice(0, 25) + "..."
        : r.INVESTOR_NAME,
    value: r.PERCENTAGE,
  }));
  const remaining = records.slice(8).reduce((sum, r) => sum + r.PERCENTAGE, 0);
  if (remaining > 0) {
    ownershipData.push({
      name: "Others",
      value: parseFloat(remaining.toFixed(2)),
    });
  }

  const typeChartData = Object.entries(typeGroups)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  const sorted = [...records].sort((a, b) => {
    const aShares = parseInt(a.TOTAL_HOLDING_SHARES || "0", 10);
    const bShares = parseInt(b.TOTAL_HOLDING_SHARES || "0", 10);
    return bShares - aShares;
  });

  const localForeignTotal = localPct + foreignPct;
  const localBarWidth =
    localForeignTotal > 0 ? (localPct / localForeignTotal) * 100 : 50;

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
          {code}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {issuerName}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard title="Total Investors" value={totalInvestors} icon={<PeopleIcon />} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard title="Local Ownership" value={`${localPct.toFixed(1)}%`} icon={<FlagIcon />} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard title="Foreign Ownership" value={`${foreignPct.toFixed(1)}%`} icon={<PublicIcon />} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard
            title="Top Holder"
            value={`${topHolder.PERCENTAGE}%`}
            subtitle={topHolder.INVESTOR_NAME}
            icon={<TrendingUpIcon />}
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
          Local vs Foreign Ownership
        </Typography>
        <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#22c55e", minWidth: 52 }}>
            {localPct.toFixed(1)}%
          </Typography>
          <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: "rgba(245,158,11,0.2)", overflow: "hidden" }}>
            <Box sx={{ width: `${localBarWidth}%`, height: "100%", borderRadius: 4, bgcolor: "#22c55e", transition: "width 0.6s ease" }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#f59e0b", minWidth: 52, textAlign: "right" }}>
            {foreignPct.toFixed(1)}%
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.75 }}>
          <Typography variant="caption" color="text.secondary">Local</Typography>
          <Typography variant="caption" color="text.secondary">Foreign</Typography>
        </Box>
      </Paper>

      <TradingViewChart stockCode={code} />

      <CompanyProfilePanel stockCode={code} />

      {graphNodes.length > 0 && (
        <ConnectionGraph
          nodes={graphNodes}
          links={graphLinks}
          title="Ownership Network"
          centerNodeId={code}
        />
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <OwnershipPieChart data={ownershipData} title="Ownership Breakdown" />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <OwnershipPieChart data={typeChartData} title="By Investor Type" />
        </Grid>
      </Grid>

      <BrokerSummaryPanel stockCode={code} />

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Shareholder Registry
        </Typography>
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell>Investor</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Origin</TableCell>
                <TableCell align="right">Total Value</TableCell>
                <TableCell align="right">Ownership</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r, i) => (
                <TableRow
                  key={`${r.INVESTOR_NAME}-${i}`}
                  hover
                  sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
                  onClick={() => router.push(`/investor/${encodeURIComponent(r.INVESTOR_NAME)}`)}
                >
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>{i + 1}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.INVESTOR_NAME}</Typography>
                  </TableCell>
                  <TableCell><InvestorTypeBadge type={r.INVESTOR_TYPE} /></TableCell>
                  <TableCell><LocalForeignBadge type={r.LOCAL_FOREIGN} /></TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{formatShares(r.TOTAL_HOLDING_SHARES)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>{r.PERCENTAGE.toFixed(2)}%</Typography>
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
