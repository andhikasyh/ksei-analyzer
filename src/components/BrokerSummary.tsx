"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import { formatValue, formatShares } from "@/lib/types";
import {
  DateRange,
  mapDateRange,
  BROKER_COLORS,
  BrokerFlowPoint,
  BrokerPosition,
  fetchBrokerFlow,
  fetchClosingPrices,
  fetchTopBrokers,
  fetchBrokerRankings,
} from "@/lib/brokerUtils";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import LinearProgress from "@mui/material/LinearProgress";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import TimelineIcon from "@mui/icons-material/Timeline";
import TableChartIcon from "@mui/icons-material/TableChart";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: "1D", value: "1D" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
];

const INVESTOR_TYPES = ["ALL", "FOREIGN", "RETAIL", "NON_RETAIL"];

interface BrokerSummaryProps {
  stockCode: string;
}

export function BrokerSummaryPanel({ stockCode }: BrokerSummaryProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange>("1M");
  const [subTab, setSubTab] = useState(0);

  const [flowAutoMode, setFlowAutoMode] = useState(true);
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([]);
  const [brokerInput, setBrokerInput] = useState("");
  const [flowMetric, setFlowMetric] = useState<"value" | "volume">("value");
  const [flowViewMode, setFlowViewMode] = useState<"cumulative" | "change">(
    "cumulative"
  );
  const [flowData, setFlowData] = useState<BrokerFlowPoint[]>([]);
  const [priceData, setPriceData] = useState<
    { date: string; label: string; close: number }[]
  >([]);
  const [loadingFlow, setLoadingFlow] = useState(true);

  const [investorType, setInvestorType] = useState("ALL");
  const [rankings, setRankings] = useState<BrokerPosition[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(true);
  const [rankingMetric, setRankingMetric] = useState<"value" | "volume">("value");

  const mapping = useMemo(
    () => mapDateRange(dateRange),
    [dateRange]
  );

  const addBroker = useCallback(
    (code: string) => {
      const c = code.trim().toUpperCase();
      if (c && !selectedBrokers.includes(c) && selectedBrokers.length < 10) {
        setSelectedBrokers((prev) => [...prev, c]);
        setFlowAutoMode(false);
      }
      setBrokerInput("");
    },
    [selectedBrokers]
  );

  const removeBroker = useCallback((code: string) => {
    setSelectedBrokers((prev) => prev.filter((b) => b !== code));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingFlow(true);

      let brokers = selectedBrokers;
      if (flowAutoMode || brokers.length === 0) {
        const top = await fetchTopBrokers(stockCode, mapping, 5);
        if (cancelled) return;
        brokers = top;
        setSelectedBrokers(top);
        setFlowAutoMode(true);
      }

      if (brokers.length === 0) {
        setFlowData([]);
        setPriceData([]);
        setLoadingFlow(false);
        return;
      }

      const chartType =
        flowMetric === "value" ? "TYPE_CHART_VALUE" : "TYPE_CHART_VOLUME";
      const [flow, prices] = await Promise.all([
        fetchBrokerFlow(stockCode, mapping, brokers, chartType as any),
        dateRange !== "1D"
          ? fetchClosingPrices(
              stockCode,
              mapping.dateFrom,
              mapping.dateTo
            )
          : Promise.resolve([]),
      ]);

      if (cancelled) return;

      if (prices.length > 0 && flow.length > 0) {
        const priceMap: Record<string, number> = {};
        prices.forEach((p) => {
          priceMap[p.label] = p.close;
        });
        flow.forEach((point) => {
          if (priceMap[point.label] !== undefined) {
            point.close = priceMap[point.label];
          }
        });
      }

      setFlowData(flow);
      setPriceData(prices);
      setLoadingFlow(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [stockCode, mapping, flowAutoMode, flowMetric, selectedBrokers.length > 0 ? selectedBrokers.join(",") : ""]);

  useEffect(() => {
    if (subTab < 1) return;
    let cancelled = false;
    async function load() {
      setLoadingRankings(true);
      const data = await fetchBrokerRankings(
        stockCode,
        mapping,
        investorType
      );
      if (!cancelled) {
        setRankings(data);
        setLoadingRankings(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [stockCode, mapping, investorType, subTab]);

  const sortedRankings = useMemo(
    () => [...rankings].sort((a, b) => a.rank - b.rank),
    [rankings]
  );

  const textColor = isDark ? "#6b7fa3" : "#546280";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tooltipStyle = {
    background: isDark ? "#111b30" : "#fff",
    border: `1px solid ${isDark ? "rgba(107,127,163,0.15)" : "#e4e4e7"}`,
    borderRadius: "8px",
    fontSize: "12px",
    color: isDark ? "#e8edf5" : "#0c1222",
  };

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, mr: 0.5 }}
        >
          Range
        </Typography>
        {DATE_RANGES.map((r) => (
          <Chip
            key={r.value}
            label={r.label}
            size="small"
            onClick={() => setDateRange(r.value)}
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
              fontSize: "0.7rem",
              height: 26,
              cursor: "pointer",
              bgcolor:
                dateRange === r.value
                  ? isDark
                    ? "rgba(212,168,67,0.15)"
                    : "rgba(161,124,47,0.1)"
                  : "transparent",
              color:
                dateRange === r.value ? "primary.main" : "text.secondary",
              border: "1px solid",
              borderColor:
                dateRange === r.value ? "primary.main" : "transparent",
              "&:hover": {
                bgcolor: isDark
                  ? "rgba(212,168,67,0.1)"
                  : "rgba(161,124,47,0.06)",
              },
            }}
          />
        ))}
      </Stack>

      <Paper sx={{ borderRadius: 2.5, overflow: "hidden" }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => setSubTab(v)}
          sx={{
            minHeight: 36,
            px: 1,
            "& .MuiTab-root": {
              minHeight: 36,
              py: 0,
              px: 2,
              fontSize: "0.75rem",
              textTransform: "none",
              fontWeight: 600,
            },
            "& .MuiTabs-indicator": { height: 2, borderRadius: 1 },
          }}
        >
          <Tab
            icon={<TimelineIcon sx={{ fontSize: 14 }} />}
            iconPosition="start"
            label="Broker Flow"
          />
          <Tab
            icon={<TableChartIcon sx={{ fontSize: 14 }} />}
            iconPosition="start"
            label="Summary"
          />
          <Tab
            icon={<AccountTreeIcon sx={{ fontSize: 14 }} />}
            iconPosition="start"
            label="Distribution"
          />
        </Tabs>
      </Paper>

      {subTab === 0 && (
        <BrokerFlowSection
          isDark={isDark}
          textColor={textColor}
          gridColor={gridColor}
          tooltipStyle={tooltipStyle}
          flowMetric={flowMetric}
          setFlowMetric={setFlowMetric}
          flowViewMode={flowViewMode}
          setFlowViewMode={setFlowViewMode}
          flowAutoMode={flowAutoMode}
          setFlowAutoMode={setFlowAutoMode}
          selectedBrokers={selectedBrokers}
          setSelectedBrokers={setSelectedBrokers}
          brokerInput={brokerInput}
          setBrokerInput={setBrokerInput}
          addBroker={addBroker}
          removeBroker={removeBroker}
          flowData={flowData}
          loadingFlow={loadingFlow}
          dateRange={dateRange}
        />
      )}

      {subTab === 1 && (
        <BrokerSummarySection
          isDark={isDark}
          investorType={investorType}
          setInvestorType={setInvestorType}
          rankings={sortedRankings}
          loadingRankings={loadingRankings}
          rankingMetric={rankingMetric}
          setRankingMetric={setRankingMetric}
        />
      )}

      {subTab === 2 && (
        <BrokerDistributionSection
          isDark={isDark}
          rankings={sortedRankings}
          loadingRankings={loadingRankings}
          rankingMetric={rankingMetric}
          setRankingMetric={setRankingMetric}
        />
      )}
    </Stack>
  );
}

function BrokerFlowSection({
  isDark,
  textColor,
  gridColor,
  tooltipStyle,
  flowMetric,
  setFlowMetric,
  flowViewMode,
  setFlowViewMode,
  flowAutoMode,
  setFlowAutoMode,
  selectedBrokers,
  setSelectedBrokers,
  brokerInput,
  setBrokerInput,
  addBroker,
  removeBroker,
  flowData,
  loadingFlow,
  dateRange,
}: {
  isDark: boolean;
  textColor: string;
  gridColor: string;
  tooltipStyle: Record<string, string>;
  flowMetric: "value" | "volume";
  setFlowMetric: (v: "value" | "volume") => void;
  flowViewMode: "cumulative" | "change";
  setFlowViewMode: (v: "cumulative" | "change") => void;
  flowAutoMode: boolean;
  setFlowAutoMode: (v: boolean) => void;
  selectedBrokers: string[];
  setSelectedBrokers: (v: string[]) => void;
  brokerInput: string;
  setBrokerInput: (v: string) => void;
  addBroker: (code: string) => void;
  removeBroker: (code: string) => void;
  flowData: BrokerFlowPoint[];
  loadingFlow: boolean;
  dateRange: DateRange;
}) {
  const chartData = useMemo(() => {
    if (flowViewMode === "cumulative") return flowData;
    return flowData.map((point, idx) => {
      if (idx === 0) return point;
      const prev = flowData[idx - 1];
      const next: BrokerFlowPoint = { ...point };
      selectedBrokers.forEach((code) => {
        const currVal = Number(point[code] || 0);
        const prevVal = Number(prev[code] || 0);
        next[code] = currVal - prevVal;
      });
      return next;
    });
  }, [flowData, flowViewMode, selectedBrokers]);

  const hasClose = chartData.some((d: any) => d.close !== undefined);
  const formatter = flowMetric === "value" ? formatValue : formatShares;

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Chip
          label="Value"
          size="small"
          onClick={() => setFlowMetric("value")}
          sx={{
            fontWeight: 600,
            fontSize: "0.65rem",
            height: 24,
            cursor: "pointer",
            bgcolor:
              flowMetric === "value"
                ? isDark
                  ? "rgba(59,130,246,0.15)"
                  : "rgba(59,130,246,0.1)"
                : "transparent",
            color:
              flowMetric === "value" ? "#3b82f6" : "text.secondary",
            border: "1px solid",
            borderColor:
              flowMetric === "value" ? "#3b82f6" : "transparent",
          }}
        />
        <Chip
          label="Volume"
          size="small"
          onClick={() => setFlowMetric("volume")}
          sx={{
            fontWeight: 600,
            fontSize: "0.65rem",
            height: 24,
            cursor: "pointer",
            bgcolor:
              flowMetric === "volume"
                ? isDark
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(34,197,94,0.1)"
                : "transparent",
            color:
              flowMetric === "volume" ? "#22c55e" : "text.secondary",
            border: "1px solid",
            borderColor:
              flowMetric === "volume" ? "#22c55e" : "transparent",
          }}
        />
        <Box sx={{ width: "1px", height: 20, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
        <Chip
          label="Cumulative"
          size="small"
          onClick={() => setFlowViewMode("cumulative")}
          sx={{
            fontWeight: 600,
            fontSize: "0.65rem",
            height: 24,
            cursor: "pointer",
            bgcolor:
              flowViewMode === "cumulative"
                ? isDark
                  ? "rgba(14,165,233,0.14)"
                  : "rgba(14,165,233,0.09)"
                : "transparent",
            color: flowViewMode === "cumulative" ? "#0ea5e9" : "text.secondary",
            border: "1px solid",
            borderColor: flowViewMode === "cumulative" ? "#0ea5e9" : "transparent",
          }}
        />
        <Chip
          label="Change"
          size="small"
          onClick={() => setFlowViewMode("change")}
          sx={{
            fontWeight: 600,
            fontSize: "0.65rem",
            height: 24,
            cursor: "pointer",
            bgcolor:
              flowViewMode === "change"
                ? isDark
                  ? "rgba(249,115,22,0.14)"
                  : "rgba(249,115,22,0.09)"
                : "transparent",
            color: flowViewMode === "change" ? "#f97316" : "text.secondary",
            border: "1px solid",
            borderColor: flowViewMode === "change" ? "#f97316" : "transparent",
          }}
        />
        <Box sx={{ width: "1px", height: 20, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
        <Chip
          label="Auto"
          size="small"
          onClick={() => {
            setFlowAutoMode(true);
            setSelectedBrokers([]);
          }}
          sx={{
            fontWeight: 600,
            fontSize: "0.65rem",
            height: 24,
            cursor: "pointer",
            bgcolor: flowAutoMode
              ? isDark
                ? "rgba(212,168,67,0.15)"
                : "rgba(161,124,47,0.1)"
              : "transparent",
            color: flowAutoMode ? "primary.main" : "text.secondary",
            border: "1px solid",
            borderColor: flowAutoMode ? "primary.main" : "transparent",
          }}
        />
        <TextField
          size="small"
          placeholder="Add broker..."
          value={brokerInput}
          onChange={(e) => setBrokerInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addBroker(brokerInput);
          }}
          sx={{
            width: 130,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              height: 28,
              fontSize: "0.75rem",
            },
            "& input": {
              fontFamily: '"JetBrains Mono", monospace',
              textTransform: "uppercase",
              py: 0,
              px: 1,
            },
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => addBroker(brokerInput)}
                    sx={{ p: 0.25 }}
                  >
                    <AddIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Stack>

      {selectedBrokers.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {selectedBrokers.map((code, i) => (
            <Chip
              key={code}
              label={code}
              size="small"
              onDelete={() => removeBroker(code)}
              deleteIcon={<CloseIcon sx={{ fontSize: 12 }} />}
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                fontSize: "0.65rem",
                height: 22,
                bgcolor: `${BROKER_COLORS[i % BROKER_COLORS.length]}20`,
                color: BROKER_COLORS[i % BROKER_COLORS.length],
                "& .MuiChip-deleteIcon": {
                  color: BROKER_COLORS[i % BROKER_COLORS.length],
                },
              }}
            />
          ))}
        </Stack>
      )}

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        {loadingFlow ? (
          <Skeleton
            variant="rounded"
            height={320}
            sx={{ borderRadius: 2 }}
          />
        ) : flowData.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="text.secondary">
              No broker flow data available
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="label"
                tick={{ fill: textColor, fontSize: 9 }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: textColor, fontSize: 9 }}
                tickFormatter={(v) => formatter(v)}
                width={60}
              />
              {hasClose && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: textColor, fontSize: 9 }}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                  }
                  width={50}
                />
              )}
              <RechartsTooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name: string) => [
                  name === "close"
                    ? v.toLocaleString()
                    : formatter(v),
                  name === "close" ? "Close Price" : name,
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: 8 }}
              />
              {selectedBrokers.map((code, i) => (
                <Line
                  key={code}
                  yAxisId="left"
                  type="monotone"
                  dataKey={code}
                  stroke={BROKER_COLORS[i % BROKER_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  name={code}
                />
              ))}
              {hasClose && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="close"
                  stroke={isDark ? "#94a3b8" : "#64748b"}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  name="Close Price"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Paper>
    </Stack>
  );
}

function BrokerSummarySection({
  isDark,
  investorType,
  setInvestorType,
  rankings,
  loadingRankings,
  rankingMetric,
  setRankingMetric,
}: {
  isDark: boolean;
  investorType: string;
  setInvestorType: (v: string) => void;
  rankings: BrokerPosition[];
  loadingRankings: boolean;
  rankingMetric: "value" | "volume";
  setRankingMetric: (v: "value" | "volume") => void;
}) {
  const formatter = rankingMetric === "value" ? formatValue : formatShares;
  const getMetricVal = (r: BrokerPosition) =>
    rankingMetric === "value" ? r.total_value : r.total_volume;

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        {INVESTOR_TYPES.map((t) => (
          <Chip
            key={t}
            label={t === "NON_RETAIL" ? "Non-Retail" : t.charAt(0) + t.slice(1).toLowerCase()}
            size="small"
            onClick={() => setInvestorType(t)}
            sx={{
              fontWeight: 600,
              fontSize: "0.65rem",
              height: 24,
              cursor: "pointer",
              bgcolor:
                investorType === t
                  ? isDark
                    ? "rgba(212,168,67,0.15)"
                    : "rgba(161,124,47,0.1)"
                  : "transparent",
              color:
                investorType === t ? "primary.main" : "text.secondary",
              border: "1px solid",
              borderColor:
                investorType === t ? "primary.main" : "transparent",
            }}
          />
        ))}
        <Box sx={{ width: "1px", height: 20, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
        <Chip
          label="Value"
          size="small"
          onClick={() => setRankingMetric("value")}
          sx={{
            fontWeight: 600,
            fontSize: "0.65rem",
            height: 24,
            cursor: "pointer",
            bgcolor:
              rankingMetric === "value"
                ? isDark
                  ? "rgba(59,130,246,0.12)"
                  : "rgba(59,130,246,0.08)"
                : "transparent",
            color: rankingMetric === "value" ? "#3b82f6" : "text.secondary",
            border: "1px solid",
            borderColor: rankingMetric === "value" ? "#3b82f6" : "transparent",
          }}
        />
        <Chip
          label="Volume"
          size="small"
          onClick={() => setRankingMetric("volume")}
          sx={{
            fontWeight: 600,
            fontSize: "0.65rem",
            height: 24,
            cursor: "pointer",
            bgcolor:
              rankingMetric === "volume"
                ? isDark
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(34,197,94,0.08)"
                : "transparent",
            color: rankingMetric === "volume" ? "#22c55e" : "text.secondary",
            border: "1px solid",
            borderColor: rankingMetric === "volume" ? "#22c55e" : "transparent",
          }}
        />
      </Stack>

      <Paper sx={{ borderRadius: 3 }}>
        {loadingRankings ? (
          <Box sx={{ p: 2.5 }}>
            <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
          </Box>
        ) : rankings.length === 0 ? (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Typography color="text.secondary">
              No broker ranking data available
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 1.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "primary.main",
                fontSize: "0.7rem",
                display: "block",
                mb: 1,
                pl: 1,
              }}
            >
              TOP BROKERS ({rankings.length})
            </Typography>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: "0.65rem", py: 0.5, width: 36 }}>#</TableCell>
                    <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }}>Broker</TableCell>
                    <TableCell align="right" sx={{ fontSize: "0.65rem", py: 0.5 }}>
                      {rankingMetric === "value" ? "Total Value" : "Total Volume"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.65rem", py: 0.5, minWidth: 80 }}>Share %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rankings.map((r, i) => (
                    <TableRow key={`rank-${r.broker_code}-${i}`}>
                      <TableCell sx={{ py: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 600,
                            color: "text.secondary",
                            fontSize: "0.6rem",
                          }}
                        >
                          {r.rank}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 700,
                            color: BROKER_COLORS[i % BROKER_COLORS.length],
                          }}
                        >
                          {r.broker_code}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 600,
                          }}
                        >
                          {formatter(getMetricVal(r))}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Box sx={{ flex: 1, minWidth: 30 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(r.value_share, 100)}
                              sx={{
                                height: 4,
                                borderRadius: 2,
                                bgcolor: isDark
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.06)",
                                "& .MuiLinearProgress-bar": {
                                  borderRadius: 2,
                                  bgcolor: BROKER_COLORS[i % BROKER_COLORS.length],
                                },
                              }}
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: "0.55rem",
                              color: "text.secondary",
                              minWidth: 28,
                              textAlign: "right",
                            }}
                          >
                            {r.value_share.toFixed(1)}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}

