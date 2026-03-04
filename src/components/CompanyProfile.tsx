"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import {
  KSEIRecord,
  IDXFinancialRatio,
  IDXCompanyPerson,
  formatBillion,
  formatRatio,
} from "@/lib/types";
import {
  clampScore,
  scoreROE,
  scoreROA,
  scoreNPM,
  scorePE,
  scoreDE,
  scoreOwnership,
  buildRadarData,
  OwnershipMetrics,
} from "@/lib/scoring";
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
            ? "rgba(107,127,163,0.04)"
            : "rgba(12,18,34,0.02)",
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
          fontFamily: '"JetBrains Mono", monospace',
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
                        ? "rgba(251,191,36,0.12)"
                        : "rgba(217,119,6,0.08)"
                      : theme.palette.mode === "dark"
                        ? "rgba(107,127,163,0.06)"
                        : "rgba(12,18,34,0.03)",
                    color: p.afiliasi ? "#fbbf24" : "text.secondary",
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


function computeOwnershipMetrics(records: KSEIRecord[]): OwnershipMetrics {
  if (records.length === 0) {
    return { investorCount: 0, foreignPct: 0, institutionalPct: 0, topHolderPct: 0 };
  }

  const totalPct = records.reduce((s, r) => s + r.PERCENTAGE, 0);
  const foreignPct = records
    .filter((r) => r.LOCAL_FOREIGN === "A")
    .reduce((s, r) => s + r.PERCENTAGE, 0);
  const institutionalTypes = new Set(["MF", "PF", "IS", "IB", "SC"]);
  const institutionalPct = records
    .filter((r) => institutionalTypes.has(r.INVESTOR_TYPE))
    .reduce((s, r) => s + r.PERCENTAGE, 0);
  const topHolderPct = Math.max(...records.map((r) => r.PERCENTAGE), 0);

  const normalizedForeign = totalPct > 0 ? (foreignPct / totalPct) * 100 : 0;
  const normalizedInstitutional = totalPct > 0 ? (institutionalPct / totalPct) * 100 : 0;

  return {
    investorCount: records.length,
    foreignPct: normalizedForeign,
    institutionalPct: normalizedInstitutional,
    topHolderPct,
  };
}

function PerformanceRadar({ financials, ownership }: { financials: IDXFinancialRatio; ownership?: OwnershipMetrics }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const data = buildRadarData(financials, ownership);
  const avg = Math.round(data.reduce((s, d) => s + d.value, 0) / data.length);

  const gridColor = isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.08)";
  const axisColor = isDark ? "#6b7fa3" : "#546280";

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
            fontFamily: '"JetBrains Mono", monospace',
            bgcolor:
              avg >= 60
                ? isDark ? "rgba(52,211,153,0.15)" : "rgba(5,150,105,0.1)"
                : avg >= 35
                  ? isDark ? "rgba(251,191,36,0.15)" : "rgba(217,119,6,0.1)"
                  : isDark ? "rgba(251,113,133,0.15)" : "rgba(225,29,72,0.1)",
            color: avg >= 60 ? "#34d399" : avg >= 35 ? "#fbbf24" : "#fb7185",
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
            stroke="#d4a843"
            fill="#d4a843"
            fillOpacity={isDark ? 0.25 : 0.15}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              background: isDark ? "#111b30" : "#fff",
              border: `1px solid ${isDark ? "rgba(107,127,163,0.15)" : "rgba(12,18,34,0.08)"}`,
              borderRadius: "8px",
              fontSize: "12px",
              color: isDark ? "#e8edf5" : "#0c1222",
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
  const [ownershipMetrics, setOwnershipMetrics] = useState<OwnershipMetrics | undefined>();
  const [loading, setLoading] = useState(true);
  const [mgmtTab, setMgmtTab] = useState(0);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [finRes, dirRes, comRes, secRes, ownRes] = await Promise.all([
        supabase
          .from("idx_financial_ratios")
          .select("*")
          .eq("code", stockCode)
          .order("fs_date", { ascending: false })
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
        supabase
          .from(TABLE_NAME)
          .select("INVESTOR_NAME, INVESTOR_TYPE, LOCAL_FOREIGN, PERCENTAGE")
          .eq("SHARE_CODE", stockCode),
      ]);

      if (finRes.data) setFinancials(finRes.data as IDXFinancialRatio);
      if (dirRes.data) setDirectors(dirRes.data as IDXCompanyPerson[]);
      if (comRes.data) setCommissioners(comRes.data as IDXCompanyPerson[]);
      if (secRes.data) setSecretaries(secRes.data as IDXCompanyPerson[]);
      if (ownRes.data) setOwnershipMetrics(computeOwnershipMetrics(ownRes.data as KSEIRecord[]));
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
    return n >= 0 ? "#34d399" : "#fb7185";
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
                    ? "rgba(212,168,67,0.12)"
                    : "rgba(161,124,47,0.08)",
                color: theme.palette.primary.main,
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
                    ? "rgba(107,127,163,0.06)"
                    : "rgba(12,18,34,0.03)",
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
                      ? "rgba(52,211,153,0.12)"
                      : "rgba(5,150,105,0.08)",
                  color: "#34d399",
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
        <PerformanceRadar financials={financials} ownership={ownershipMetrics} />
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
