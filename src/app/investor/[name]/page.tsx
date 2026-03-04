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
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PublicIcon from "@mui/icons-material/Public";

export default function InvestorDetailPage() {
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
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
        .eq("INVESTOR_NAME", name)
        .order("PERCENTAGE", { ascending: false });

      if (!error && data) {
        const typed = data as KSEIRecord[];
        setRecords(typed);
        await buildGraph(typed);
      }
      setLoading(false);
    }

    async function buildGraph(primary: KSEIRecord[]) {
      const stockCodes = primary.map((r) => r.SHARE_CODE);

      const { data: cross } = await supabase
        .from(TABLE_NAME)
        .select("INVESTOR_NAME, SHARE_CODE, PERCENTAGE")
        .in("SHARE_CODE", stockCodes)
        .neq("INVESTOR_NAME", name)
        .order("PERCENTAGE", { ascending: false });

      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];
      const nodeIds = new Set<string>();

      nodes.push({
        id: name,
        label: name,
        type: "investor",
        size: 1,
        isCenter: true,
      });
      nodeIds.add(name);

      primary.forEach((r) => {
        if (!nodeIds.has(r.SHARE_CODE)) {
          nodes.push({
            id: r.SHARE_CODE,
            label: r.SHARE_CODE,
            type: "stock",
            size: Math.max(0.3, r.PERCENTAGE / 40),
          });
          nodeIds.add(r.SHARE_CODE);
        }
        links.push({
          source: name,
          target: r.SHARE_CODE,
          value: r.PERCENTAGE,
        });
      });

      if (cross) {
        const crossByStock: Record<string, typeof cross> = {};
        (cross as any[]).forEach((r) => {
          if (!crossByStock[r.SHARE_CODE])
            crossByStock[r.SHARE_CODE] = [];
          crossByStock[r.SHARE_CODE].push(r);
        });

        Object.entries(crossByStock).forEach(([stock, recs]) => {
          recs.slice(0, 3).forEach((r: any) => {
            if (!nodeIds.has(r.INVESTOR_NAME)) {
              nodes.push({
                id: r.INVESTOR_NAME,
                label: r.INVESTOR_NAME,
                type: "investor",
                size: Math.max(0.15, r.PERCENTAGE / 80),
              });
              nodeIds.add(r.INVESTOR_NAME);
            }
            const linkKey = `${r.INVESTOR_NAME}->${stock}`;
            const exists = links.some(
              (l) => `${l.source}->${l.target}` === linkKey
            );
            if (!exists) {
              links.push({
                source: r.INVESTOR_NAME,
                target: stock,
                value: r.PERCENTAGE,
              });
            }
          });
        });
      }

      setGraphNodes(nodes);
      setGraphLinks(links);
    }

    fetchData();
  }, [name]);

  if (loading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={40} sx={{ borderRadius: 2 }} />
        <Skeleton width={200} height={28} />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid size={{ xs: 6, lg: 3 }} key={i}>
              <StatsCardSkeleton />
            </Grid>
          ))}
        </Grid>
        <ConnectionGraphSkeleton />
        <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3 }} />
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
            No data found for investor: {name}
          </Typography>
        </Paper>
      </Stack>
    );
  }

  const investorType = records[0].INVESTOR_TYPE;
  const localForeign = records[0].LOCAL_FOREIGN;
  const stockCount = new Set(records.map((r) => r.SHARE_CODE)).size;
  const totalShares = records.reduce(
    (sum, r) => sum + parseInt(r.TOTAL_HOLDING_SHARES || "0", 10),
    0
  );
  const maxPct = Math.max(...records.map((r) => r.PERCENTAGE));

  const portfolioData = records.map((r) => ({
    name: r.SHARE_CODE,
    value: r.PERCENTAGE,
  }));

  const sorted = [...records].sort((a, b) => {
    const aShares = parseInt(a.TOTAL_HOLDING_SHARES || "0", 10);
    const bShares = parseInt(b.TOTAL_HOLDING_SHARES || "0", 10);
    return bShares - aShares;
  });

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
          {name}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
          <InvestorTypeBadge type={investorType} />
          <LocalForeignBadge type={localForeign} />
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard title="Stocks Held" value={stockCount} icon={<BusinessCenterIcon />} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard title="Total Shares" value={formatShares(totalShares)} icon={<ShowChartIcon />} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard title="Max Ownership" value={`${maxPct}%`} icon={<TrendingUpIcon />} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatsCard
            title="Type"
            value={INVESTOR_TYPE_MAP[investorType] || investorType}
            subtitle={localForeign === "L" ? "Local" : "Foreign"}
            icon={<PublicIcon />}
          />
        </Grid>
      </Grid>

      {graphNodes.length > 0 && (
        <ConnectionGraph
          nodes={graphNodes}
          links={graphLinks}
          title="Connection Network"
          centerNodeId={name}
        />
      )}

      {records.length > 1 && (
        <OwnershipPieChart data={portfolioData} title="Portfolio Distribution" />
      )}

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Holdings
        </Typography>
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Issuer</TableCell>
                <TableCell align="right">Total Value</TableCell>
                <TableCell align="right">Ownership</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r, i) => (
                <TableRow
                  key={`${r.SHARE_CODE}-${i}`}
                  hover
                  sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
                  onClick={() => router.push(`/stock/${r.SHARE_CODE}`)}
                >
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>{i + 1}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, color: "primary.main" }}>{r.SHARE_CODE}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{r.ISSUER_NAME}</Typography>
                  </TableCell>
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
