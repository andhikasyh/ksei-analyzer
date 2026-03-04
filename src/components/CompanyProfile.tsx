"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import {
  KSEIRecord,
  IDXFinancialRatio,
  IDXCompanyPerson,
  IDXCompany,
  IDXSubsidiary,
  IDXAuditCommittee,
  IDXBond,
  IDXStockSplit,
  IDXCorporateAction,
  formatBillion,
  formatRatio,
  formatShares,
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
import Link from "@mui/material/Link";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import GroupsIcon from "@mui/icons-material/Groups";
import InsightsIcon from "@mui/icons-material/Insights";
import BusinessIcon from "@mui/icons-material/Business";
import LanguageIcon from "@mui/icons-material/Language";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import GavelIcon from "@mui/icons-material/Gavel";
import SplitscreenIcon from "@mui/icons-material/Splitscreen";
import CampaignIcon from "@mui/icons-material/Campaign";

const IDX_LOGO_BASE = "https://www.idx.co.id";

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
  const isDark = theme.palette.mode === "dark";
  const [company, setCompany] = useState<IDXCompany | null>(null);
  const [financials, setFinancials] = useState<IDXFinancialRatio | null>(null);
  const [directors, setDirectors] = useState<IDXCompanyPerson[]>([]);
  const [commissioners, setCommissioners] = useState<IDXCompanyPerson[]>([]);
  const [secretaries, setSecretaries] = useState<IDXCompanyPerson[]>([]);
  const [ownershipMetrics, setOwnershipMetrics] = useState<OwnershipMetrics | undefined>();
  const [subsidiaries, setSubsidiaries] = useState<IDXSubsidiary[]>([]);
  const [auditCommittee, setAuditCommittee] = useState<IDXAuditCommittee[]>([]);
  const [bonds, setBonds] = useState<IDXBond[]>([]);
  const [stockSplits, setStockSplits] = useState<IDXStockSplit[]>([]);
  const [corpActions, setCorpActions] = useState<IDXCorporateAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mgmtTab, setMgmtTab] = useState(0);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [companyRes, finRes, dirRes, comRes, secRes, ownRes, subRes, auditRes, bondRes, splitRes, caRes] = await Promise.all([
        supabase
          .from("idx_companies")
          .select("*")
          .eq("kode_emiten", stockCode)
          .maybeSingle(),
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
        supabase
          .from("idx_subsidiaries")
          .select("*")
          .eq("kode_emiten", stockCode)
          .order("jumlah_aset", { ascending: false }),
        supabase
          .from("idx_audit_committee")
          .select("*")
          .eq("kode_emiten", stockCode)
          .order("id"),
        supabase
          .from("idx_bonds")
          .select("*")
          .eq("kode_emiten", stockCode)
          .order("listing_date", { ascending: false }),
        supabase
          .from("idx_stock_splits")
          .select("*")
          .eq("code", stockCode)
          .order("listing_date", { ascending: false }),
        supabase
          .from("idx_corporate_actions")
          .select("*")
          .eq("code", stockCode)
          .order("start_date", { ascending: false }),
      ]);

      if (companyRes.data) setCompany(companyRes.data as IDXCompany);
      if (finRes.data) setFinancials(finRes.data as IDXFinancialRatio);
      if (dirRes.data) setDirectors(dirRes.data as IDXCompanyPerson[]);
      if (comRes.data) setCommissioners(comRes.data as IDXCompanyPerson[]);
      if (secRes.data) setSecretaries(secRes.data as IDXCompanyPerson[]);
      if (ownRes.data) setOwnershipMetrics(computeOwnershipMetrics(ownRes.data as KSEIRecord[]));
      if (subRes.data) setSubsidiaries(subRes.data as IDXSubsidiary[]);
      if (auditRes.data) setAuditCommittee(auditRes.data as IDXAuditCommittee[]);
      if (bondRes.data) setBonds(bondRes.data as IDXBond[]);
      if (splitRes.data) setStockSplits(splitRes.data as IDXStockSplit[]);
      if (caRes.data) setCorpActions(caRes.data as IDXCorporateAction[]);
      setLoading(false);
    }
    fetchAll();
  }, [stockCode]);

  if (loading) return <CompanyProfileSkeleton />;

  const hasCompany = !!company;
  const hasFinancials = !!financials;
  const hasMgmt = directors.length > 0 || commissioners.length > 0 || secretaries.length > 0 || auditCommittee.length > 0;

  const hasExtras = subsidiaries.length > 0 || bonds.length > 0 || stockSplits.length > 0 || corpActions.length > 0;

  if (!hasCompany && !hasFinancials && !hasMgmt && !hasExtras) {
    return (
      <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
        <AccountBalanceIcon sx={{ fontSize: 28, color: "text.secondary", opacity: 0.4, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          No company fundamental data available for this stock.
        </Typography>
      </Paper>
    );
  }

  const logoUrl = company?.logo ? `${IDX_LOGO_BASE}${company.logo}` : null;
  const websiteUrl = company?.website
    ? company.website.startsWith("http") ? company.website : `https://${company.website}`
    : null;
  const listingDate = company?.tanggal_pencatatan
    ? new Date(company.tanggal_pencatatan).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : null;
  const boardColor = (board: string) => {
    if (board === "Utama") return { bg: isDark ? "rgba(52,211,153,0.12)" : "rgba(5,150,105,0.08)", text: "#34d399" };
    if (board === "Pengembangan") return { bg: isDark ? "rgba(96,165,250,0.12)" : "rgba(59,130,246,0.08)", text: isDark ? "#60a5fa" : "#3b82f6" };
    return { bg: isDark ? "rgba(251,113,133,0.12)" : "rgba(225,29,72,0.08)", text: "#fb7185" };
  };

  const ratioColor = (val: string | undefined) => {
    if (!val) return "text.primary";
    const n = parseFloat(val);
    if (isNaN(n)) return "text.primary";
    return n >= 0 ? "#34d399" : "#fb7185";
  };

  const auditAsPersons = auditCommittee.map((a) => ({
    id: a.id,
    kode_emiten: a.kode_emiten,
    nama: a.nama,
    jabatan: a.jabatan,
    afiliasi: false,
    created_at: a.created_at,
  })) as IDXCompanyPerson[];

  const mgmtTabs = [
    { label: "Directors", data: directors, count: directors.length },
    { label: "Commissioners", data: commissioners, count: commissioners.length },
    { label: "Audit Committee", data: auditAsPersons, count: auditCommittee.length },
    { label: "Secretaries", data: secretaries, count: secretaries.length },
  ].filter((t) => t.count > 0);

  return (
    <Stack spacing={2}>
      {hasCompany && company && (
        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            {logoUrl && (
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2,
                  overflow: "hidden",
                  flexShrink: 0,
                  bgcolor: "#fff",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  component="img"
                  src={logoUrl}
                  alt={company.kode_emiten}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    p: 0.5,
                  }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </Box>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {company.nama_emiten}
                </Typography>
                <Chip
                  label={company.papan_pencatatan}
                  size="small"
                  sx={{
                    fontSize: "0.6rem",
                    height: 18,
                    fontWeight: 600,
                    bgcolor: boardColor(company.papan_pencatatan).bg,
                    color: boardColor(company.papan_pencatatan).text,
                  }}
                />
                {company.efek_obligasi && (
                  <Chip label="Bonds" size="small" sx={{ fontSize: "0.6rem", height: 18, bgcolor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)" }} />
                )}
              </Stack>

              <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                <Chip label={company.sektor} size="small" sx={{ fontSize: "0.6rem", height: 18, bgcolor: isDark ? "rgba(212,168,67,0.12)" : "rgba(161,124,47,0.08)", color: theme.palette.primary.main, fontWeight: 600 }} />
                <Chip label={company.sub_sektor} size="small" sx={{ fontSize: "0.6rem", height: 18, bgcolor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.03)" }} />
                {company.industri !== company.sub_sektor && (
                  <Chip label={company.industri} size="small" sx={{ fontSize: "0.6rem", height: 18, bgcolor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.03)" }} />
                )}
              </Stack>

              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1, lineHeight: 1.5, fontSize: "0.72rem" }}>
                {company.kegiatan_usaha_utama}
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 0.75,
                }}
              >
                {company.alamat && (
                  <Stack direction="row" spacing={0.75} alignItems="flex-start">
                    <BusinessIcon sx={{ fontSize: 13, color: "text.disabled", mt: 0.25 }} />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", lineHeight: 1.4 }}>
                      {company.alamat.replace(/\r?\n/g, ", ").replace(/\s+/g, " ").trim()}
                    </Typography>
                  </Stack>
                )}
                {websiteUrl && (
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <LanguageIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                    <Link href={websiteUrl} target="_blank" rel="noopener" underline="hover" sx={{ fontSize: "0.68rem", color: isDark ? "#60a5fa" : "#3b82f6" }}>
                      {company.website}
                    </Link>
                  </Stack>
                )}
                {company.email && (
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <EmailIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                      {company.email}
                    </Typography>
                  </Stack>
                )}
                {company.telepon && (
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <PhoneIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                      {company.telepon}
                    </Typography>
                  </Stack>
                )}
              </Box>

              {listingDate && (
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.75 }}>
                  <CalendarTodayIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                    Listed since {listingDate}
                  </Typography>
                  {company.bae && (
                    <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.62rem" }}>
                      | Registrar: {company.bae}
                    </Typography>
                  )}
                </Stack>
              )}
            </Box>
          </Stack>
        </Paper>
      )}

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
            {!hasCompany && (
              <>
                <Chip
                  label={financials.sector}
                  size="small"
                  sx={{
                    fontSize: "0.65rem",
                    height: 20,
                    bgcolor: isDark ? "rgba(212,168,67,0.12)" : "rgba(161,124,47,0.08)",
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
                    bgcolor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.03)",
                  }}
                />
              </>
            )}
            {financials.sharia === "S" && (
              <Chip
                label="Sharia"
                size="small"
                sx={{
                  fontSize: "0.65rem",
                  height: 20,
                  bgcolor: isDark ? "rgba(52,211,153,0.12)" : "rgba(5,150,105,0.08)",
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

      {subsidiaries.length > 0 && (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2.5, pt: 2, pb: 1 }}>
            <AccountTreeIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Subsidiaries
            </Typography>
            <Chip label={`${subsidiaries.length}`} size="small" sx={{ fontSize: "0.65rem", height: 18, fontFamily: '"JetBrains Mono", monospace' }} />
          </Stack>
          <TableContainer sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Business</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">Ownership</TableCell>
                  <TableCell align="right">Assets</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subsidiaries.map((s) => (
                  <TableRow key={s.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.nama}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: "text.secondary", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {s.bidang_usaha}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{s.lokasi}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                        {parseFloat(s.persentase).toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap" }}>
                        {formatShares(s.jumlah_aset)} {s.mata_uang}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={s.status_operasi}
                        size="small"
                        sx={{
                          fontSize: "0.58rem",
                          height: 16,
                          fontWeight: 600,
                          bgcolor: s.status_operasi === "Aktif"
                            ? isDark ? "rgba(52,211,153,0.12)" : "rgba(5,150,105,0.08)"
                            : isDark ? "rgba(251,113,133,0.12)" : "rgba(225,29,72,0.08)",
                          color: s.status_operasi === "Aktif" ? "#34d399" : "#fb7185",
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {bonds.length > 0 && (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2.5, pt: 2, pb: 1 }}>
            <GavelIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Bonds & Sukuk
            </Typography>
            <Chip label={`${bonds.length}`} size="small" sx={{ fontSize: "0.65rem", height: 18, fontFamily: '"JetBrains Mono", monospace' }} />
          </Stack>
          <TableContainer sx={{ maxHeight: 320 }}>
            <Table size="small" stickyHeader sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell align="right">Nominal (Rp)</TableCell>
                  <TableCell>Margin</TableCell>
                  <TableCell>Listed</TableCell>
                  <TableCell>Maturity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bonds.map((b) => (
                  <TableRow key={b.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {b.nama_emisi}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={b.rating}
                        size="small"
                        sx={{
                          fontSize: "0.58rem",
                          height: 16,
                          fontWeight: 700,
                          fontFamily: '"JetBrains Mono", monospace',
                          bgcolor: b.rating.startsWith("AAA")
                            ? isDark ? "rgba(52,211,153,0.12)" : "rgba(5,150,105,0.08)"
                            : b.rating.startsWith("AA")
                              ? isDark ? "rgba(96,165,250,0.12)" : "rgba(59,130,246,0.08)"
                              : isDark ? "rgba(251,191,36,0.12)" : "rgba(217,119,6,0.08)",
                          color: b.rating.startsWith("AAA") ? "#34d399" : b.rating.startsWith("AA") ? (isDark ? "#60a5fa" : "#3b82f6") : "#fbbf24",
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap" }}>
                        {formatShares(b.nominal)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                        {b.margin}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap" }}>
                        {new Date(b.listing_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap", color: new Date(b.mature_date) < new Date() ? "#fb7185" : "text.secondary" }}>
                        {new Date(b.mature_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {stockSplits.length > 0 && (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2.5, pt: 2, pb: 1 }}>
            <SplitscreenIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Stock Splits & Reverse Splits
            </Typography>
          </Stack>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table size="small" stickyHeader sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Ratio</TableCell>
                  <TableCell align="right">Old Nominal (Rp)</TableCell>
                  <TableCell align="right">New Nominal (Rp)</TableCell>
                  <TableCell align="right">Listed Shares</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stockSplits.map((s) => (
                  <TableRow key={s.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap" }}>
                        {new Date(s.listing_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={s.ssrs === "SS" ? "Stock Split" : "Reverse Split"}
                        size="small"
                        sx={{
                          fontSize: "0.58rem",
                          height: 16,
                          fontWeight: 600,
                          bgcolor: s.ssrs === "SS"
                            ? isDark ? "rgba(52,211,153,0.12)" : "rgba(5,150,105,0.08)"
                            : isDark ? "rgba(251,191,36,0.12)" : "rgba(217,119,6,0.08)",
                          color: s.ssrs === "SS" ? "#34d399" : "#fbbf24",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                        {s.ratio}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {formatRatio(s.nominal_value)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                        {formatRatio(s.nominal_value_new)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {formatShares(s.listed_shares)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {corpActions.length > 0 && (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2.5, pt: 2, pb: 1 }}>
            <CampaignIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Corporate Actions
            </Typography>
            <Chip label={`${corpActions.length}`} size="small" sx={{ fontSize: "0.65rem", height: 18, fontFamily: '"JetBrains Mono", monospace' }} />
          </Stack>
          <TableContainer sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Action</TableCell>
                  <TableCell>Detail</TableCell>
                  <TableCell align="right">Shares</TableCell>
                  <TableCell>Start</TableCell>
                  <TableCell>End</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {corpActions.map((ca) => (
                  <TableRow key={ca.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                    <TableCell>
                      <Chip
                        label={ca.action_type}
                        size="small"
                        sx={{
                          fontSize: "0.58rem",
                          height: 16,
                          fontWeight: 600,
                          bgcolor: isDark ? "rgba(107,127,163,0.08)" : "rgba(12,18,34,0.04)",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: "text.secondary", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {ca.action_type_raw}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {formatShares(ca.num_of_shares)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap" }}>
                        {new Date(ca.start_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap", color: "text.secondary" }}>
                        {new Date(ca.last_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
