"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { IDXBroker, formatValue, formatShares } from "@/lib/types";
import { GlobalSearch } from "@/components/SearchInput";
import { StatsCard } from "@/components/StatsCard";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
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
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Collapse from "@mui/material/Collapse";
import LinearProgress from "@mui/material/LinearProgress";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import EqualizerIcon from "@mui/icons-material/Equalizer";

const LICENSE_LABELS: Record<string, { short: string; color: string }> = {
  "Penjamin Emisi Efek, Perantara Pedagang Efek": {
    short: "Underwriter + Broker",
    color: "#3b82f6",
  },
  "Perantara Pedagang Efek": {
    short: "Broker-Dealer",
    color: "#8b5cf6",
  },
  "Penjamin Emisi Efek": {
    short: "Underwriter",
    color: "#f59e0b",
  },
};

const PERIOD_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "1M", days: 30 },
  { label: "All", days: 0 },
];

const TREND_CONFIG = {
  surging: { label: "Surging", color: "#22c55e", icon: "up" },
  rising: { label: "Rising", color: "#34d399", icon: "up" },
  steady: { label: "Steady", color: "#94a3b8", icon: "none" },
  declining: { label: "Declining", color: "#f87171", icon: "down" },
} as const;

interface BrokerRecord {
  date: string;
  broker_code: string;
  broker_name: string;
  volume: string;
  value: string;
  frequency: number;
}

interface BrokerAggregate {
  code: string;
  name: string;
  totalVolume: number;
  totalValue: number;
  totalFrequency: number;
  activeDays: number;
  avgValuePerDay: number;
  trend: keyof typeof TREND_CONFIG;
  peakValue: number;
  peakDate: string;
  dailyData: {
    date: string;
    displayDate: string;
    volume: number;
    value: number;
    frequency: number;
  }[];
}

interface DailyTotal {
  date: string;
  displayDate: string;
  totalVolume: number;
  totalValue: number;
  totalFrequency: number;
  activeBrokers: number;
}

