"use client";

import Chip from "@mui/material/Chip";
import { INVESTOR_TYPE_MAP, LOCAL_FOREIGN_MAP } from "@/lib/types";

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  CP: { bg: "rgba(56,189,248,0.12)", color: "#38bdf8" },
  ID: { bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
  IB: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
  SC: { bg: "rgba(45,212,191,0.12)", color: "#2dd4bf" },
  MF: { bg: "rgba(52,211,153,0.12)", color: "#34d399" },
  PF: { bg: "rgba(244,114,182,0.12)", color: "#f472b6" },
  IS: { bg: "rgba(129,140,248,0.12)", color: "#818cf8" },
  FD: { bg: "rgba(212,168,67,0.12)", color: "#d4a843" },
};

const DEFAULT_TYPE_COLOR = { bg: "rgba(107,127,163,0.10)", color: "#6b7fa3" };

export function InvestorTypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] || DEFAULT_TYPE_COLOR;
  return (
    <Chip
      label={INVESTOR_TYPE_MAP[type] || type}
      size="small"
      sx={{
        bgcolor: c.bg,
        color: c.color,
        fontWeight: 600,
        fontSize: "0.65rem",
        height: 20,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      }}
    />
  );
}

export function LocalForeignBadge({ type }: { type: string }) {
  const isLocal = type === "L";
  return (
    <Chip
      label={LOCAL_FOREIGN_MAP[type] || type}
      size="small"
      sx={{
        bgcolor: isLocal ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.12)",
        color: isLocal ? "#34d399" : "#fbbf24",
        fontWeight: 600,
        fontSize: "0.65rem",
        height: 20,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      }}
    />
  );
}
