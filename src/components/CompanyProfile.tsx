"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import {
  IDXFinancialRatio,
  IDXCompanyPerson,
  formatBillion,
  formatRatio,
} from "@/lib/types";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
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
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import GroupsIcon from "@mui/icons-material/Groups";
import InsightsIcon from "@mui/icons-material/Insights";

interface CompanyProfileProps {
  stockCode: string;
}

function MetricItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor:
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.02)",
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", display: "block", lineHeight: 1.2 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontFamily: "monospace",
          fontWeight: 700,
          mt: 0.5,
          color: color || "text.primary",
          fontSize: "0.9rem",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function PersonTable({ people }: { people: IDXCompanyPerson[] }) {
  const theme = useTheme();
  if (people.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No data available
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ maxHeight: 360 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 36 }}>#</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Position</TableCell>
            <TableCell align="center">Affiliated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {people.map((p, i) => (
            <TableRow key={p.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
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
                  {p.nama}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", textTransform: "capitalize" }}
                >
                  {(p.jabatan || "-").toLowerCase()}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={p.afiliasi ? "Yes" : "No"}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    bgcolor: p.afiliasi
                      ? theme.palette.mode === "dark"
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(245,158,11,0.1)"
                      : theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    color: p.afiliasi ? "#f59e0b" : "text.secondary",
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function scoreMetric(value: number, low: number, high: number): number {
  return Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));
}

function scorePE(pe: number): number {
  if (pe < 0) return 10;
  if (pe <= 15) return 90 + (15 - pe);
  if (pe <= 30) return 90 - ((pe - 15) / 15) * 40;
  return Math.max(5, 50 - ((pe - 30) / 50) * 45);
}

function scoreDE(de: number): number {
  if (de < 0) return 10;
  return Math.max(5, 100 / (1 + de * 0.8));
}

function buildRadarData(fin: IDXFinancialRatio) {
  const roe = parseFloat(fin.roe) || 0;
  const roa = parseFloat(fin.roa) || 0;
  const npm = parseFloat(fin.npm) || 0;
  const per = parseFloat(fin.per) || 0;
  const de = parseFloat(fin.de_ratio) || 0;

  return [
    { axis: "Profitability", value: scoreMetric(roe, -10, 30), raw: `ROE ${roe.toFixed(1)}%` },
    { axis: "Efficiency", value: scoreMetric(roa, -5, 15), raw: `ROA ${roa.toFixed(1)}%` },
    { axis: "Margins", value: scoreMetric(npm, -10, 30), raw: `NPM ${npm.toFixed(1)}%` },
    { axis: "Valuation", value: scorePE(per), raw: `P/E ${per.toFixed(1)}x` },
    { axis: "Stability", value: scoreDE(de), raw: `D/E ${de.toFixed(2)}` },
  ];
}

function PerformanceRadar({ financials }: { financials: IDXFinancialRatio }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const data = buildRadarData(financials);
  const avg = Math.round(data.reduce((s, d) => s + d.value, 0) / data.length);

  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const axisColor = isDark ? "#a1a1aa" : "#71717a";

  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <InsightsIcon
            sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }}
          />
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontWeight: 500 }}
          >
            Performance Analysis
          </Typography>
        </Stack>
        <Chip
          label={`Score: ${avg}/100`}
          size="small"
          sx={{
            fontSize: "0.7rem",
            height: 22,
            fontWeight: 700,
            fontFamily: "monospace",
            bgcolor:
              avg >= 60
                ? isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)"
                : avg >= 35
                  ? isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)"
                  : isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)",
            color: avg >= 60 ? "#22c55e" : avg >= 35 ? "#f59e0b" : "#ef4444",
          }}
        />
      </Stack>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{
              fill: axisColor,
              fontSize: 11,
              fontWeight: 500,
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Performance"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={isDark ? 0.25 : 0.15}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              background: isDark ? "#27272a" : "#fff",
              border: `1px solid ${isDark ? "#3f3f46" : "#e4e4e7"}`,
              borderRadius: "8px",
              fontSize: "12px",
              color: isDark ? "#fafafa" : "#09090b",
            }}
            formatter={(value: number, _: string, entry: any) => [
              `${Math.round(value)}/100 (${entry.payload.raw})`,
              entry.payload.axis,
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Paper>
  );
}

