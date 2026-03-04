"use client";

import { ReactNode } from "react";
import { useTheme } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  accentColor?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  accentColor,
}: StatsCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = accentColor || theme.palette.primary.main;

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2.5,
        height: "100%",
        position: "relative",
        overflow: "hidden",
        transition:
          "border-color 0.25s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "&:hover": {
          borderColor: isDark
            ? "rgba(212,168,67,0.2)"
            : "rgba(161,124,47,0.15)",
          boxShadow: isDark
            ? `0 8px 32px rgba(0,0,0,0.35), 0 0 24px ${accent}12`
            : `0 8px 32px rgba(0,0,0,0.07), 0 0 20px ${accent}08`,
          transform: "translateY(-2px)",
        },
        "&:hover .stats-card-icon": {
          opacity: 0.5,
          transform: "scale(1.15) rotate(-5deg)",
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 12,
          left: 0,
          width: 3,
          height: 24,
          borderRadius: "0 3px 3px 0",
          background: `linear-gradient(180deg, ${accent}, ${accent}44)`,
          boxShadow: `0 0 10px ${accent}30`,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          height: "100%",
          pl: 1,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 60,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: "0.65rem",
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 800,
              mt: 0.25,
              lineHeight: 1.2,
              letterSpacing: "-0.03em",
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                mt: 0.25,
                display: "block",
                fontSize: "0.65rem",
                opacity: 0.7,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            className="stats-card-icon"
            sx={{
              color: accent,
              opacity: 0.25,
              transition:
                "opacity 0.3s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              "& .MuiSvgIcon-root": { fontSize: 28 },
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

export function StatsCardSkeleton() {
  return (
    <Paper sx={{ p: 2, borderRadius: 2.5 }}>
      <Box sx={{ pl: 1 }}>
        <Skeleton width={70} height={12} />
        <Skeleton width={90} height={26} sx={{ mt: 0.25 }} />
        <Skeleton width={50} height={12} sx={{ mt: 0.25 }} />
      </Box>
    </Paper>
  );
}
