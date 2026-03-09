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
  BrokerDistEntry,
  fetchBrokerFlow,
  fetchClosingPrices,
  fetchTopBrokers,
  fetchBrokerRankings,
  fetchBrokerDistribution,
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
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import TimelineIcon from "@mui/icons-material/Timeline";
import TableChartIcon from "@mui/icons-material/TableChart";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: "1D", value: "1D" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
];

const INVESTOR_TYPES = ["ALL", "FOREIGN", "RETAIL", "NON_RETAIL"];

const INVESTOR_TYPE_LABELS: Record<string, string> = {
  ALL: "All",
  FOREIGN: "Foreign",
  RETAIL: "Retail",
  NON_RETAIL: "Non-Retail",
};

const SUB_TABS = [
  { label: "Broker Flow", Icon: TimelineIcon },
  { label: "Rankings", Icon: TableChartIcon },
  { label: "Distribution", Icon: AccountTreeIcon },
];

interface BrokerSummaryProps {
  stockCode: string;
}

export function BrokerSummaryPanel({ stockCode }: BrokerSummaryProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange>("1M");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
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

  const [distData, setDistData] = useState<BrokerDistEntry[]>([]);
  const [loadingDist, setLoadingDist] = useState(true);

  const mapping = useMemo(
    () => mapDateRange(dateRange, customFrom, customTo),
    [dateRange, customFrom, customTo]
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
          ? fetchClosingPrices(stockCode, mapping.dateFrom, mapping.dateTo)
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
      const data = await fetchBrokerRankings(stockCode, mapping, investorType);
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

  useEffect(() => {
    if (subTab !== 2) return;
    let cancelled = false;
    async function load() {
      setLoadingDist(true);
      const data = await fetchBrokerDistribution(stockCode, mapping, investorType);
      if (!cancelled) {
        setDistData(data);
        setLoadingDist(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [stockCode, mapping, investorType, subTab]);

  const sortedRankings = useMemo(
    () => [...rankings].sort((a, b) => a.rank - b.rank),
    [rankings]
  );

  const textColor = isDark ? "#737373" : "#737373";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const tooltipStyle = {
    background: isDark ? "#0d1526" : "#f0eeeb",
    border: `1px solid ${isDark ? "rgba(107,127,163,0.2)" : "#e4e4e7"}`,
    borderRadius: "10px",
    fontSize: "11px",
    color: isDark ? "#e8edf5" : "#0c1222",
    boxShadow: isDark
      ? "0 12px 40px rgba(0,0,0,0.5)"
      : "0 8px 24px rgba(15,23,42,0.12)",
  };

  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const surfaceBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  return (
    <Stack spacing={2}>
      {/* ── Date Range Segmented Control ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 600,
            fontSize: "0.65rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            mr: 0.5,
          }}
        >
          Range
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            borderRadius: 2,
            p: 0.4,
            gap: 0.25,
          }}
        >
          {DATE_RANGES.map((r) => (
            <Box
              key={r.value}
              onClick={() => setDateRange(r.value)}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1.5,
                cursor: "pointer",
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                fontSize: "0.68rem",
                transition: "all 150ms ease",
                userSelect: "none",
                color:
                  dateRange === r.value
                    ? isDark ? "#fff" : "#fff"
                    : "text.secondary",
                bgcolor:
                  dateRange === r.value
                    ? isDark
                      ? "rgba(212,168,67,0.25)"
                      : "rgba(161,124,47,0.2)"
                    : "transparent",
                boxShadow:
                  dateRange === r.value
                    ? isDark
                      ? "0 1px 4px rgba(0,0,0,0.4)"
                      : "0 1px 4px rgba(0,0,0,0.15)"
                    : "none",
                "&:hover": {
                  bgcolor:
                    dateRange === r.value
                      ? isDark
                        ? "rgba(212,168,67,0.28)"
                        : "rgba(161,124,47,0.22)"
                      : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                },
              }}
            >
              {r.label}
            </Box>
          ))}
          <Box
            onClick={() => {
              setDateRange("custom");
              if (!customFrom) {
                const d = new Date();
                d.setMonth(d.getMonth() - 1);
                setCustomFrom(d.toISOString().split("T")[0]);
              }
              if (!customTo) setCustomTo(new Date().toISOString().split("T")[0]);
            }}
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1.5,
              cursor: "pointer",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              fontSize: "0.68rem",
              transition: "all 150ms ease",
              userSelect: "none",
              color: dateRange === "custom" ? (isDark ? "#fff" : "#fff") : "text.secondary",
              bgcolor:
                dateRange === "custom"
                  ? isDark
                    ? "rgba(212,168,67,0.25)"
                    : "rgba(161,124,47,0.2)"
                  : "transparent",
              boxShadow:
                dateRange === "custom"
                  ? isDark
                    ? "0 1px 4px rgba(0,0,0,0.4)"
                    : "0 1px 4px rgba(0,0,0,0.15)"
                  : "none",
              "&:hover": {
                bgcolor:
                  dateRange === "custom"
                    ? isDark
                      ? "rgba(212,168,67,0.28)"
                      : "rgba(161,124,47,0.22)"
                    : isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)",
              },
            }}
          >
            Custom
          </Box>
        </Box>

        {dateRange === "custom" && (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <TextField
              type="date"
              size="small"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              sx={{
                width: 136,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                  height: 28,
                  fontSize: "0.7rem",
                  bgcolor: surfaceBg,
                },
                "& input": {
                  fontFamily: '"JetBrains Mono", monospace',
                  py: 0,
                  px: 1,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: "0.6rem" }}>
              to
            </Typography>
            <TextField
              type="date"
              size="small"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              sx={{
                width: 136,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                  height: 28,
                  fontSize: "0.7rem",
                  bgcolor: surfaceBg,
                },
                "& input": {
                  fontFamily: '"JetBrains Mono", monospace',
                  py: 0,
                  px: 1,
                },
              }}
            />
          </Stack>
        )}
      </Box>

      {/* ── Custom Pill Tabs ── */}
      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          borderRadius: 2.5,
          p: 0.5,
        }}
      >
        {SUB_TABS.map(({ label, Icon }, idx) => (
          <Box
            key={label}
            onClick={() => setSubTab(idx)}
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              px: 1.5,
              py: 0.9,
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 200ms cubic-bezier(0.4,0,0.2,1)",
              userSelect: "none",
              position: "relative",
              bgcolor:
                subTab === idx
                  ? isDark
                    ? "rgba(212,168,67,0.15)"
                    : "rgba(161,124,47,0.1)"
                  : "transparent",
              boxShadow:
                subTab === idx
                  ? isDark
                    ? "0 1px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)"
                    : "0 1px 4px rgba(0,0,0,0.1)"
                  : "none",
              "&:hover": {
                bgcolor:
                  subTab === idx
                    ? isDark
                      ? "rgba(212,168,67,0.18)"
                      : "rgba(161,124,47,0.12)"
                    : isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
              },
            }}
          >
            <Icon
              sx={{
                fontSize: 13,
                color: subTab === idx ? "primary.main" : "text.secondary",
                transition: "color 200ms ease",
              }}
            />
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: subTab === idx ? 700 : 500,
                color: subTab === idx ? "primary.main" : "text.secondary",
                transition: "all 200ms ease",
                letterSpacing: subTab === idx ? "0.01em" : 0,
              }}
            >
              {label}
            </Typography>
            {subTab === idx && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 20,
                  height: 2,
                  borderRadius: "2px 2px 0 0",
                  bgcolor: "primary.main",
                  opacity: 0.7,
                }}
              />
            )}
          </Box>
        ))}
      </Box>

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
          distData={distData}
          loading={loadingDist}
        />
      )}
    </Stack>
  );
}

