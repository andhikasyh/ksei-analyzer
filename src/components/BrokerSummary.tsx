"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import {
  BrokerActivity,
  StockTradingSummary,
  BrokerApiResponse,
  formatValue,
  formatShares,
} from "@/lib/types";

interface BrokerSummaryProps {
  stockCode: string;
}

function parseBrokers(raw: any[]): BrokerActivity[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((b) => ({
    code: b.IDFirm || "",
    name: b.FirmName || b.IDFirm || "",
    volume: Number(b.Volume || 0),
    value: Number(b.Value || 0),
    frequency: Number(b.Frequency || 0),
  }));
}

function parseStock(raw: any): StockTradingSummary | null {
  if (!raw) return null;
  return {
    stockCode: raw.StockCode || "",
    stockName: raw.StockName || "",
    date: raw.Date || "",
    previous: Number(raw.Previous || 0),
    open: Number(raw.OpenPrice || 0),
    high: Number(raw.High || 0),
    low: Number(raw.Low || 0),
    close: Number(raw.Close || 0),
    change: Number(raw.Change || 0),
    volume: Number(raw.Volume || 0),
    value: Number(raw.Value || 0),
    frequency: Number(raw.Frequency || 0),
    foreignBuy: Number(raw.ForeignBuy || 0),
    foreignSell: Number(raw.ForeignSell || 0),
    foreignNet: Number(raw.ForeignBuy || 0) - Number(raw.ForeignSell || 0),
    bid: Number(raw.Bid || 0),
    bidVolume: Number(raw.BidVolume || 0),
    offer: Number(raw.Offer || 0),
    offerVolume: Number(raw.OfferVolume || 0),
    listedShares: Number(raw.ListedShares || 0),
  };
}

function TradingOverview({ stock }: { stock: StockTradingSummary }) {
  const theme = useTheme();
  const isUp = stock.change >= 0;
  const changeColor = isUp ? "#22c55e" : "#ef4444";
  const changePct =
    stock.previous > 0 ? ((stock.change / stock.previous) * 100).toFixed(2) : "0";
  const foreignNetColor = stock.foreignNet >= 0 ? "#22c55e" : "#ef4444";

  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <StorefrontIcon
          sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }}
        />
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 500 }}
        >
          Market Data
        </Typography>
        <Chip
          label={new Date(stock.date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          size="small"
          sx={{
            fontSize: "0.65rem",
            height: 20,
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
          }}
        />
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Close
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontFamily: "monospace", lineHeight: 1.3 }}
          >
            {stock.close.toLocaleString()}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {isUp ? (
              <TrendingUpIcon sx={{ fontSize: 13, color: changeColor }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 13, color: changeColor }} />
            )}
            <Typography
              variant="caption"
              sx={{ color: changeColor, fontWeight: 600, fontSize: "0.7rem" }}
            >
              {isUp ? "+" : ""}
              {stock.change} ({isUp ? "+" : ""}
              {changePct}%)
            </Typography>
          </Stack>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Range
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", fontWeight: 600, mt: 0.5 }}
          >
            {stock.low.toLocaleString()} - {stock.high.toLocaleString()}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Volume
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", fontWeight: 600, mt: 0.5 }}
          >
            {formatShares(stock.volume)}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Value
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", fontWeight: 600, mt: 0.5 }}
          >
            {formatValue(stock.value)}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Frequency
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", fontWeight: 600, mt: 0.5 }}
          >
            {stock.frequency.toLocaleString()}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Foreign Net
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: "monospace",
              fontWeight: 600,
              mt: 0.5,
              color: foreignNetColor,
            }}
          >
            {stock.foreignNet >= 0 ? "+" : ""}
            {formatShares(stock.foreignNet)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontSize: "0.6rem" }}
          >
            Buy {formatShares(stock.foreignBuy)} / Sell{" "}
            {formatShares(stock.foreignSell)}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
}

