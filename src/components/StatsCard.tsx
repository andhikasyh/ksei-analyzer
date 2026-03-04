"use client";

import { ReactNode } from "react";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
}

export function StatsCard({ title, value, subtitle, icon }: StatsCardProps) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          height: "100%",
        }}
      >
        <Box sx={{ flex: 1, minHeight: 72, display: "flex", flexDirection: "column" }}>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontWeight: 500 }}
          >
            {title}
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1.2 }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", mt: 0.5, display: "block" }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box sx={{ color: "text.secondary", opacity: 0.5 }}>{icon}</Box>
        )}
      </Box>
    </Paper>
  );
}

export function StatsCardSkeleton() {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Skeleton width={80} height={14} />
      <Skeleton width={100} height={28} sx={{ mt: 0.5 }} />
      <Skeleton width={60} height={14} sx={{ mt: 0.5 }} />
    </Paper>
  );
}