// ── Shared: Segmented Toggle ──────────────────────────────────────────────────

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  colorMap,
  isDark,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
  colorMap?: Record<string, string>;
  isDark: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
        borderRadius: 1.5,
        p: 0.3,
        gap: 0.2,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        const color = colorMap?.[opt.value];
        return (
          <Box
            key={opt.value}
            onClick={() => onChange(opt.value)}
            sx={{
              px: 1.2,
              py: 0.4,
              borderRadius: 1.2,
              cursor: "pointer",
              userSelect: "none",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: active ? 700 : 500,
              fontSize: "0.65rem",
              transition: "all 140ms ease",
              color: active
                ? color || (isDark ? "#fff" : "#fff")
                : "text.secondary",
              bgcolor: active
                ? color
                  ? `${color}22`
                  : isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)"
                : "transparent",
              border: "1px solid",
              borderColor: active ? (color ? `${color}55` : "transparent") : "transparent",
              "&:hover": {
                bgcolor: active
                  ? color
                    ? `${color}2a`
                    : isDark
                    ? "rgba(255,255,255,0.13)"
                    : "rgba(0,0,0,0.1)"
                  : isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.04)",
              },
            }}
          >
            {opt.label}
          </Box>
        );
      })}
    </Box>
  );
}

// ── Broker Flow Section ───────────────────────────────────────────────────────

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

  const surfaceBg = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.018)";
  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  return (
    <Stack spacing={1.5}>
      {/* ── Controls Toolbar ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          p: 1.25,
          borderRadius: 2,
          bgcolor: surfaceBg,
          border: "1px solid",
          borderColor,
        }}
      >
        {/* Metric toggle */}
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography sx={{ fontSize: "0.6rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Metric
          </Typography>
          <SegmentedToggle
            value={flowMetric}
            onChange={setFlowMetric}
            isDark={isDark}
            colorMap={{ value: "#3b82f6", volume: "#22c55e" }}
            options={[
              { label: "Value", value: "value" },
              { label: "Volume", value: "volume" },
            ]}
          />
        </Stack>

        <Box sx={{ width: 1, height: 18, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />

        {/* View mode toggle */}
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography sx={{ fontSize: "0.6rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            View
          </Typography>
          <SegmentedToggle
            value={flowViewMode}
            onChange={setFlowViewMode}
            isDark={isDark}
            colorMap={{ cumulative: "#0ea5e9", change: "#f97316" }}
            options={[
              { label: "Cumulative", value: "cumulative" },
              { label: "Change", value: "change" },
            ]}
          />
        </Stack>

        <Box sx={{ width: 1, height: 18, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />

        {/* Auto toggle + broker input */}
        <Box
          onClick={() => {
            setFlowAutoMode(true);
            setSelectedBrokers([]);
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.2,
            py: 0.4,
            borderRadius: 1.2,
            cursor: "pointer",
            userSelect: "none",
            transition: "all 140ms ease",
            bgcolor: flowAutoMode
              ? isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.15)"
              : "transparent",
            border: "1px solid",
            borderColor: flowAutoMode ? "primary.main" : "transparent",
          }}
        >
          <TrendingUpIcon sx={{ fontSize: 11, color: flowAutoMode ? "primary.main" : "text.secondary" }} />
          <Typography sx={{ fontSize: "0.65rem", fontWeight: flowAutoMode ? 700 : 500, color: flowAutoMode ? "primary.main" : "text.secondary", fontFamily: '"JetBrains Mono", monospace' }}>
            Auto Top-5
          </Typography>
        </Box>

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
              borderRadius: 1.5,
              height: 26,
              fontSize: "0.7rem",
              bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
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
                    <AddIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {/* ── Selected Broker Chips ── */}
      {selectedBrokers.length > 0 && (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {selectedBrokers.map((code, i) => {
            const color = BROKER_COLORS[i % BROKER_COLORS.length];
            return (
              <Box
                key={code}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 0.9,
                  py: 0.3,
                  borderRadius: 1.2,
                  bgcolor: `${color}18`,
                  border: "1px solid",
                  borderColor: `${color}40`,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: color,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 700,
                    fontSize: "0.62rem",
                    color,
                  }}
                >
                  {code}
                </Typography>
                <Box
                  onClick={() => removeBroker(code)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    color,
                    opacity: 0.6,
                    "&:hover": { opacity: 1 },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 10 }} />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Chart ── */}
      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
          bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f5f4f1",
          boxShadow: isDark
            ? "0 4px 24px rgba(0,0,0,0.25)"
            : "0 2px 12px rgba(15,23,42,0.06)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Broker Flow Chart
            </Typography>
            <Typography sx={{ fontSize: "0.6rem", color: "text.secondary", mt: 0.2 }}>
              {flowViewMode === "cumulative" ? "Cumulative net position" : "Daily net change"} ·{" "}
              {flowMetric === "value" ? "by value (IDR)" : "by volume (lots)"}
            </Typography>
          </Box>
        </Box>

        {loadingFlow ? (
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
        ) : flowData.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ fontSize: "0.8rem" }}>
              No broker flow data available
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: textColor, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: textColor, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                tickFormatter={(v) => formatter(v)}
                width={60}
                axisLine={false}
                tickLine={false}
              />
              {hasClose && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: textColor, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                  }
                  width={50}
                  axisLine={false}
                  tickLine={false}
                />
              )}
              <RechartsTooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)", strokeWidth: 1, strokeDasharray: "4 3" }}
                formatter={(v: number, name: string) => [
                  name === "close" ? v.toLocaleString() : formatter(v),
                  name === "close" ? "Close Price" : name,
                ]}
              />
              <Legend
                wrapperStyle={{
                  fontSize: "10px",
                  fontFamily: "JetBrains Mono, monospace",
                  paddingTop: 12,
                }}
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

// ── Broker Rankings Section ───────────────────────────────────────────────────

function BrokerSummarySection({
  isDark,
  investorType,
  setInvestorType,
  rankings,
  loadingRankings,
}: {
  isDark: boolean;
  investorType: string;
  setInvestorType: (v: string) => void;
  rankings: BrokerPosition[];
  loadingRankings: boolean;
  rankingMetric: "value" | "volume";
  setRankingMetric: (v: "value" | "volume") => void;
}) {
  const topShare = rankings[0]?.value_share ?? 1;

  return (
    <Stack spacing={1.5}>
      {/* ── Investor Type Filter ── */}
      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
        <Typography sx={{ fontSize: "0.6rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.05em", textTransform: "uppercase", mr: 0.5 }}>
          Investor
        </Typography>
        <Box
          sx={{
            display: "flex",
            bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            borderRadius: 1.5,
            p: 0.3,
            gap: 0.2,
          }}
        >
          {INVESTOR_TYPES.map((t) => (
            <Box
              key={t}
              onClick={() => setInvestorType(t)}
              sx={{
                px: 1.2,
                py: 0.4,
                borderRadius: 1.2,
                cursor: "pointer",
                userSelect: "none",
                fontSize: "0.63rem",
                fontWeight: investorType === t ? 700 : 500,
                transition: "all 140ms ease",
                color: investorType === t
                  ? isDark ? "#fff" : "#fff"
                  : "text.secondary",
                bgcolor: investorType === t
                  ? isDark ? "rgba(212,168,67,0.22)" : "rgba(161,124,47,0.16)"
                  : "transparent",
                boxShadow: investorType === t
                  ? "0 1px 4px rgba(0,0,0,0.3)"
                  : "none",
              }}
            >
              {INVESTOR_TYPE_LABELS[t]}
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Leaderboard ── */}
      <Paper
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
          bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f5f4f1",
          boxShadow: isDark
            ? "0 4px 24px rgba(0,0,0,0.25)"
            : "0 2px 12px rgba(15,23,42,0.06)",
        }}
      >
        {loadingRankings ? (
          <Box sx={{ p: 2.5 }}>
            <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
          </Box>
        ) : rankings.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ fontSize: "0.8rem" }}>
              No broker ranking data available
            </Typography>
          </Box>
        ) : (
          <>
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                px: 2,
                py: 1.25,
                borderBottom: "1px solid",
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.015)",
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: 13, color: "primary.main", mr: 0.75 }} />
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "primary.main", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Top Brokers
              </Typography>
              <Box
                sx={{
                  ml: 0.75,
                  px: 0.75,
                  py: 0.15,
                  borderRadius: 0.75,
                  bgcolor: isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.1)",
                }}
              >
                <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "primary.main", fontFamily: '"JetBrains Mono", monospace' }}>
                  {rankings.length}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Box sx={{ display: "flex", gap: 2 }}>
                <Typography sx={{ fontSize: "0.58rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.05em", textTransform: "uppercase", minWidth: 60, textAlign: "right" }}>
                  Value
                </Typography>
                <Typography sx={{ fontSize: "0.58rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.05em", textTransform: "uppercase", display: { xs: "none", sm: "block" }, minWidth: 55, textAlign: "right" }}>
                  Volume
                </Typography>
                <Typography sx={{ fontSize: "0.58rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.05em", textTransform: "uppercase", minWidth: 38, textAlign: "right" }}>
                  Share
                </Typography>
              </Box>
            </Box>

            {/* Rows */}
            <Box sx={{ maxHeight: 480, overflowY: "auto" }}>
              {rankings.map((r, i) => {
                const color = BROKER_COLORS[i % BROKER_COLORS.length];
                const shareWidth = topShare > 0 ? (r.value_share / topShare) * 100 : 0;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

                return (
                  <Box
                    key={`rank-${r.broker_code}-${i}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      px: 2,
                      py: 1,
                      gap: 1.5,
                      position: "relative",
                      overflow: "hidden",
                      transition: "background-color 150ms ease",
                      borderBottom: "1px solid",
                      borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                      "&:last-child": { borderBottom: "none" },
                      "&:hover": {
                        bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)",
                      },
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${shareWidth}%`,
                        bgcolor: `${color}09`,
                        transition: "width 600ms cubic-bezier(0.4,0,0.2,1)",
                        pointerEvents: "none",
                      },
                    }}
                  >
                    {/* Rank */}
                    <Box sx={{ width: 28, flexShrink: 0, textAlign: "center" }}>
                      {medal ? (
                        <Typography sx={{ fontSize: "0.9rem", lineHeight: 1 }}>{medal}</Typography>
                      ) : (
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            color: "text.secondary",
                          }}
                        >
                          {r.rank}
                        </Typography>
                      )}
                    </Box>

                    {/* Broker code badge */}
                    <Box
                      sx={{
                        px: 0.8,
                        py: 0.3,
                        borderRadius: 1,
                        bgcolor: `${color}20`,
                        border: "1px solid",
                        borderColor: `${color}40`,
                        flexShrink: 0,
                        minWidth: 40,
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          color,
                        }}
                      >
                        {r.broker_code}
                      </Typography>
                    </Box>

                    {/* Share bar */}
                    <Box sx={{ flex: 1, minWidth: 40 }}>
                      <Box
                        sx={{
                          height: 5,
                          borderRadius: 3,
                          bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            width: `${shareWidth}%`,
                            bgcolor: color,
                            borderRadius: 3,
                            transition: "width 600ms cubic-bezier(0.4,0,0.2,1)",
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Values */}
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexShrink: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 600,
                          fontSize: "0.67rem",
                          minWidth: 60,
                          textAlign: "right",
                        }}
                      >
                        {r.total_value > 0 ? formatValue(r.total_value) : "—"}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 500,
                          fontSize: "0.63rem",
                          color: "text.secondary",
                          minWidth: 55,
                          textAlign: "right",
                          display: { xs: "none", sm: "block" },
                        }}
                      >
                        {r.total_volume > 0 ? formatShares(r.total_volume) : "—"}
                      </Typography>
                      <Box
                        sx={{
                          minWidth: 38,
                          textAlign: "right",
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            color,
                          }}
                        >
                          {r.value_share.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </Paper>
    </Stack>
  );
}

