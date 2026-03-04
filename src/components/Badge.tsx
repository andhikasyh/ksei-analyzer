"use client";

import Chip from "@mui/material/Chip";
import { INVESTOR_TYPE_MAP, LOCAL_FOREIGN_MAP } from "@/lib/types";

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  CP: { bg: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  ID: { bg: "rgba(139,92,246,0.12)", color: "#a78bfa" },
  IB: { bg: "rgba(245,158,11,0.12)", color: "#fbbf24" },
  SC: { bg: "rgba(6,182,212,0.12)", color: "#22d3ee" },
  MF: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  PF: { bg: "rgba(236,72,153,0.12)", color: "#f472b6" },
  IS: { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
  FD: { bg: "rgba(20,184,166,0.12)", color: "#2dd4bf" },
};

const DEFAULT_TYPE_COLOR = { bg: "rgba(161,161,170,0.12)", color: "#a1a1aa" };

export function InvestorTypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] || DEFAULT_TYPE_COLOR;
  return (
    <Chip
      label={INVESTOR_TYPE_MAP[type] || type}
      size="small"
      sx={{
        bgcolor: c.bg,
        color: c.color,
        fontWeight: 500,
        fontSize: "0.7rem",
        height: 22,
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
        bgcolor: isLocal ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
        color: isLocal ? "#4ade80" : "#fbbf24",
        fontWeight: 500,
        fontSize: "0.7rem",
        height: 22,
      }}
    />
  );
}
