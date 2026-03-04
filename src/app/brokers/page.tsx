"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import { IDXBroker } from "@/lib/types";
import { GlobalSearch } from "@/components/SearchInput";
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
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { StatsCard } from "@/components/StatsCard";

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

export default function BrokersPage() {
  const router = useRouter();
  const theme = useTheme();
  const [brokers, setBrokers] = useState<IDXBroker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("All");

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from("idx_brokers")
        .select("*")
        .order("name");
      if (!error && data) setBrokers(data as IDXBroker[]);
      setLoading(false);
    }
    fetch();
  }, []);

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

  const stats = useMemo(() => {
    const byLicense: Record<string, number> = {};
    brokers.forEach((b) => {
      byLicense[b.license] = (byLicense[b.license] || 0) + 1;
    });
    return {
      total: brokers.length,
      underwriterBroker: byLicense["Penjamin Emisi Efek, Perantara Pedagang Efek"] || 0,
      brokerOnly: byLicense["Perantara Pedagang Efek"] || 0,
    };
  }, [brokers]);

  if (loading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3 }} />
        <Grid container spacing={2}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Grid size={{ xs: 12, sm: 4 }} key={i}>
              <Skeleton variant="rounded" height={80} sx={{ borderRadius: 3 }} />
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
          Broker Directory
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          Licensed securities firms on the Indonesia Stock Exchange
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatsCard
            title="Total Brokers"
            value={stats.total}
            subtitle="Registered firms"
            icon={<StorefrontIcon />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatsCard
            title="Underwriter + Broker"
            value={stats.underwriterBroker}
            subtitle="Dual-licensed"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatsCard
            title="Broker-Dealer Only"
            value={stats.brokerOnly}
            subtitle="Trading only"
          />
        </Grid>
      </Grid>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
        <TextField
          size="small"
          placeholder="Search by code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
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
          <FilterListIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <Select
              value={licenseFilter}
              onChange={(e) => setLicenseFilter(e.target.value)}
              sx={{ borderRadius: 2, fontSize: "0.85rem" }}
            >
              {licenseTypes.map((l) => (
                <MenuItem key={l} value={l} sx={{ fontSize: "0.85rem" }}>
                  {l === "All" ? "All Licenses" : LICENSE_LABELS[l]?.short || l}
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
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={broker.code}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  transition: "border-color 0.15s ease, background-color 0.15s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(59,130,246,0.04)"
                        : "rgba(59,130,246,0.02)",
                  },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
                    sx={{ fontSize: 16, color: "text.secondary", opacity: 0.3 }}
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
                <Chip
                  label={lic?.short || broker.license}
                  size="small"
                  sx={{
                    alignSelf: "flex-start",
                    fontSize: "0.65rem",
                    height: 20,
                    bgcolor: lic
                      ? `${lic.color}18`
                      : theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    color: lic?.color || "text.secondary",
                    fontWeight: 600,
                  }}
                />
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
  );
}
