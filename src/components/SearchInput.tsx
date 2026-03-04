"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import { KSEIRecord } from "@/lib/types";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Autocomplete from "@mui/material/Autocomplete";
import SearchIcon from "@mui/icons-material/Search";

interface SearchOption {
  label: string;
  type: "ticker" | "investor";
}

export function GlobalSearch({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    async function load() {
      const { data } = await supabase
        .from(TABLE_NAME)
        .select("SHARE_CODE, INVESTOR_NAME");
      if (!data) return;
      const typed = data as Pick<KSEIRecord, "SHARE_CODE" | "INVESTOR_NAME">[];
      const tickers = [...new Set(typed.map((r) => r.SHARE_CODE))];
      const investors = [...new Set(typed.map((r) => r.INVESTOR_NAME))];
      setOptions([
        ...tickers.map((t) => ({ label: t, type: "ticker" as const })),
        ...investors.map((n) => ({ label: n, type: "investor" as const })),
      ]);
      setLoaded(true);
    }
    load();
  }, [loaded]);

  return (
    <Autocomplete
      options={options}
      groupBy={(o) => (o.type === "ticker" ? "Tickers" : "Investors")}
      getOptionLabel={(o) => o.label}
      onChange={(_, value) => {
        if (!value) return;
        if (value.type === "ticker") router.push(`/stock/${value.label}`);
        else router.push(`/investor/${encodeURIComponent(value.label)}`);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search ticker or investor..."
          size={compact ? "small" : "medium"}
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{
                        color: "primary.main",
                        fontSize: compact ? 16 : 18,
                        ml: 0.5,
                        opacity: 0.6,
                      }}
                    />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: compact ? 2 : 2.5,
              bgcolor: isDark
                ? "rgba(13,20,37,0.8)"
                : "background.paper",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              fontSize: compact ? "0.82rem" : "0.88rem",
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: isDark
                  ? "rgba(17,27,48,0.9)"
                  : "background.paper",
              },
              "&.Mui-focused": {
                bgcolor: isDark
                  ? "rgba(17,27,48,1)"
                  : "background.paper",
                boxShadow: isDark
                  ? "0 0 0 2px rgba(212,168,67,0.15)"
                  : "0 0 0 2px rgba(161,124,47,0.1)",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: isDark
                  ? "rgba(107,127,163,0.12)"
                  : "rgba(12,18,34,0.08)",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: isDark
                  ? "rgba(212,168,67,0.25)"
                  : "rgba(161,124,47,0.2)",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "primary.main",
                borderWidth: 1,
              },
            },
          }}
        />
      )}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2.5,
            mt: 0.5,
          },
        },
      }}
      freeSolo={false}
      blurOnSelect
      clearOnBlur
    />
  );
}
