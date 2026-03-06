"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import Grid from "@mui/material/Grid";
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
import StorefrontIcon from "@mui/icons-material/Storefront";

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

  const buyers = useMemo(
    () =>
      rankings
        .filter((r) => r.b_val > 0)
        .sort((a, b) => b.b_val - a.b_val),
    [rankings]
  );
  const sellers = useMemo(
    () =>
      rankings
        .filter((r) => r.s_val > 0)
        .sort((a, b) => b.s_val - a.s_val),
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
          buyers={buyers}
          sellers={sellers}
          loadingRankings={loadingRankings}
          flowMetric={flowMetric}
          setFlowMetric={setFlowMetric}
        />
      )}

      {subTab === 2 && (
        <BrokerDistributionSection
          isDark={isDark}
          buyers={buyers}
          sellers={sellers}
          loadingRankings={loadingRankings}
          flowMetric={flowMetric}
          setFlowMetric={setFlowMetric}
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
  buyers,
  sellers,
  loadingRankings,
  flowMetric,
  setFlowMetric,
}: {
  isDark: boolean;
  investorType: string;
  setInvestorType: (v: string) => void;
  buyers: BrokerPosition[];
  sellers: BrokerPosition[];
  loadingRankings: boolean;
  flowMetric: "value" | "volume";
  setFlowMetric: (v: "value" | "volume") => void;
}) {
  const maxRows = Math.max(buyers.length, sellers.length);

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
          onClick={() => setFlowMetric("value")}
          sx={{
            fontWeight: 600,
            fontSize: "0.65rem",
            height: 24,
            cursor: "pointer",
            bgcolor:
              flowMetric === "value"
                ? isDark
                  ? "rgba(59,130,246,0.12)"
                  : "rgba(59,130,246,0.08)"
                : "transparent",
            color: flowMetric === "value" ? "#3b82f6" : "text.secondary",
            border: "1px solid",
            borderColor: flowMetric === "value" ? "#3b82f6" : "transparent",
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
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(34,197,94,0.08)"
                : "transparent",
            color: flowMetric === "volume" ? "#22c55e" : "text.secondary",
            border: "1px solid",
            borderColor: flowMetric === "volume" ? "#22c55e" : "transparent",
          }}
        />
      </Stack>

      <Paper sx={{ borderRadius: 3 }}>
        {loadingRankings ? (
          <Box sx={{ p: 2.5 }}>
            <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
          </Box>
        ) : buyers.length === 0 && sellers.length === 0 ? (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Typography color="text.secondary">
              No broker summary data available
            </Typography>
          </Box>
        ) : (
          <Grid container>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "#22c55e",
                    fontSize: "0.7rem",
                    display: "block",
                    mb: 1,
                    pl: 1,
                  }}
                >
                  BUYER ({buyers.length})
                </Typography>
                <TableContainer sx={{ maxHeight: 440 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }}>
                          Broker
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontSize: "0.65rem", py: 0.5 }}
                        >
                          {flowMetric === "value" ? "B.Val" : "B.Lot"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontSize: "0.65rem",
                            py: 0.5,
                            display: { xs: "none", sm: "table-cell" },
                          }}
                        >
                          B.Avg
                        </TableCell>
                        <TableCell
                          sx={{ fontSize: "0.65rem", py: 0.5, minWidth: 60 }}
                        >
                          %
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {buyers.map((b, bi) => (
                        <TableRow key={`buy-${b.broker_code}-${bi}`}>
                          <TableCell sx={{ py: 0.5 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                color: "#22c55e",
                              }}
                            >
                              {b.broker_code}
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
                              {flowMetric === "value"
                                ? formatValue(b.b_val)
                                : formatShares(b.b_lot)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              py: 0.5,
                              display: { xs: "none", sm: "table-cell" },
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                color: "text.secondary",
                                fontSize: "0.6rem",
                              }}
                            >
                              {b.b_avg > 0
                                ? formatValue(b.b_avg)
                                : "-"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 0.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <Box sx={{ flex: 1, minWidth: 30 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(b.value_share, 100)}
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: isDark
                                      ? "rgba(255,255,255,0.06)"
                                      : "rgba(0,0,0,0.06)",
                                    "& .MuiLinearProgress-bar": {
                                      borderRadius: 2,
                                      bgcolor: "#22c55e",
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
                                {b.value_share.toFixed(1)}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderLeft: {
                    md: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  },
                  borderTop: {
                    xs: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                    md: "none",
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "#ef4444",
                    fontSize: "0.7rem",
                    display: "block",
                    mb: 1,
                    pl: 1,
                  }}
                >
                  SELLER ({sellers.length})
                </Typography>
                <TableContainer sx={{ maxHeight: 440 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }}>
                          Broker
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontSize: "0.65rem", py: 0.5 }}
                        >
                          {flowMetric === "value" ? "S.Val" : "S.Lot"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontSize: "0.65rem",
                            py: 0.5,
                            display: { xs: "none", sm: "table-cell" },
                          }}
                        >
                          S.Avg
                        </TableCell>
                        <TableCell
                          sx={{ fontSize: "0.65rem", py: 0.5, minWidth: 60 }}
                        >
                          %
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sellers.map((s, si) => (
                        <TableRow key={`sell-${s.broker_code}-${si}`}>
                          <TableCell sx={{ py: 0.5 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                color: "#ef4444",
                              }}
                            >
                              {s.broker_code}
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
                              {flowMetric === "value"
                                ? formatValue(s.s_val)
                                : formatShares(s.s_lot)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              py: 0.5,
                              display: { xs: "none", sm: "table-cell" },
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                color: "text.secondary",
                                fontSize: "0.6rem",
                              }}
                            >
                              {s.s_avg > 0
                                ? formatValue(s.s_avg)
                                : "-"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 0.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <Box sx={{ flex: 1, minWidth: 30 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(s.value_share, 100)}
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: isDark
                                      ? "rgba(255,255,255,0.06)"
                                      : "rgba(0,0,0,0.06)",
                                    "& .MuiLinearProgress-bar": {
                                      borderRadius: 2,
                                      bgcolor: "#ef4444",
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
                                {s.value_share.toFixed(1)}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Stack>
  );
}

function BrokerDistributionSection({
  isDark,
  buyers,
  sellers,
  loadingRankings,
  flowMetric,
  setFlowMetric,
}: {
  isDark: boolean;
  buyers: BrokerPosition[];
  sellers: BrokerPosition[];
  loadingRankings: boolean;
  flowMetric: "value" | "volume";
  setFlowMetric: (v: "value" | "volume") => void;
}) {
  const formatter = flowMetric === "value" ? formatValue : formatShares;
  const getGrossVal = (b: BrokerPosition, side: "buy" | "sell") =>
    side === "buy"
      ? flowMetric === "value"
        ? b.b_val
        : b.b_lot
      : flowMetric === "value"
        ? b.s_val
        : b.s_lot;
  const getNetVal = (b: BrokerPosition) =>
    flowMetric === "value" ? b.net_value : b.net_volume;
  const formatSigned = (v: number) =>
    `${v >= 0 ? "+" : "-"}${formatter(Math.abs(v))}`;

  // Merge duplicate broker rows (can happen when ranking source returns multiple dates).
  const mergedMap = new Map<string, BrokerPosition>();
  [...buyers, ...sellers].forEach((row) => {
    const prev = mergedMap.get(row.broker_code);
    if (!prev) {
      mergedMap.set(row.broker_code, { ...row });
      return;
    }
    const merged: BrokerPosition = {
      ...prev,
      net_value: prev.net_value + row.net_value,
      b_val: prev.b_val + row.b_val,
      s_val: prev.s_val + row.s_val,
      net_volume: prev.net_volume + row.net_volume,
      b_lot: prev.b_lot + row.b_lot,
      s_lot: prev.s_lot + row.s_lot,
      value_share: prev.value_share + row.value_share,
      rank: Math.min(prev.rank, row.rank),
    };
    merged.b_avg = merged.b_lot > 0 ? merged.b_val / merged.b_lot : 0;
    merged.s_avg = merged.s_lot > 0 ? merged.s_val / merged.s_lot : 0;
    mergedMap.set(row.broker_code, merged);
  });

  const mergedRows = Array.from(mergedMap.values());
  const topBuyers = mergedRows
    .filter((r) => getGrossVal(r, "buy") > 0)
    .sort((a, b) => getGrossVal(b, "buy") - getGrossVal(a, "buy"))
    .slice(0, 10);
  const topSellers = mergedRows
    .filter((r) => getGrossVal(r, "sell") > 0)
    .sort((a, b) => getGrossVal(b, "sell") - getGrossVal(a, "sell"))
    .slice(0, 10);

  const totalBuy = topBuyers.reduce((s, b) => s + getGrossVal(b, "buy"), 0);
  const totalSell = topSellers.reduce((s, b) => s + getGrossVal(b, "sell"), 0);

  const svgW = 760;
  const rows = Math.max(topBuyers.length, topSellers.length, 1);
  const svgH = Math.max(300, rows * 58 + 32);
  const barW = 10;
  const labelW = 170;
  const gapX = svgW - 2 * labelW - 2 * barW;
  const leftBarX = labelW;
  const rightBarX = svgW - labelW - barW;
  const chartTop = 20;
  const chartBottom = 18;
  const rowGap = 10;

  const tooltipHostRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<{
    key: string;
    x: number;
    y: number;
    title: string;
    lines: string[];
    mode: "flow" | "node";
    brokerCode?: string;
    side?: "left" | "right";
  } | null>(null);

  const buildBars = (
    items: BrokerPosition[],
    side: "buy" | "sell",
    total: number
  ) => {
    if (items.length === 0) return [];
    const usableHeight = svgH - chartTop - chartBottom;
    const slotH = Math.max(
      16,
      (usableHeight - rowGap * (items.length - 1)) / items.length
    );
    const maxVal = Math.max(...items.map((it) => getGrossVal(it, side)), 1);

    return items.map((item, idx) => {
      const val = getGrossVal(item, side);
      const rel = total > 0 ? Math.sqrt(val / maxVal) : 0.5;
      const h = Math.max(14, Math.min(slotH, slotH * (0.45 + rel * 0.55)));
      const ySlot = chartTop + idx * (slotH + rowGap);
      const bar = { item, y: ySlot + (slotH - h) / 2, h, val };
      return bar;
    });
  };

  const leftBars = buildBars(topBuyers, "buy", totalBuy);
  const rightBars = buildBars(topSellers, "sell", totalSell);

  const flowCandidates: {
    li: number;
    ri: number;
    score: number;
    bias: number;
  }[] = [];
  const maxFlows = 48;
  leftBars.forEach((lb, li) => {
    rightBars.forEach((rb, ri) => {
      if (lb.item.broker_code === rb.item.broker_code) return;
      const sellerShare = totalSell > 0 ? lb.val / totalSell : 0;
      const buyerShare = totalBuy > 0 ? rb.val / totalBuy : 0;

      // Mix gross activity and running net signal to estimate who is distributing
      // and who is absorbing (accumulating).
      const sellerNet = getNetVal(lb.item);
      const buyerNet = getNetVal(rb.item);
      const sellerDistrib = Math.min(
        Math.abs(Math.min(sellerNet, 0)) / Math.max(lb.val, 1),
        1
      );
      const buyerAbsorb = Math.min(
        Math.max(buyerNet, 0) / Math.max(rb.val, 1),
        1
      );
      const bias = 0.25 + 0.75 * ((sellerDistrib + buyerAbsorb) / 2);
      const score = sellerShare * buyerShare * bias;
      if (score <= 0) return;

      flowCandidates.push({ li, ri, score, bias });
    });
  });

  flowCandidates.sort((a, b) => b.score - a.score);
  const selectedFlowMap = new Map<string, (typeof flowCandidates)[number]>();
  const leftBest = new Map<number, (typeof flowCandidates)[number]>();
  const rightBest = new Map<number, (typeof flowCandidates)[number]>();
  flowCandidates.forEach((c) => {
    if (!leftBest.has(c.li)) leftBest.set(c.li, c);
    if (!rightBest.has(c.ri)) rightBest.set(c.ri, c);
  });
  leftBest.forEach((c) => {
    selectedFlowMap.set(`flow-${c.li}-${c.ri}`, c);
  });
  rightBest.forEach((c) => {
    selectedFlowMap.set(`flow-${c.li}-${c.ri}`, c);
  });
  flowCandidates.forEach((c) => {
    if (selectedFlowMap.size >= maxFlows) return;
    selectedFlowMap.set(`flow-${c.li}-${c.ri}`, c);
  });
  const selectedFlows = Array.from(selectedFlowMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFlows);
  const totalFlowScore = selectedFlows.reduce((sum, f) => sum + f.score, 0);

  const flows = selectedFlows.map((f) => {
    const lb = leftBars[f.li];
    const rb = rightBars[f.ri];
    const est =
      totalFlowScore > 0
        ? (f.score / totalFlowScore) * Math.min(totalBuy, totalSell)
        : 0;
    return {
      ...f,
      from: lb.item.broker_code,
      to: rb.item.broker_code,
      est,
    };
  });

  const outByLeft = new Map<number, number>();
  const inByRight = new Map<number, number>();
  flows.forEach((f) => {
    outByLeft.set(f.li, (outByLeft.get(f.li) || 0) + f.est);
    inByRight.set(f.ri, (inByRight.get(f.ri) || 0) + f.est);
  });

  // Allocate vertical segments per node so ribbons stay ratioed and do not
  // collapse into one giant block on dominant brokers.
  const leftCursor = new Map<number, number>();
  const rightCursor = new Map<number, number>();
  leftBars.forEach((b, i) => leftCursor.set(i, b.y));
  rightBars.forEach((b, i) => rightCursor.set(i, b.y));

  const leftGrouped = new Map<number, typeof flows>();
  const rightGrouped = new Map<number, typeof flows>();
  flows.forEach((f) => {
    if (!leftGrouped.has(f.li)) leftGrouped.set(f.li, []);
    if (!rightGrouped.has(f.ri)) rightGrouped.set(f.ri, []);
    leftGrouped.get(f.li)!.push(f);
    rightGrouped.get(f.ri)!.push(f);
  });
  leftGrouped.forEach((arr) => arr.sort((a, b) => a.ri - b.ri));
  rightGrouped.forEach((arr) => arr.sort((a, b) => a.li - b.li));

  const paths: {
    key: string;
    d: string;
    color: string;
    opacity: number;
    from: string;
    to: string;
    est: number;
    bias: number;
  }[] = [];
  const leftSeg = new Map<string, { y1: number; y2: number }>();
  const rightSeg = new Map<string, { y1: number; y2: number }>();

  const allocateNodeSegments = (
    group: typeof flows,
    totalEst: number,
    startY: number,
    totalHeight: number,
    keyBuilder: (f: (typeof flows)[number]) => string,
    target: Map<string, { y1: number; y2: number }>
  ) => {
    if (group.length === 0 || totalEst <= 0 || totalHeight <= 0) return;
    let cursor = startY;
    group.forEach((f, idx) => {
      const isLast = idx === group.length - 1;
      const ratio = totalEst > 0 ? f.est / totalEst : 0;
      const h = isLast ? startY + totalHeight - cursor : ratio * totalHeight;
      const safeH = Math.max(0, h);
      const key = keyBuilder(f);
      target.set(key, { y1: cursor, y2: cursor + safeH });
      cursor += safeH;
    });
  };

  leftBars.forEach((lb, li) => {
    const group = leftGrouped.get(li) || [];
    const outTotal = outByLeft.get(li) || 0;
    allocateNodeSegments(
      group,
      outTotal,
      leftCursor.get(li) || lb.y,
      lb.h,
      (f) => `flow-${f.li}-${f.ri}`,
      leftSeg
    );
  });

  rightBars.forEach((rb, ri) => {
    const group = rightGrouped.get(ri) || [];
    const inTotal = inByRight.get(ri) || 0;
    allocateNodeSegments(
      group,
      inTotal,
      rightCursor.get(ri) || rb.y,
      rb.h,
      (f) => `flow-${f.li}-${f.ri}`,
      rightSeg
    );
  });

  flows.forEach((f) => {
    const lb = leftBars[f.li];
    const rb = rightBars[f.ri];
    const flowKey = `flow-${f.li}-${f.ri}`;
    const ls = leftSeg.get(flowKey);
    const rs = rightSeg.get(flowKey);
    if (!ls || !rs) return;
    const x1 = leftBarX + barW;
    const x2 = rightBarX;
    const y1Top = ls.y1;
    const y1Bot = ls.y2;
    const y2Top = rs.y1;
    const y2Bot = rs.y2;
    const cx1 = x1 + gapX * 0.35;
    const cx2 = x2 - gapX * 0.35;

    paths.push({
      key: flowKey,
      d: `M${x1},${y1Top} C${cx1},${y1Top} ${cx2},${y2Top} ${x2},${y2Top} L${x2},${y2Bot} C${cx2},${y2Bot} ${cx1},${y1Bot} ${x1},${y1Bot} Z`,
      color: BROKER_COLORS[f.li % BROKER_COLORS.length],
      opacity: 0.12 + f.bias * 0.2,
      from: f.from,
      to: f.to,
      est: f.est,
      bias: f.bias,
    });
  });

  const setTooltip = (
    event: any,
    payload: {
      key: string;
      title: string;
      lines: string[];
      mode: "flow" | "node";
      brokerCode?: string;
      side?: "left" | "right";
    }
  ) => {
    const host = tooltipHostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    setHovered({
      key: payload.key,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      title: payload.title,
      lines: payload.lines,
      mode: payload.mode,
      brokerCode: payload.brokerCode,
      side: payload.side,
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
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
                  ? "rgba(59,130,246,0.12)"
                  : "rgba(59,130,246,0.08)"
                : "transparent",
            color: flowMetric === "value" ? "#3b82f6" : "text.secondary",
            border: "1px solid",
            borderColor: flowMetric === "value" ? "#3b82f6" : "transparent",
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
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(34,197,94,0.08)"
                : "transparent",
            color: flowMetric === "volume" ? "#22c55e" : "text.secondary",
            border: "1px solid",
            borderColor: flowMetric === "volume" ? "#22c55e" : "transparent",
          }}
        />
      </Stack>

      <Paper sx={{ p: 2.5, borderRadius: 3, overflow: "hidden" }}>
        {loadingRankings ? (
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
        ) : topBuyers.length === 0 && topSellers.length === 0 ? (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Typography color="text.secondary">
              No distribution data available
            </Typography>
          </Box>
        ) : (
          <Box
            ref={tooltipHostRef}
            sx={{ overflowX: "auto", position: "relative" }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 1,
                px: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "#22c55e", fontSize: "0.7rem" }}
              >
                Buyer
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "#ef4444", fontSize: "0.7rem" }}
              >
                Seller
              </Typography>
            </Box>
            <svg
              width={svgW}
              height={svgH}
              viewBox={`0 0 ${svgW} ${svgH}`}
              style={{ width: "100%", height: "auto" }}
            >
              {paths.map((p, i) => (
                <path
                  key={p.key}
                  d={p.d}
                  fill={p.color}
                  opacity={(() => {
                    if (!hovered) return p.opacity;
                    if (hovered.mode === "flow") {
                      return hovered.key === p.key
                        ? Math.min(0.72, p.opacity + 0.34)
                        : Math.max(0.04, p.opacity * 0.22);
                    }
                    const code = hovered.brokerCode || "";
                    const linked =
                      hovered.side === "left"
                        ? p.from === code
                        : hovered.side === "right"
                          ? p.to === code
                          : p.from === code || p.to === code;
                    return linked
                      ? Math.min(0.78, p.opacity + 0.38)
                      : Math.max(0.04, p.opacity * 0.2);
                  })()}
                  style={{ cursor: "pointer", transition: "opacity 160ms ease" }}
                  onMouseMove={(e) =>
                    setTooltip(e, {
                      key: p.key,
                      title: `${p.from} -> ${p.to}`,
                      lines: [
                        `Estimated flow: ${formatter(p.est)}`,
                        `Signal confidence: ${(p.bias * 100).toFixed(0)}%`,
                      ],
                      mode: "flow",
                    })
                  }
                  onMouseLeave={() => setHovered(null)}
                />
              ))}

              {leftBars.map((b, i) => (
                <g key={`buy-${b.item.broker_code}-${i}`}>
                  <rect
                    x={leftBarX}
                    y={b.y}
                    width={barW}
                    height={b.h}
                    rx={3}
                    fill={BROKER_COLORS[i % BROKER_COLORS.length]}
                    style={{ cursor: "pointer" }}
                    onMouseMove={(e) =>
                      setTooltip(e, {
                        key: `left-node-${i}-${b.item.broker_code}`,
                        title: `Buyer ${b.item.broker_code}`,
                        lines: [
                          `Gross buy: ${formatter(b.val)}`,
                          `Net: ${formatSigned(getNetVal(b.item))}`,
                        ],
                        mode: "node",
                        brokerCode: b.item.broker_code,
                        side: "left",
                      })
                    }
                    onMouseLeave={() => setHovered(null)}
                  />
                  <text
                    x={leftBarX - 6}
                    y={b.y + b.h / 2}
                    textAnchor="end"
                    dominantBaseline="central"
                    fill={BROKER_COLORS[i % BROKER_COLORS.length]}
                    fontSize={11}
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight={700}
                  >
                    {b.item.broker_code}
                  </text>
                  <text
                    x={leftBarX + barW + 8}
                    y={b.y + b.h / 2}
                    textAnchor="start"
                    dominantBaseline="central"
                    fill={isDark ? "#94a3b8" : "#64748b"}
                    fontSize={9}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {formatter(b.val)}
                  </text>
                  <text
                    x={leftBarX + barW + 8}
                    y={b.y + b.h / 2 + 10}
                    textAnchor="start"
                    dominantBaseline="central"
                    fill={getNetVal(b.item) >= 0 ? "#22c55e" : "#ef4444"}
                    fontSize={8}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    net {formatSigned(getNetVal(b.item))}
                  </text>
                </g>
              ))}

              {rightBars.map((b, i) => (
                <g key={`sell-${b.item.broker_code}-${i}`}>
                  <rect
                    x={rightBarX}
                    y={b.y}
                    width={barW}
                    height={b.h}
                    rx={3}
                    fill={BROKER_COLORS[(i + 5) % BROKER_COLORS.length]}
                    style={{ cursor: "pointer" }}
                    onMouseMove={(e) =>
                      setTooltip(e, {
                        key: `right-node-${i}-${b.item.broker_code}`,
                        title: `Seller ${b.item.broker_code}`,
                        lines: [
                          `Gross sell: ${formatter(b.val)}`,
                          `Net: ${formatSigned(getNetVal(b.item))}`,
                        ],
                        mode: "node",
                        brokerCode: b.item.broker_code,
                        side: "right",
                      })
                    }
                    onMouseLeave={() => setHovered(null)}
                  />
                  <text
                    x={rightBarX + barW + 6}
                    y={b.y + b.h / 2}
                    textAnchor="start"
                    dominantBaseline="central"
                    fill={BROKER_COLORS[(i + 5) % BROKER_COLORS.length]}
                    fontSize={11}
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight={700}
                  >
                    {b.item.broker_code}
                  </text>
                  <text
                    x={rightBarX - 8}
                    y={b.y + b.h / 2}
                    textAnchor="end"
                    dominantBaseline="central"
                    fill={isDark ? "#94a3b8" : "#64748b"}
                    fontSize={9}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {formatter(b.val)}
                  </text>
                  <text
                    x={rightBarX - 8}
                    y={b.y + b.h / 2 + 10}
                    textAnchor="end"
                    dominantBaseline="central"
                    fill={getNetVal(b.item) >= 0 ? "#22c55e" : "#ef4444"}
                    fontSize={8}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    net {formatSigned(getNetVal(b.item))}
                  </text>
                </g>
              ))}
            </svg>
            <Typography
              variant="caption"
              sx={{ mt: 1, display: "block", color: "text.secondary" }}
            >
              Flow memakai kombinasi gross buy/sell + sinyal running net untuk
              mengestimasi perpindahan dari broker distribusi ke broker akumulasi.
            </Typography>
            {hovered && (
              <Box
                sx={{
                  position: "absolute",
                  left: Math.min(Math.max(hovered.x + 10, 8), svgW - 260),
                  top: Math.max(hovered.y - 10, 8),
                  transform: "translateY(-100%)",
                  minWidth: 200,
                  maxWidth: 260,
                  px: 1.1,
                  py: 0.8,
                  borderRadius: 1.2,
                  pointerEvents: "none",
                  zIndex: 5,
                  bgcolor: isDark ? "rgba(8,15,32,0.96)" : "rgba(255,255,255,0.96)",
                  border: "1px solid",
                  borderColor: isDark ? "rgba(107,127,163,0.35)" : "#d1d5db",
                  boxShadow: isDark
                    ? "0 10px 30px rgba(2,6,23,0.45)"
                    : "0 8px 24px rgba(15,23,42,0.15)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    fontFamily: "JetBrains Mono, monospace",
                    color: isDark ? "#e2e8f0" : "#0f172a",
                  }}
                >
                  {hovered.title}
                </Typography>
                {hovered.lines.map((line, idx) => (
                  <Typography
                    key={`${hovered.key}-line-${idx}`}
                    sx={{
                      mt: idx === 0 ? 0.4 : 0.2,
                      fontSize: "0.63rem",
                      lineHeight: 1.25,
                      fontFamily: "JetBrains Mono, monospace",
                      color: isDark ? "#94a3b8" : "#475569",
                    }}
                  >
                    {line}
                  </Typography>
                ))}
              </Box>
            )}
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