export function BrokerSummaryPanel({ stockCode }: BrokerSummaryProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brokers, setBrokers] = useState<BrokerActivity[]>([]);
  const [stock, setStock] = useState<StockTradingSummary | null>(null);
  const [apiConfigured, setApiConfigured] = useState(true);

  useEffect(() => {
    async function fetchBrokerData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/broker-summary?stockCode=${stockCode}`);
        const data: BrokerApiResponse = await res.json();

        if (data.error) {
          if (data.error.includes("not configured")) {
            setApiConfigured(false);
          }
          setError(data.error);
          return;
        }

        setBrokers(parseBrokers(data.brokers));
        setStock(parseStock(data.stock));
      } catch {
        setError("Failed to fetch broker data");
      } finally {
        setLoading(false);
      }
    }

    fetchBrokerData();
  }, [stockCode]);

  const { sortedByValue, maxValue, totalValue, totalVolume } = useMemo(() => {
    const sorted = [...brokers].sort((a, b) => b.value - a.value);
    const maxVal = sorted.length > 0 ? sorted[0].value : 1;
    const totVal = brokers.reduce((s, b) => s + b.value, 0);
    const totVol = brokers.reduce((s, b) => s + b.volume, 0);
    return {
      sortedByValue: sorted,
      maxValue: maxVal,
      totalValue: totVal,
      totalVolume: totVol,
    };
  }, [brokers]);

  if (loading) return <BrokerSummarySkeleton />;

  if (!apiConfigured) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
          <StorefrontIcon
            sx={{ fontSize: 40, color: "text.secondary", opacity: 0.4 }}
          />
          <Typography variant="subtitle2" color="text.secondary">
            Broker Summary
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            sx={{ maxWidth: 420 }}
          >
            To enable broker activity data, add your RapidAPI key to{" "}
            <code
              style={{
                padding: "2px 6px",
                borderRadius: 4,
                background:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)",
                fontSize: "0.8em",
              }}
            >
              .env.local
            </code>
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: "monospace",
              color: "text.secondary",
              background:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.04)",
              px: 2,
              py: 1,
              borderRadius: 2,
            }}
          >
            RAPIDAPI_KEY=your_key_here
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Get a free key at{" "}
            <a
              href="https://rapidapi.com/yasimpratama88/api/indonesia-stock-exchange-idx"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: theme.palette.primary.main }}
            >
              rapidapi.com
            </a>
          </Typography>
        </Stack>
      </Paper>
    );
  }

  if (error && brokers.length === 0 && !stock) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={1} alignItems="center" sx={{ py: 2 }}>
          <StorefrontIcon
            sx={{ fontSize: 36, color: "text.secondary", opacity: 0.4 }}
          />
          <Typography variant="body2" color="text.secondary">
            {error || "No broker activity data available for this stock"}
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {stock && <TradingOverview stock={stock} />}

      {sortedByValue.length > 0 && (
        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
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
              <StorefrontIcon
                sx={{ color: "text.secondary", fontSize: 18, opacity: 0.6 }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Broker Activity
              </Typography>
              <Chip
                label={`${brokers.length} brokers`}
                size="small"
                sx={{
                  fontSize: "0.7rem",
                  height: 22,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography variant="caption" color="text.secondary">
                Total Value:{" "}
                <strong style={{ color: theme.palette.text.primary }}>
                  {formatValue(totalValue)}
                </strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Volume:{" "}
                <strong style={{ color: theme.palette.text.primary }}>
                  {formatShares(totalVolume)}
                </strong>
              </Typography>
            </Stack>
          </Box>

          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 36 }}>#</TableCell>
                  <TableCell>Broker</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell align="right">Value (IDR)</TableCell>
                  <TableCell align="right">Freq</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Share</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedByValue.map((broker, i) => {
                  const sharePct =
                    totalValue > 0
                      ? (broker.value / totalValue) * 100
                      : 0;
                  const barPct =
                    maxValue > 0 ? (broker.value / maxValue) * 100 : 0;

                  return (
                    <TableRow
                      key={broker.code}
                      sx={{ "&:last-child td": { borderBottom: 0 } }}
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
                        <Tooltip title={broker.name} placement="top" arrow>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                fontFamily: "monospace",
                                fontSize: "0.8rem",
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
                                maxWidth: 160,
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
                          sx={{ fontFamily: "monospace" }}
                        >
                          {formatShares(broker.volume)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "monospace", fontWeight: 600 }}
                        >
                          {formatValue(broker.value)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {broker.frequency.toLocaleString()}
                        </Typography>
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
                                bgcolor:
                                  theme.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.06)",
                                "& .MuiLinearProgress-bar": {
                                  borderRadius: 3,
                                  bgcolor:
                                    i < 3
                                      ? "#3b82f6"
                                      : i < 10
                                        ? "#60a5fa"
                                        : theme.palette.mode === "dark"
                                          ? "rgba(255,255,255,0.2)"
                                          : "rgba(0,0,0,0.15)",
                                },
                              }}
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: "monospace",
                              color: "text.secondary",
                              minWidth: 42,
                              textAlign: "right",
                              fontSize: "0.65rem",
                            }}
                          >
                            {sharePct.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Stack>
  );
}

export function BrokerSummarySkeleton() {
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width={140} height={16} />
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={i}>
              <Skeleton width={60} height={14} />
              <Skeleton width={90} height={24} sx={{ mt: 0.5 }} />
            </Grid>
          ))}
        </Grid>
      </Paper>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width={160} height={20} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
      </Paper>
    </Stack>
  );
}