export default function BrokersPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [tab, setTab] = useState(0);

  const [brokers, setBrokers] = useState<IDXBroker[]>([]);
  const [loadingBrokers, setLoadingBrokers] = useState(true);
  const [search, setSearch] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("All");

  const [records, setRecords] = useState<BrokerRecord[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [period, setPeriod] = useState(30);
  const [expandedBroker, setExpandedBroker] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBrokers() {
      const { data, error } = await supabase
        .from("idx_brokers")
        .select("*")
        .order("name");
      if (!error && data) setBrokers(data as IDXBroker[]);
      setLoadingBrokers(false);
    }
    fetchBrokers();
  }, []);

  useEffect(() => {
    async function fetchActivity() {
      setLoadingActivity(true);
      let query = supabase
        .from("idx_broker_summary")
        .select("date, broker_code, broker_name, volume, value, frequency")
        .order("date", { ascending: true })
        .limit(10000);

      if (period > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);
        query = query.gte("date", startDate.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (!error && data) setRecords(data as BrokerRecord[]);
      setLoadingActivity(false);
    }
    fetchActivity();
  }, [period]);

  const brokerAggregates = useMemo<BrokerAggregate[]>(() => {
    const map: Record<
      string,
      {
        code: string;
        name: string;
        totalVolume: number;
        totalValue: number;
        totalFrequency: number;
        dailyMap: Record<
          string,
          { volume: number; value: number; frequency: number }
        >;
      }
    > = {};

    records.forEach((r) => {
      const key = r.broker_code;
      if (!map[key]) {
        map[key] = {
          code: key,
          name: r.broker_name,
          totalVolume: 0,
          totalValue: 0,
          totalFrequency: 0,
          dailyMap: {},
        };
      }
      const vol = parseFloat(r.volume) || 0;
      const val = parseFloat(r.value) || 0;
      const freq = r.frequency || 0;

      map[key].totalVolume += vol;
      map[key].totalValue += val;
      map[key].totalFrequency += freq;
      if (r.broker_name) map[key].name = r.broker_name;

      if (!map[key].dailyMap[r.date]) {
        map[key].dailyMap[r.date] = { volume: 0, value: 0, frequency: 0 };
      }
      map[key].dailyMap[r.date].volume += vol;
      map[key].dailyMap[r.date].value += val;
      map[key].dailyMap[r.date].frequency += freq;
    });

    return Object.values(map)
      .map((b) => {
        const dailyData = Object.entries(b.dailyMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, d]) => ({
            date,
            displayDate: new Date(date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            ...d,
          }));

        const activeDays = dailyData.length;
        const avgValuePerDay =
          activeDays > 0 ? b.totalValue / activeDays : 0;

        let trend: keyof typeof TREND_CONFIG = "steady";
        if (dailyData.length >= 3) {
          const recentDays = dailyData.slice(-3);
          const recentAvg =
            recentDays.reduce((s, d) => s + d.value, 0) / recentDays.length;
          const ratio = avgValuePerDay > 0 ? recentAvg / avgValuePerDay : 1;
          if (ratio > 1.5) trend = "surging";
          else if (ratio > 1.15) trend = "rising";
          else if (ratio < 0.7) trend = "declining";
        }

        let peakValue = 0;
        let peakDate = "";
        dailyData.forEach((d) => {
          if (d.value > peakValue) {
            peakValue = d.value;
            peakDate = d.displayDate;
          }
        });

        return {
          code: b.code,
          name: b.name,
          totalVolume: b.totalVolume,
          totalValue: b.totalValue,
          totalFrequency: b.totalFrequency,
          activeDays,
          avgValuePerDay,
          trend,
          peakValue,
          peakDate,
          dailyData,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [records]);

  const dailyTotals = useMemo<DailyTotal[]>(() => {
    const map: Record<
      string,
      {
        volume: number;
        value: number;
        frequency: number;
        brokers: Set<string>;
      }
    > = {};
    records.forEach((r) => {
      if (!map[r.date])
        map[r.date] = {
          volume: 0,
          value: 0,
          frequency: 0,
          brokers: new Set(),
        };
      map[r.date].volume += parseFloat(r.volume) || 0;
      map[r.date].value += parseFloat(r.value) || 0;
      map[r.date].frequency += r.frequency || 0;
      map[r.date].brokers.add(r.broker_code);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        displayDate: new Date(date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        totalVolume: d.volume,
        totalValue: d.value,
        totalFrequency: d.frequency,
        activeBrokers: d.brokers.size,
      }));
  }, [records]);

  const activityStats = useMemo(() => {
    const totalValue = dailyTotals.reduce((s, d) => s + d.totalValue, 0);
    const totalVolume = dailyTotals.reduce((s, d) => s + d.totalVolume, 0);
    const totalFreq = dailyTotals.reduce((s, d) => s + d.totalFrequency, 0);
    const activeBrokers = brokerAggregates.length;
    const tradingDays = dailyTotals.length;
    const avgDailyValue = tradingDays > 0 ? totalValue / tradingDays : 0;
    const top5Value = brokerAggregates
      .slice(0, 5)
      .reduce((s, b) => s + b.totalValue, 0);
    const top5Pct = totalValue > 0 ? (top5Value / totalValue) * 100 : 0;

    return {
      totalValue,
      totalVolume,
      totalFreq,
      activeBrokers,
      tradingDays,
      avgDailyValue,
      top5Pct,
    };
  }, [dailyTotals, brokerAggregates]);

  const licenseTypes = useMemo(() => {
    const s = new Set(brokers.map((b) => b.license).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [brokers]);

  const filtered = useMemo(() => {
    let result = brokers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.code.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q)
      );
    }
    if (licenseFilter !== "All") {
      result = result.filter((b) => b.license === licenseFilter);
    }
    return result;
  }, [brokers, search, licenseFilter]);

  const dirStats = useMemo(() => {
    const byLicense: Record<string, number> = {};
    brokers.forEach((b) => {
      byLicense[b.license] = (byLicense[b.license] || 0) + 1;
    });
    return {
      total: brokers.length,
      underwriterBroker:
        byLicense["Penjamin Emisi Efek, Perantara Pedagang Efek"] || 0,
      brokerOnly: byLicense["Perantara Pedagang Efek"] || 0,
    };
  }, [brokers]);

  const textColor = isDark ? "#6b7fa3" : "#546280";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tooltipStyle = {
    background: isDark ? "#111b30" : "#fff",
    border: `1px solid ${isDark ? "rgba(107,127,163,0.15)" : "#e4e4e7"}`,
    borderRadius: "8px",
    fontSize: "12px",
    color: isDark ? "#e8edf5" : "#0c1222",
  };

  const maxBrokerValue =
    brokerAggregates.length > 0 ? brokerAggregates[0].totalValue : 1;

  const isLoading =
    tab === 0
      ? loadingActivity && records.length === 0
      : loadingBrokers && brokers.length === 0;

  if (isLoading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3 }} />
        <Skeleton
          variant="rounded"
          height={40}
          sx={{ borderRadius: 3, maxWidth: 320 }}
        />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid size={{ xs: 6, md: 3 }} key={i}>
              <Skeleton
                variant="rounded"
                height={80}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={2}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Grid size={{ xs: 12, lg: 6 }} key={i}>
              <Skeleton
                variant="rounded"
                height={260}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
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
          Broker Intelligence
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.25 }}
        >
          Market activity analytics and broker directory for IDX
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          minHeight: 36,
          "& .MuiTab-root": {
            minHeight: 36,
            py: 0.5,
            px: 2,
            fontSize: "0.8rem",
            fontWeight: 600,
            textTransform: "none",
            borderRadius: 2,
            mr: 1,
          },
          "& .MuiTabs-indicator": {
            height: 2,
            borderRadius: 1,
          },
        }}
      >
        <Tab
          icon={<EqualizerIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label="Market Activity"
        />
        <Tab
          icon={<StorefrontIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label="Directory"
        />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={2.5} className="animate-in">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, mr: 0.5 }}
            >
              Period
            </Typography>
            {PERIOD_OPTIONS.map((opt) => (
              <Chip
                key={opt.days}
                label={opt.label}
                size="small"
                onClick={() => setPeriod(opt.days)}
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  height: 26,
                  cursor: "pointer",
                  bgcolor:
                    period === opt.days
                      ? isDark
                        ? "rgba(212,168,67,0.15)"
                        : "rgba(161,124,47,0.1)"
                      : "transparent",
                  color:
                    period === opt.days ? "primary.main" : "text.secondary",
                  border: "1px solid",
                  borderColor:
                    period === opt.days ? "primary.main" : "transparent",
                  "&:hover": {
                    bgcolor: isDark
                      ? "rgba(212,168,67,0.1)"
                      : "rgba(161,124,47,0.06)",
                  },
                }}
              />
            ))}
            {loadingActivity && (
              <Chip
                label="Loading..."
                size="small"
                sx={{ fontSize: "0.65rem", height: 22, opacity: 0.5 }}
              />
            )}
          </Stack>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }} className="animate-in animate-in-delay-1">
              <StatsCard
                title="Total Value"
                value={formatValue(activityStats.totalValue)}
                subtitle={`${activityStats.tradingDays} trading days`}
                icon={<ShowChartIcon />}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }} className="animate-in animate-in-delay-2">
              <StatsCard
                title="Total Volume"
                value={formatShares(activityStats.totalVolume)}
                subtitle={`${formatShares(activityStats.totalFreq)} txns`}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }} className="animate-in animate-in-delay-3">
              <StatsCard
                title="Active Brokers"
                value={activityStats.activeBrokers}
                subtitle={`Top 5: ${activityStats.top5Pct.toFixed(1)}% share`}
                icon={<StorefrontIcon />}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }} className="animate-in animate-in-delay-4">
              <StatsCard
                title="Avg Daily Value"
                value={formatValue(activityStats.avgDailyValue)}
                subtitle="Per trading day"
                icon={<EqualizerIcon />}
              />
            </Grid>
          </Grid>

          {brokerAggregates.length >= 5 && (
            <Paper
              sx={{
                px: 2.5,
                py: 1.5,
                borderRadius: 2.5,
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
              className="animate-in animate-in-delay-4"
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, fontSize: "0.7rem" }}
              >
                Market Concentration
              </Typography>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Box
                  sx={{
                    display: "flex",
                    height: 8,
                    borderRadius: 4,
                    overflow: "hidden",
                    bgcolor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                  }}
                >
                  {brokerAggregates.slice(0, 5).map((b, i) => {
                    const pct =
                      activityStats.totalValue > 0
                        ? (b.totalValue / activityStats.totalValue) * 100
                        : 0;
                    return (
                      <Tooltip
                        key={b.code}
                        title={`${b.code}: ${pct.toFixed(1)}%`}
                        arrow
                      >
                        <Box
                          sx={{
                            width: `${pct}%`,
                            bgcolor: [
                              "#d4a843",
                              "#e8c468",
                              "#f0d68a",
                              "#3b82f6",
                              "#8b5cf6",
                            ][i],
                            transition: "width 0.5s ease",
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                {brokerAggregates.slice(0, 5).map((b, i) => (
                  <Typography
                    key={b.code}
                    variant="caption"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.6rem",
                      color: [
                        "#d4a843",
                        "#e8c468",
                        "#f0d68a",
                        "#3b82f6",
                        "#8b5cf6",
                      ][i],
                      fontWeight: 600,
                    }}
                  >
                    {b.code}{" "}
                    {(
                      (b.totalValue / activityStats.totalValue) *
                      100
                    ).toFixed(1)}
                    %
                  </Typography>
                ))}
              </Stack>
            </Paper>
          )}

          {dailyTotals.length > 1 && (
            <Grid container spacing={2}>
              <Grid
                size={{ xs: 12, lg: 6 }}
                className="animate-in animate-in-delay-5"
              >
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500,
                      mb: 1.5,
                      display: "block",
                    }}
                  >
                    Daily Market Value (IDR)
                  </Typography>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={dailyTotals}>
                      <defs>
                        <linearGradient
                          id="valueGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#d4a843"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#d4a843"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={gridColor}
                      />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fill: textColor, fontSize: 9 }}
                      />
                      <YAxis
                        tick={{ fill: textColor, fontSize: 10 }}
                        tickFormatter={(v) => formatValue(v)}
                      />
                      <RechartsTooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number) => [formatValue(v), "Value"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalValue"
                        stroke="#d4a843"
                        fill="url(#valueGrad)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid
                size={{ xs: 12, lg: 6 }}
                className="animate-in animate-in-delay-6"
              >
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500,
                      mb: 1.5,
                      display: "block",
                    }}
                  >
                    Daily Market Volume
                  </Typography>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dailyTotals}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={gridColor}
                      />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fill: textColor, fontSize: 9 }}
                      />
                      <YAxis
                        tick={{ fill: textColor, fontSize: 10 }}
                        tickFormatter={(v) => formatShares(v)}
                      />
                      <RechartsTooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number) => [formatShares(v), "Volume"]}
                      />
                      <Bar
                        dataKey="totalVolume"
                        fill="#34d399"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          )}

          <Paper
            sx={{ p: 2.5, borderRadius: 3 }}
            className="animate-in animate-in-delay-7"
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
                mb: 2,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Broker Leaderboard
                </Typography>
                <Chip
                  label={`${brokerAggregates.length} brokers`}
                  size="small"
                  sx={{
                    fontSize: "0.65rem",
                    height: 20,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Ranked by total trading value - click to expand
              </Typography>
            </Box>

            <TableContainer sx={{ maxHeight: 620 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 32 }}>#</TableCell>
                    <TableCell sx={{ width: 28, p: 0.5 }} />
                    <TableCell>Broker</TableCell>
                    <TableCell align="right">Total Value</TableCell>
                    <TableCell
                      align="right"
                      sx={{ display: { xs: "none", md: "table-cell" } }}
                    >
                      Volume
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ display: { xs: "none", sm: "table-cell" } }}
                    >
                      Freq
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ display: { xs: "none", md: "table-cell" } }}
                    >
                      Days
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ display: { xs: "none", lg: "table-cell" } }}
                    >
                      Trend
                    </TableCell>
                    <TableCell sx={{ minWidth: 110 }}>Share</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {brokerAggregates.map((broker, i) => {
                    const sharePct =
                      activityStats.totalValue > 0
                        ? (broker.totalValue / activityStats.totalValue) * 100
                        : 0;
                    const barPct =
                      maxBrokerValue > 0
                        ? (broker.totalValue / maxBrokerValue) * 100
                        : 0;
                    const isExpanded = expandedBroker === broker.code;
                    const trendCfg = TREND_CONFIG[broker.trend];

                    return (
                      <Fragment key={broker.code}>
                        <TableRow
                          onClick={() =>
                            setExpandedBroker(
                              isExpanded ? null : broker.code
                            )
                          }
                          sx={{
                            cursor: "pointer",
                            "&:hover": {
                              bgcolor: isDark
                                ? "rgba(212,168,67,0.04)"
                                : "rgba(161,124,47,0.02)",
                            },
                            ...(isExpanded && {
                              bgcolor: isDark
                                ? "rgba(212,168,67,0.06)"
                                : "rgba(161,124,47,0.03)",
                            }),
                            ...(i < 3 && {
                              borderLeft: `3px solid ${
                                i === 0
                                  ? "#d4a843"
                                  : i === 1
                                    ? "#e8c468"
                                    : "#f0d68a"
                              }`,
                            }),
                          }}
                        >
                          <TableCell>
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                color:
                                  i < 3 ? "primary.main" : "text.secondary",
                                fontWeight: i < 3 ? 700 : 400,
                              }}
                            >
                              {i + 1}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ p: 0.5 }}>
                            {isExpanded ? (
                              <KeyboardArrowUpIcon
                                sx={{ fontSize: 16, color: "text.secondary" }}
                              />
                            ) : (
                              <KeyboardArrowDownIcon
                                sx={{ fontSize: 16, color: "text.secondary" }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Tooltip
                              title={broker.name}
                              placement="top"
                              arrow
                            >
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: "0.8rem",
                                    color: "primary.main",
                                  }}
                                >
                                  {broker.code}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    fontSize: "0.65rem",
                                    display: "block",
                                    maxWidth: 180,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {broker.name}
                                </Typography>
                              </Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 600,
                              }}
                            >
                              {formatValue(broker.totalValue)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              display: { xs: "none", md: "table-cell" },
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              {formatShares(broker.totalVolume)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              display: { xs: "none", sm: "table-cell" },
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              {broker.totalFrequency.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              display: { xs: "none", md: "table-cell" },
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                color: "text.secondary",
                              }}
                            >
                              {broker.activeDays}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              display: { xs: "none", lg: "table-cell" },
                            }}
                          >
                            <Chip
                              icon={
                                trendCfg.icon === "up" ? (
                                  <TrendingUpIcon sx={{ fontSize: 12 }} />
                                ) : trendCfg.icon === "down" ? (
                                  <TrendingDownIcon sx={{ fontSize: 12 }} />
                                ) : undefined
                              }
                              label={trendCfg.label}
                              size="small"
                              sx={{
                                fontSize: "0.6rem",
                                height: 20,
                                bgcolor: `${trendCfg.color}18`,
                                color: trendCfg.color,
                                fontWeight: 600,
                                "& .MuiChip-icon": {
                                  color: trendCfg.color,
                                  fontSize: 12,
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Box sx={{ flex: 1, minWidth: 50 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={barPct}
                                  sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: isDark
                                      ? "rgba(255,255,255,0.06)"
                                      : "rgba(0,0,0,0.06)",
                                    "& .MuiLinearProgress-bar": {
                                      borderRadius: 3,
                                      bgcolor:
                                        i < 3
                                          ? "#d4a843"
                                          : i < 10
                                            ? "#e8c468"
                                            : isDark
                                              ? "rgba(255,255,255,0.2)"
                                              : "rgba(0,0,0,0.15)",
                                    },
                                  }}
                                />
                              </Box>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  color: "text.secondary",
                                  minWidth: 38,
                                  textAlign: "right",
                                  fontSize: "0.6rem",
                                }}
                              >
                                {sharePct.toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell
                            colSpan={9}
                            sx={{ p: 0, borderBottom: isExpanded ? undefined : 0 }}
                          >
                            <Collapse
                              in={isExpanded}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Box
                                sx={{
                                  px: 3,
                                  py: 2.5,
                                  bgcolor: isDark
                                    ? "rgba(212,168,67,0.03)"
                                    : "rgba(161,124,47,0.015)",
                                }}
                              >
                                <Grid container spacing={2.5}>
                                  <Grid size={{ xs: 12, sm: 4 }}>
                                    <Stack spacing={2}>
                                      <Box>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{
                                            fontSize: "0.6rem",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                          }}
                                        >
                                          Avg Value / Day
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 700,
                                            fontFamily:
                                              '"JetBrains Mono", monospace',
                                            mt: 0.25,
                                          }}
                                        >
                                          {formatValue(broker.avgValuePerDay)}
                                        </Typography>
                                      </Box>
                                      <Box>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{
                                            fontSize: "0.6rem",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                          }}
                                        >
                                          Peak Day
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 700,
                                            fontFamily:
                                              '"JetBrains Mono", monospace',
                                            mt: 0.25,
                                          }}
                                        >
                                          {formatValue(broker.peakValue)}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ fontSize: "0.6rem" }}
                                        >
                                          on {broker.peakDate}
                                        </Typography>
                                      </Box>
                                      <Box>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{
                                            fontSize: "0.6rem",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                          }}
                                        >
                                          Avg Freq / Day
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 700,
                                            fontFamily:
                                              '"JetBrains Mono", monospace',
                                            mt: 0.25,
                                          }}
                                        >
                                          {broker.activeDays > 0
                                            ? Math.round(
                                                broker.totalFrequency /
                                                  broker.activeDays
                                              ).toLocaleString()
                                            : "0"}
                                        </Typography>
                                      </Box>
                                    </Stack>
                                  </Grid>

                                  <Grid size={{ xs: 12, sm: 8 }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        fontSize: "0.6rem",
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        mb: 1,
                                        display: "block",
                                      }}
                                    >
                                      Daily Trading Value
                                    </Typography>
                                    {broker.dailyData.length > 1 ? (
                                      <ResponsiveContainer
                                        width="100%"
                                        height={160}
                                      >
                                        <AreaChart data={broker.dailyData}>
                                          <defs>
                                            <linearGradient
                                              id={`grad-${broker.code}`}
                                              x1="0"
                                              y1="0"
                                              x2="0"
                                              y2="1"
                                            >
                                              <stop
                                                offset="5%"
                                                stopColor="#3b82f6"
                                                stopOpacity={0.25}
                                              />
                                              <stop
                                                offset="95%"
                                                stopColor="#3b82f6"
                                                stopOpacity={0}
                                              />
                                            </linearGradient>
                                          </defs>
                                          <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={gridColor}
                                          />
                                          <XAxis
                                            dataKey="displayDate"
                                            tick={{
                                              fill: textColor,
                                              fontSize: 8,
                                            }}
                                          />
                                          <YAxis
                                            tick={{
                                              fill: textColor,
                                              fontSize: 9,
                                            }}
                                            tickFormatter={(v) =>
                                              formatValue(v)
                                            }
                                            width={55}
                                          />
                                          <RechartsTooltip
                                            contentStyle={tooltipStyle}
                                            formatter={(v: number) => [
                                              formatValue(v),
                                              "Value",
                                            ]}
                                          />
                                          <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#3b82f6"
                                            fill={`url(#grad-${broker.code})`}
                                            strokeWidth={2}
                                          />
                                        </AreaChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          height: 160,
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Not enough data points for chart
                                        </Typography>
                                      </Box>
                                    )}
                                  </Grid>
                                </Grid>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {brokerAggregates.length === 0 && !loadingActivity && (
              <Box sx={{ py: 5, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No broker activity data found for this period
                </Typography>
              </Box>
            )}
          </Paper>
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={2.5} className="animate-in">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatsCard
                title="Total Brokers"
                value={dirStats.total}
                subtitle="Registered firms"
                icon={<StorefrontIcon />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <StatsCard
                title="Underwriter + Broker"
                value={dirStats.underwriterBroker}
                subtitle="Dual-licensed"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <StatsCard
                title="Broker-Dealer Only"
                value={dirStats.brokerOnly}
                subtitle="Trading only"
              />
            </Grid>
          </Grid>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ sm: "center" }}
          >
            <TextField
              size="small"
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        sx={{ fontSize: 18, color: "text.secondary" }}
                      />
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
              <FilterListIcon
                sx={{ fontSize: 16, color: "text.secondary" }}
              />
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <Select
                  value={licenseFilter}
                  onChange={(e) => setLicenseFilter(e.target.value)}
                  sx={{ borderRadius: 2, fontSize: "0.85rem" }}
                >
                  {licenseTypes.map((l) => (
                    <MenuItem key={l} value={l} sx={{ fontSize: "0.85rem" }}>
                      {l === "All"
                        ? "All Licenses"
                        : LICENSE_LABELS[l]?.short || l}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Chip
              label={`${filtered.length} broker${filtered.length !== 1 ? "s" : ""}`}
              size="small"
              sx={{ fontFamily: "monospace", fontWeight: 600 }}
            />
          </Stack>

          <Grid container spacing={1.5}>
            {filtered.map((broker) => {
              const lic = LICENSE_LABELS[broker.license];
              const activityData = brokerAggregates.find(
                (a) => a.code === broker.code
              );

              return (
                <Grid
                  size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                  key={broker.code}
                >
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      transition:
                        "border-color 0.15s ease, background-color 0.15s ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: isDark
                          ? "rgba(59,130,246,0.04)"
                          : "rgba(59,130,246,0.02)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontFamily: "monospace",
                          color: "primary.main",
                          fontSize: "1rem",
                        }}
                      >
                        {broker.code}
                      </Typography>
                      <StorefrontIcon
                        sx={{
                          fontSize: 16,
                          color: "text.secondary",
                          opacity: 0.3,
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        fontSize: "0.8rem",
                        lineHeight: 1.3,
                        flex: 1,
                      }}
                    >
                      {broker.name}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        label={lic?.short || broker.license}
                        size="small"
                        sx={{
                          fontSize: "0.65rem",
                          height: 20,
                          bgcolor: lic
                            ? `${lic.color}18`
                            : isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          color: lic?.color || "text.secondary",
                          fontWeight: 600,
                        }}
                      />
                      {activityData && (
                        <Chip
                          label={formatValue(activityData.totalValue)}
                          size="small"
                          sx={{
                            fontSize: "0.6rem",
                            height: 18,
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 600,
                            bgcolor: isDark
                              ? "rgba(212,168,67,0.12)"
                              : "rgba(161,124,47,0.08)",
                            color: "primary.main",
                          }}
                        />
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {filtered.length === 0 && (
            <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
              <Typography color="text.secondary">
                No brokers found matching your criteria
              </Typography>
            </Paper>
          )}
        </Stack>
      )}
    </Stack>
  );
}
