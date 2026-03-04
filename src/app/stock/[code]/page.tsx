"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import { KSEIRecord, INVESTOR_TYPE_MAP, formatShares } from "@/lib/types";
import { GlobalSearch } from "@/components/SearchInput";
import { OwnershipPieChart } from "@/components/Charts";
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
import { MarketOverviewPanel } from "@/components/MarketOverview";
import { FinancialTrendsPanel } from "@/components/FinancialTrends";
import { DividendHistoryPanel } from "@/components/DividendHistory";
import { ShareholderHistoryPanel } from "@/components/ShareholderHistory";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function StockDetailPage() {
  const params = useParams();
  const code = params.code as string;
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [records, setRecords] = useState<KSEIRecord[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

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
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={40} sx={{ borderRadius: 2 }} />
        <Skeleton width={200} height={24} />
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2 }} />
        <ConnectionGraphSkeleton />
      </Stack>
    );
  }

  if (records.length === 0) {
    return (
      <Stack spacing={2}>
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

  const metricCell = (label: string, value: string, color?: string) => (
    <Box sx={{ textAlign: "center", px: 1 }}>
      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", lineHeight: 1 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, fontFamily: "monospace", color: color || "text.primary", lineHeight: 1.4 }}
      >
        {value}
      </Typography>
    </Box>
  );

  return (
    <Stack spacing={2}>
      <GlobalSearch compact />

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/")}
          size="small"
          sx={{ minWidth: "auto", px: 1.5 }}
        >
          Back
        </Button>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="baseline">
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {code}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {issuerName}
            </Typography>
          </Stack>
        </Box>
      </Stack>

      <Paper
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 2.5,
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, sm: 2 },
          flexWrap: "wrap",
        }}
      >
        {metricCell("Investors", String(totalInvestors))}
        <Box
          sx={{
            width: "1px",
            height: 28,
            bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            display: { xs: "none", sm: "block" },
          }}
        />
        {metricCell("Local", `${localPct.toFixed(1)}%`, "#22c55e")}
        <Box sx={{ flex: 1, maxWidth: 120, minWidth: 60, display: { xs: "none", md: "block" } }}>
          <Box sx={{ height: 6, borderRadius: 3, bgcolor: "rgba(245,158,11,0.2)", overflow: "hidden" }}>
            <Box sx={{ width: `${localBarWidth}%`, height: "100%", borderRadius: 3, bgcolor: "#22c55e", transition: "width 0.6s ease" }} />
          </Box>
        </Box>
        {metricCell("Foreign", `${foreignPct.toFixed(1)}%`, "#f59e0b")}
        <Box
          sx={{
            width: "1px",
            height: 28,
            bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            display: { xs: "none", sm: "block" },
          }}
        />
        {metricCell("Top Holder", `${topHolder.PERCENTAGE.toFixed(1)}%`)}
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontSize: "0.6rem",
            maxWidth: 120,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: { xs: "none", lg: "block" },
          }}
        >
          {topHolder.INVESTOR_NAME}
        </Typography>
      </Paper>

      <Paper sx={{ borderRadius: 2.5, overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
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
          <Tab label="Market" />
          <Tab label="Fundamentals" />
          <Tab label="Ownership" />
          <Tab label="Brokers" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Stack spacing={2}>
          <TradingViewChart stockCode={code} />
          <MarketOverviewPanel stockCode={code} />
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={2}>
          <CompanyProfilePanel stockCode={code} />
          <FinancialTrendsPanel stockCode={code} />
          <DividendHistoryPanel stockCode={code} />
        </Stack>
      )}

      {tab === 2 && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <OwnershipPieChart data={ownershipData} title="Ownership Breakdown" />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <OwnershipPieChart data={typeChartData} title="By Investor Type" />
            </Grid>
          </Grid>

          {graphNodes.length > 0 && (
            <ConnectionGraph
              nodes={graphNodes}
              links={graphLinks}
              title="Ownership Network"
              centerNodeId={code}
            />
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Shareholder Registry
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2.5, overflow: "hidden", maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 36 }}>#</TableCell>
                    <TableCell>Investor</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Origin</TableCell>
                    <TableCell align="right">Shares</TableCell>
                    <TableCell align="right">%</TableCell>
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
                        <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.INVESTOR_NAME}</Typography>
                      </TableCell>
                      <TableCell><InvestorTypeBadge type={r.INVESTOR_TYPE} /></TableCell>
                      <TableCell><LocalForeignBadge type={r.LOCAL_FOREIGN} /></TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>{formatShares(r.TOTAL_HOLDING_SHARES)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>{r.PERCENTAGE.toFixed(4)}%</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <ShareholderHistoryPanel stockCode={code} />
        </Stack>
      )}

      {tab === 3 && (
        <BrokerSummaryPanel stockCode={code} />
      )}
    </Stack>
  );
}