// ── Broker Distribution Section ───────────────────────────────────────────────

function BrokerDistributionSection({
  isDark,
  distData,
  loading,
}: {
  isDark: boolean;
  distData: BrokerDistEntry[];
  loading: boolean;
}) {
  const [flowMetric, setFlowMetric] = useState<"value" | "volume">("value");
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

  const formatter = flowMetric === "value" ? formatValue : formatShares;
  const getGross = (d: BrokerDistEntry, side: "buy" | "sell") =>
    side === "buy"
      ? flowMetric === "value" ? d.b_val : d.b_lot
      : flowMetric === "value" ? d.s_val : d.s_lot;
  const getNet = (d: BrokerDistEntry) =>
    flowMetric === "value" ? d.net_value : d.net_volume;
  const fmtSigned = (v: number) => `${v >= 0 ? "+" : "-"}${formatter(Math.abs(v))}`;

  const topBuyers = distData
    .filter((r) => getGross(r, "buy") > 0)
    .sort((a, b) => getGross(b, "buy") - getGross(a, "buy"))
    .slice(0, 10);
  const topSellers = distData
    .filter((r) => getGross(r, "sell") > 0)
    .sort((a, b) => getGross(b, "sell") - getGross(a, "sell"))
    .slice(0, 10);

  const totalBuy = topBuyers.reduce((s, b) => s + getGross(b, "buy"), 0);
  const totalSell = topSellers.reduce((s, b) => s + getGross(b, "sell"), 0);

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

  const buildBars = (items: BrokerDistEntry[], side: "buy" | "sell") => {
    if (items.length === 0) return [];
    const usableH = svgH - chartTop - chartBottom;
    const slotH = Math.max(16, (usableH - rowGap * (items.length - 1)) / items.length);
    const maxVal = Math.max(...items.map((it) => getGross(it, side)), 1);
    return items.map((item, idx) => {
      const val = getGross(item, side);
      const rel = Math.sqrt(val / maxVal);
      const h = Math.max(14, Math.min(slotH, slotH * (0.45 + rel * 0.55)));
      const ySlot = chartTop + idx * (slotH + rowGap);
      return { item, y: ySlot + (slotH - h) / 2, h, val };
    });
  };

  const leftBars = buildBars(topBuyers, "buy");
  const rightBars = buildBars(topSellers, "sell");

  const flowCandidates: { li: number; ri: number; score: number; bias: number }[] = [];
  const maxFlows = 48;
  leftBars.forEach((lb, li) => {
    rightBars.forEach((rb, ri) => {
      if (lb.item.broker_code === rb.item.broker_code) return;
      const sellerShare = totalSell > 0 ? lb.val / totalSell : 0;
      const buyerShare = totalBuy > 0 ? rb.val / totalBuy : 0;
      const sellerNet = getNet(lb.item);
      const buyerNet = getNet(rb.item);
      const sellerDistrib = Math.min(Math.abs(Math.min(sellerNet, 0)) / Math.max(lb.val, 1), 1);
      const buyerAbsorb = Math.min(Math.max(buyerNet, 0) / Math.max(rb.val, 1), 1);
      const bias = 0.25 + 0.75 * ((sellerDistrib + buyerAbsorb) / 2);
      const score = sellerShare * buyerShare * bias;
      if (score > 0) flowCandidates.push({ li, ri, score, bias });
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
  leftBest.forEach((c) => selectedFlowMap.set(`flow-${c.li}-${c.ri}`, c));
  rightBest.forEach((c) => selectedFlowMap.set(`flow-${c.li}-${c.ri}`, c));
  flowCandidates.forEach((c) => {
    if (selectedFlowMap.size < maxFlows) selectedFlowMap.set(`flow-${c.li}-${c.ri}`, c);
  });
  const selectedFlows = Array.from(selectedFlowMap.values()).sort((a, b) => b.score - a.score).slice(0, maxFlows);
  const totalFlowScore = selectedFlows.reduce((sum, f) => sum + f.score, 0);

  const flows = selectedFlows.map((f) => ({
    ...f,
    from: leftBars[f.li].item.broker_code,
    to: rightBars[f.ri].item.broker_code,
    est: totalFlowScore > 0 ? (f.score / totalFlowScore) * Math.min(totalBuy, totalSell) : 0,
  }));

  const outByLeft = new Map<number, number>();
  const inByRight = new Map<number, number>();
  flows.forEach((f) => {
    outByLeft.set(f.li, (outByLeft.get(f.li) || 0) + f.est);
    inByRight.set(f.ri, (inByRight.get(f.ri) || 0) + f.est);
  });

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

  const leftSeg = new Map<string, { y1: number; y2: number }>();
  const rightSeg = new Map<string, { y1: number; y2: number }>();

  const allocSegs = (
    group: typeof flows,
    totalEst: number,
    startY: number,
    totalHeight: number,
    target: Map<string, { y1: number; y2: number }>
  ) => {
    if (group.length === 0 || totalEst <= 0 || totalHeight <= 0) return;
    let cursor = startY;
    group.forEach((f, idx) => {
      const isLast = idx === group.length - 1;
      const ratio = totalEst > 0 ? f.est / totalEst : 0;
      const h = isLast ? startY + totalHeight - cursor : ratio * totalHeight;
      target.set(`flow-${f.li}-${f.ri}`, { y1: cursor, y2: cursor + Math.max(0, h) });
      cursor += Math.max(0, h);
    });
  };

  leftBars.forEach((lb, li) => {
    allocSegs(leftGrouped.get(li) || [], outByLeft.get(li) || 0, lb.y, lb.h, leftSeg);
  });
  rightBars.forEach((rb, ri) => {
    allocSegs(rightGrouped.get(ri) || [], inByRight.get(ri) || 0, rb.y, rb.h, rightSeg);
  });

  const paths: { key: string; d: string; color: string; opacity: number; from: string; to: string; est: number; bias: number }[] = [];
  flows.forEach((f) => {
    const flowKey = `flow-${f.li}-${f.ri}`;
    const ls = leftSeg.get(flowKey);
    const rs = rightSeg.get(flowKey);
    if (!ls || !rs) return;
    const x1 = leftBarX + barW;
    const x2 = rightBarX;
    const cx1 = x1 + gapX * 0.35;
    const cx2 = x2 - gapX * 0.35;
    paths.push({
      key: flowKey,
      d: `M${x1},${ls.y1} C${cx1},${ls.y1} ${cx2},${rs.y1} ${x2},${rs.y1} L${x2},${rs.y2} C${cx2},${rs.y2} ${cx1},${ls.y2} ${x1},${ls.y2} Z`,
      color: BROKER_COLORS[f.li % BROKER_COLORS.length],
      opacity: 0.12 + f.bias * 0.2,
      from: f.from, to: f.to, est: f.est, bias: f.bias,
    });
  });

  const setTooltip = (
    event: React.MouseEvent,
    payload: { key: string; title: string; lines: string[]; mode: "flow" | "node"; brokerCode?: string; side?: "left" | "right" }
  ) => {
    const host = tooltipHostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    setHovered({ ...payload, x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";

  return (
    <Stack spacing={1.5}>
      {/* ── Controls ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontSize: "0.6rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Metric
        </Typography>
        <SegmentedToggle
          value={flowMetric}
          onChange={setFlowMetric}
          isDark={isDark}
          colorMap={{ value: "#3b82f6", volume: "#22c55e" }}
          options={[
            { label: "Value", value: "value" },
            { label: "Volume", value: "volume" },
          ]}
        />
      </Box>

      {/* ── Sankey Chart ── */}
      <Paper
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid",
          borderColor,
          bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f5f4f1",
          boxShadow: isDark
            ? "0 4px 24px rgba(0,0,0,0.25)"
            : "0 2px 12px rgba(15,23,42,0.06)",
        }}
      >
        {loading ? (
          <Box sx={{ p: 2.5 }}>
            <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
          </Box>
        ) : topBuyers.length === 0 && topSellers.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ fontSize: "0.8rem" }}>
              No distribution data available
            </Typography>
          </Box>
        ) : (
          <>
            {/* Column headers with totals */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                px: 2,
                py: 1.25,
                borderBottom: "1px solid",
                borderColor,
                bgcolor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.015)",
              }}
            >
              <Box>
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: "#22c55e", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Buyers
                </Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", fontWeight: 700, color: "#22c55e", mt: 0.15 }}>
                  {formatter(totalBuy)}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>
                  Estimated Flow
                </Typography>
                <Typography sx={{ fontSize: "0.6rem", color: "text.secondary", textAlign: "center", mt: 0.15 }}>
                  Based on gross + net signals
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: "#ef4444", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Sellers
                </Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", fontWeight: 700, color: "#ef4444", mt: 0.15 }}>
                  {formatter(totalSell)}
                </Typography>
              </Box>
            </Box>

            {/* SVG Sankey */}
            <Box ref={tooltipHostRef} sx={{ p: 2, overflowX: "auto", position: "relative" }}>
              <svg
                width={svgW}
                height={svgH}
                viewBox={`0 0 ${svgW} ${svgH}`}
                style={{ width: "100%", height: "auto" }}
              >
                {/* Flow paths */}
                {paths.map((p) => (
                  <path
                    key={p.key}
                    d={p.d}
                    fill={p.color}
                    opacity={(() => {
                      if (!hovered) return p.opacity;
                      if (hovered.mode === "flow")
                        return hovered.key === p.key
                          ? Math.min(0.72, p.opacity + 0.34)
                          : Math.max(0.04, p.opacity * 0.22);
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
                        title: `${p.from} → ${p.to}`,
                        lines: [
                          `Est. flow: ${formatter(p.est)}`,
                          `Confidence: ${(p.bias * 100).toFixed(0)}%`,
                        ],
                        mode: "flow",
                      })
                    }
                    onMouseLeave={() => setHovered(null)}
                  />
                ))}

                {/* Left (buyer) bars */}
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
                          key: `left-${i}`,
                          title: `Buyer · ${b.item.broker_code}`,
                          lines: [
                            `Gross buy: ${formatter(b.val)}`,
                            `Net: ${fmtSigned(getNet(b.item))}`,
                          ],
                          mode: "node",
                          brokerCode: b.item.broker_code,
                          side: "left",
                        })
                      }
                      onMouseLeave={() => setHovered(null)}
                    />
                    <text
                      x={leftBarX - 8}
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
                      y={b.y + b.h / 2 - 5}
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
                      y={b.y + b.h / 2 + 7}
                      textAnchor="start"
                      dominantBaseline="central"
                      fill={getNet(b.item) >= 0 ? "#22c55e" : "#ef4444"}
                      fontSize={8}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {fmtSigned(getNet(b.item))}
                    </text>
                  </g>
                ))}

                {/* Right (seller) bars */}
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
                          key: `right-${i}`,
                          title: `Seller · ${b.item.broker_code}`,
                          lines: [
                            `Gross sell: ${formatter(b.val)}`,
                            `Net: ${fmtSigned(getNet(b.item))}`,
                          ],
                          mode: "node",
                          brokerCode: b.item.broker_code,
                          side: "right",
                        })
                      }
                      onMouseLeave={() => setHovered(null)}
                    />
                    <text
                      x={rightBarX + barW + 8}
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
                      y={b.y + b.h / 2 - 5}
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
                      y={b.y + b.h / 2 + 7}
                      textAnchor="end"
                      dominantBaseline="central"
                      fill={getNet(b.item) >= 0 ? "#22c55e" : "#ef4444"}
                      fontSize={8}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {fmtSigned(getNet(b.item))}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Tooltip */}
              {hovered && (
                <Box
                  sx={{
                    position: "absolute",
                    left: Math.min(Math.max(hovered.x + 12, 8), svgW - 240),
                    top: Math.max(hovered.y - 12, 8),
                    transform: "translateY(-100%)",
                    minWidth: 180,
                    maxWidth: 240,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    pointerEvents: "none",
                    zIndex: 5,
                    bgcolor: isDark ? "rgba(8,15,32,0.97)" : "rgba(255,255,255,0.97)",
                    border: "1px solid",
                    borderColor: isDark ? "rgba(107,127,163,0.3)" : "#d1d5db",
                    boxShadow: isDark
                      ? "0 12px 40px rgba(0,0,0,0.6)"
                      : "0 8px 24px rgba(15,23,42,0.15)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: isDark ? "#e2e8f0" : "#0f172a",
                      mb: 0.5,
                    }}
                  >
                    {hovered.title}
                  </Typography>
                  {hovered.lines.map((line, idx) => (
                    <Typography
                      key={`${hovered.key}-line-${idx}`}
                      sx={{
                        fontSize: "0.62rem",
                        lineHeight: 1.4,
                        fontFamily: '"JetBrains Mono", monospace',
                        color: isDark ? "#94a3b8" : "#475569",
                      }}
                    >
                      {line}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>

            {/* Footer note */}
            <Box
              sx={{
                px: 2,
                py: 1,
                borderTop: "1px solid",
                borderColor,
                bgcolor: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  color: "text.secondary",
                  fontStyle: "italic",
                  lineHeight: 1.5,
                }}
              >
                Flow estimation uses gross buy/sell combined with running net signals to approximate
                capital movement from distributing to accumulating brokers.
              </Typography>
            </Box>
          </>
        )}
      </Paper>
    </Stack>
  );
}

export function BrokerSummarySkeleton() {
  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", gap: 0.5 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={42}
            height={28}
            sx={{ borderRadius: 1.5 }}
          />
        ))}
      </Box>
      <Skeleton variant="rounded" height={44} sx={{ borderRadius: 2.5 }} />
      <Skeleton variant="rounded" height={340} sx={{ borderRadius: 3 }} />
    </Stack>
  );
}