export function CompanyProfilePanel({ stockCode }: CompanyProfileProps) {
  const theme = useTheme();
  const [financials, setFinancials] = useState<IDXFinancialRatio | null>(null);
  const [directors, setDirectors] = useState<IDXCompanyPerson[]>([]);
  const [commissioners, setCommissioners] = useState<IDXCompanyPerson[]>([]);
  const [secretaries, setSecretaries] = useState<IDXCompanyPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [mgmtTab, setMgmtTab] = useState(0);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [finRes, dirRes, comRes, secRes] = await Promise.all([
        supabase
          .from("idx_financial_ratios")
          .select("*")
          .eq("code", stockCode)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("idx_company_directors")
          .select("*")
          .eq("kode_emiten", stockCode)
          .order("id"),
        supabase
          .from("idx_company_commissioners")
          .select("*")
          .eq("kode_emiten", stockCode)
          .order("id"),
        supabase
          .from("idx_company_secretaries")
          .select("*")
          .eq("kode_emiten", stockCode)
          .order("id"),
      ]);

      if (finRes.data) setFinancials(finRes.data as IDXFinancialRatio);
      if (dirRes.data) setDirectors(dirRes.data as IDXCompanyPerson[]);
      if (comRes.data) setCommissioners(comRes.data as IDXCompanyPerson[]);
      if (secRes.data) setSecretaries(secRes.data as IDXCompanyPerson[]);
      setLoading(false);
    }
    fetchAll();
  }, [stockCode]);

  if (loading) return <CompanyProfileSkeleton />;

  const hasFinancials = !!financials;
  const hasMgmt = directors.length > 0 || commissioners.length > 0 || secretaries.length > 0;

  if (!hasFinancials && !hasMgmt) return null;

  const ratioColor = (val: string | undefined) => {
    if (!val) return "text.primary";
    const n = parseFloat(val);
    if (isNaN(n)) return "text.primary";
    return n >= 0 ? "#22c55e" : "#ef4444";
  };

  const mgmtTabs = [
    { label: "Directors", data: directors, count: directors.length },
    { label: "Commissioners", data: commissioners, count: commissioners.length },
    { label: "Secretaries", data: secretaries, count: secretaries.length },
  ].filter((t) => t.count > 0);

  return (
    <Stack spacing={2}>
      {hasFinancials && financials && (
        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <AccountBalanceIcon
              sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }}
            />
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontWeight: 500 }}
            >
              Company Fundamentals
            </Typography>
            <Chip
              label={financials.sector}
              size="small"
              sx={{
                fontSize: "0.65rem",
                height: 20,
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "rgba(59,130,246,0.15)"
                    : "rgba(59,130,246,0.08)",
                color: "#3b82f6",
                fontWeight: 600,
              }}
            />
            <Chip
              label={financials.sub_sector}
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
            {financials.sharia === "S" && (
              <Chip
                label="Sharia"
                size="small"
                sx={{
                  fontSize: "0.65rem",
                  height: 20,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(34,197,94,0.08)",
                  color: "#22c55e",
                  fontWeight: 600,
                }}
              />
            )}
          </Stack>

          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block",
              mb: 1.5,
              fontSize: "0.68rem",
            }}
          >
            {financials.industry} / {financials.sub_industry} | FS Date:{" "}
            {new Date(financials.fs_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}{" "}
            | FY End: {financials.fiscal_year_end} | Audit:{" "}
            {financials.audit === "U" ? "Unaudited" : "Audited"}
          </Typography>

          <Grid container spacing={1}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem label="P/E Ratio" value={formatRatio(financials.per)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem label="P/BV" value={formatRatio(financials.price_bv)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem label="D/E Ratio" value={formatRatio(financials.de_ratio)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem
                label="ROA"
                value={formatRatio(financials.roa) + "%"}
                color={ratioColor(financials.roa)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem
                label="ROE"
                value={formatRatio(financials.roe) + "%"}
                color={ratioColor(financials.roe)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem
                label="NPM"
                value={formatRatio(financials.npm) + "%"}
                color={ratioColor(financials.npm)}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem label="Assets" value={formatBillion(financials.assets)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem label="Liabilities" value={formatBillion(financials.liabilities)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem label="Equity" value={formatBillion(financials.equity)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem label="Sales" value={formatBillion(financials.sales)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem label="EPS" value={formatRatio(financials.eps)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <MetricItem label="Book Value" value={formatRatio(financials.book_value)} />
            </Grid>
          </Grid>
        </Paper>
      )}

      {hasFinancials && financials && (
        <PerformanceRadar financials={financials} />
      )}

      {hasMgmt && mgmtTabs.length > 0 && (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2.5, pt: 2 }}>
            <GroupsIcon
              sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }}
            />
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontWeight: 500 }}
            >
              Management
            </Typography>
          </Stack>
          <Tabs
            value={mgmtTab}
            onChange={(_, v) => setMgmtTab(v)}
            sx={{
              px: 2.5,
              minHeight: 36,
              "& .MuiTab-root": {
                minHeight: 36,
                py: 0,
                fontSize: "0.8rem",
                textTransform: "none",
                fontWeight: 500,
              },
            }}
          >
            {mgmtTabs.map((t) => (
              <Tab
                key={t.label}
                label={`${t.label} (${t.count})`}
              />
            ))}
          </Tabs>
          <PersonTable people={mgmtTabs[mgmtTab]?.data || []} />
        </Paper>
      )}
    </Stack>
  );
}

function CompanyProfileSkeleton() {
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width={180} height={16} sx={{ mb: 2 }} />
        <Skeleton width={300} height={12} sx={{ mb: 1.5 }} />
        <Grid container spacing={1}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={i}>
              <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Paper>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width={140} height={16} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
      </Paper>
    </Stack>
  );
}
