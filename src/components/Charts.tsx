"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

interface ChartData {
  name: string;
  value: number;
}

interface OwnershipPieChartProps {
  data: ChartData[];
  title: string;
}

export function OwnershipPieChart({ data, title }: OwnershipPieChartProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const textColor = theme.palette.text.secondary;

  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Typography
        variant="subtitle2"
        sx={{ color: "text.secondary", mb: 2 }}
      >
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={105}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: isDark ? "#27272a" : "#fff",
              border: `1px solid ${isDark ? "#3f3f46" : "#e4e4e7"}`,
              borderRadius: "8px",
              color: textColor,
              fontSize: "13px",
            }}
            itemStyle={{ color: textColor }}
            labelStyle={{ color: theme.palette.text.primary }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, "Share"]}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value) => (
              <span style={{ color: textColor }}>{value}</span>
            )}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
}

export function ChartSkeleton() {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Skeleton width={128} height={20} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={280} />
    </Paper>
  );
}
