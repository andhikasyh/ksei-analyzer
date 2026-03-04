"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
                      sx={{ color: "text.secondary", fontSize: compact ? 18 : 20, ml: 0.5 }}
                    />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: compact ? 2 : 3,
              bgcolor: "background.paper",
            },
          }}
        />
      )}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            mt: 0.5,
            border: 1,
            borderColor: "divider",
          },
        },
      }}
      freeSolo={false}
      blurOnSelect
      clearOnBlur
    />
  );
}