function BrokerDistributionSection({
  isDark,
  rankings,
  loadingRankings,
  rankingMetric,
  setRankingMetric,
}: {
  isDark: boolean;
  rankings: BrokerPosition[];
  loadingRankings: boolean;
  rankingMetric: "value" | "volume";
  setRankingMetric: (v: "value" | "volume") => void;
}) {
  const formatter = rankingMetric === "value" ? formatValue : formatShares;
  const getVal = (r: BrokerPosition) =>
    rankingMetric === "value" ? r.total_value : r.total_volume;

  const top = rankings.slice(0, 15);
  const totalVal = top.reduce((s, r) => s + getVal(r), 0);
  const maxVal = top.length > 0 ? getVal(top[0]) : 1;

  const hhi = top.reduce((s, r) => s + r.value_share ** 2, 0);
  const hhiLabel = hhi >= 2500 ? "Highly Concentrated" : hhi >= 1500 ? "Moderately Concentrated" : "Competitive";
  const hhiColor = hhi >= 2500 ? "#f87171" : hhi >= 1500 ? "#fbbf24" : "#34d399";

  const svgW = 680;
  const barH = 22;
  const gap = 6;
  const labelW = 50;
  const valueW = 80;
  const chartLeft = labelW + 8;
  const chartRight = svgW - valueW - 8;
  const barAreaW = chartRight - chartLeft;
  const svgH = Math.max(180, top.length * (barH + gap) + 40);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip
          label="Value"
          size="small"
          onClick={() => setRankingMetric("value")}
          sx={{
            fontWeight: 600, fontSize: "0.65rem", height: 24, cursor: "pointer",
            bgcolor: rankingMetric === "value" ? isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)" : "transparent",
            color: rankingMetric === "value" ? "#3b82f6" : "text.secondary",
            border: "1px solid", borderColor: rankingMetric === "value" ? "#3b82f6" : "transparent",
          }}
        />
        <Chip
          label="Volume"
          size="small"
          onClick={() => setRankingMetric("volume")}
          sx={{
            fontWeight: 600, fontSize: "0.65rem", height: 24, cursor: "pointer",
            bgcolor: rankingMetric === "volume" ? isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)" : "transparent",
            color: rankingMetric === "volume" ? "#22c55e" : "text.secondary",
            border: "1px solid", borderColor: rankingMetric === "volume" ? "#22c55e" : "transparent",
          }}
        />
        {top.length > 0 && (
          <>
            <Box sx={{ width: "1px", height: 20, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
            <Chip
              label={`HHI ${hhi.toFixed(0)} - ${hhiLabel}`}
              size="small"
              sx={{
                fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                fontSize: "0.62rem", height: 24, bgcolor: `${hhiColor}15`, color: hhiColor,
              }}
            />
          </>
        )}
      </Stack>

      <Paper sx={{ p: 2.5, borderRadius: 3, overflow: "hidden" }}>
        {loadingRankings ? (
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
        ) : top.length === 0 ? (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Typography color="text.secondary">No distribution data available</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <svg
              width={svgW}
              height={svgH}
              viewBox={`0 0 ${svgW} ${svgH}`}
              style={{ width: "100%", height: "auto" }}
            >
              {top.map((r, i) => {
                const y = 12 + i * (barH + gap);
                const w = maxVal > 0 ? (getVal(r) / maxVal) * barAreaW : 0;
                const color = BROKER_COLORS[i % BROKER_COLORS.length];
                return (
                  <g key={`dist-${r.broker_code}-${i}`}>
                    <text
                      x={labelW}
                      y={y + barH / 2}
                      textAnchor="end"
                      dominantBaseline="central"
                      fill={color}
                      fontSize={11}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight={700}
                    >
                      {r.broker_code}
                    </text>
                    <rect
                      x={chartLeft}
                      y={y}
                      width={Math.max(w, 2)}
                      height={barH}
                      rx={3}
                      fill={color}
                      opacity={0.7}
                    />
                    <text
                      x={chartLeft + Math.max(w, 2) + 6}
                      y={y + barH / 2}
                      textAnchor="start"
                      dominantBaseline="central"
                      fill={isDark ? "#94a3b8" : "#64748b"}
                      fontSize={9}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {formatter(getVal(r))} ({r.value_share.toFixed(1)}%)
                    </text>
                  </g>
                );
              })}
            </svg>
            <Typography
              variant="caption"
              sx={{ mt: 1, display: "block", color: "text.secondary" }}
            >
              Top {top.length} brokers by total {rankingMetric}. HHI mengukur konsentrasi pasar -- semakin tinggi, semakin sedikit broker yang mendominasi.
            </Typography>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}

export function BrokerSummarySkeleton() {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={42}
            height={26}
            sx={{ borderRadius: 2 }}
          />
        ))}
      </Stack>
      <Skeleton variant="rounded" height={36} sx={{ borderRadius: 2 }} />
      <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
    </Stack>
  );
}
