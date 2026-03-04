"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { SentimentChip } from "@/components/ReportDashboard";
import { MarketChat } from "@/components/MarketChat";
import type { MarketIntelligenceListItem } from "@/lib/types";

function ReportCard({ item }: { item: MarketIntelligenceListItem }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();

  const dateLabel = new Date(item.report_date + "T00:00:00").toLocaleDateString(
    "en-GB",
    { weekday: "short", day: "2-digit", month: "short", year: "numeric" }
  );

  return (
    <Paper
      onClick={() => router.push(`/intelligent/${item.report_date}`)}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        cursor: "pointer",
        transition:
          "border-color 0.25s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "&:hover": {
          borderColor: isDark
            ? "rgba(212,168,67,0.2)"
            : "rgba(161,124,47,0.15)",
          boxShadow: isDark
            ? "0 12px 40px rgba(0,0,0,0.4)"
            : "0 12px 40px rgba(0,0,0,0.08)",
          transform: "translateY(-3px)",
          "& .report-card-image": {
            transform: "scale(1.05)",
          },
          "& .report-card-arrow": {
            opacity: 1,
            transform: "translateX(0)",
          },
        },
      }}
    >
      <Box
        sx={{
          height: 160,
          overflow: "hidden",
          position: "relative",
          bgcolor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.03)",
        }}
      >
        {item.image_url ? (
          <Box
            component="img"
            className="report-card-image"
            src={item.image_url}
            alt={item.title || "Market report"}
            loading="lazy"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget.parentElement?.querySelector(
                ".report-card-fallback"
              ) as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        ) : null}
        <Box
          className="report-card-fallback"
          sx={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            background: isDark
              ? "linear-gradient(135deg, rgba(129,140,248,0.12) 0%, rgba(212,168,67,0.08) 100%)"
              : "linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(161,124,47,0.05) 100%)",
            display: item.image_url ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 0,
          }}
        >
          <AutoAwesomeIcon
            sx={{
              fontSize: 40,
              color: isDark
                ? "rgba(129,140,248,0.2)"
                : "rgba(99,102,241,0.15)",
            }}
          />
        </Box>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 60%)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: 12,
            display: "flex",
            gap: 0.75,
            alignItems: "center",
          }}
        >
          <SentimentChip sentiment={item.sentiment} />
        </Box>
      </Box>

      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            mb: 0.75,
          }}
        >
          <CalendarTodayIcon
            sx={{ fontSize: 12, color: "text.secondary", opacity: 0.6 }}
          />
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.6rem",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 500,
            }}
          >
            {dateLabel}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 700,
            fontSize: "0.92rem",
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
            mb: 0.75,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.title || `Market Report -- ${dateLabel}`}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: isDark ? "rgba(220,225,235,0.75)" : "rgba(12,18,34,0.6)",
            fontSize: "0.75rem",
            lineHeight: 1.6,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.summary}
        </Typography>

        <Box
          className="report-card-arrow"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mt: 1.5,
            opacity: 0.5,
            transform: "translateX(-4px)",
            transition: "all 0.25s ease",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "primary.main",
            }}
          >
            Read full report
          </Typography>
          <ArrowForwardIcon sx={{ fontSize: 12, color: "primary.main" }} />
        </Box>
      </Box>
    </Paper>
  );
}

export default function IntelligentPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [reports, setReports] = useState<MarketIntelligenceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/market-intelligence?list=true&limit=20");
      const data = await res.json();
      if (data.items) {
        setReports(data.items);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch reports"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <Stack spacing={3}>
      <Box
        className="animate-in"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "10px",
            background: isDark
              ? "linear-gradient(135deg, rgba(129,140,248,0.15), rgba(212,168,67,0.1))"
              : "linear-gradient(135deg, rgba(129,140,248,0.12), rgba(161,124,47,0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 18, color: "#818cf8" }} />
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 800,
              fontSize: "1.1rem",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Market Intelligence
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.65rem",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}
          >
            AI-powered daily market analysis, generated automatically every
            trading day
          </Typography>
        </Box>
      </Box>

      {error && (
        <Paper sx={{ p: 2, borderRadius: 2.5, textAlign: "center" }}>
          <Typography
            sx={{
              color: "#f87171",
              fontWeight: 600,
              fontSize: "0.82rem",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}
          >
            {error}
          </Typography>
        </Paper>
      )}

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
              <Skeleton
                variant="rounded"
                height={300}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : reports.length === 0 ? (
        <Paper
          className="animate-in animate-in-delay-1"
          sx={{ p: 2.5, borderRadius: 2.5, textAlign: "center" }}
        >
          <AutoAwesomeIcon
            sx={{
              fontSize: 48,
              color: isDark
                ? "rgba(129,140,248,0.25)"
                : "rgba(129,140,248,0.2)",
              mb: 2,
            }}
          />
          <Typography
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 700,
              fontSize: "1rem",
              mb: 0.5,
            }}
          >
            No reports yet
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: isDark ? "rgba(220,225,235,0.7)" : "rgba(12,18,34,0.55)",
              fontSize: "0.8rem",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              maxWidth: 400,
              mx: "auto",
            }}
          >
            Reports are generated automatically every trading day after the
            market closes. Check back after 5 PM WIB.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2} className="animate-in animate-in-delay-1">
          {reports.map((item) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={item.id}>
              <ReportCard item={item} />
            </Grid>
          ))}
        </Grid>
      )}

      <Box className="animate-in animate-in-delay-2">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <Box
            sx={{
              width: 3,
              height: 20,
              borderRadius: 2,
              background:
                "linear-gradient(180deg, #818cf8, rgba(129,140,248,0.3))",
              flexShrink: 0,
              boxShadow: "0 0 10px rgba(129,140,248,0.2)",
            }}
          />
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 700,
                fontSize: "0.95rem",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              Ask About the Market
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.65rem",
                opacity: 0.7,
              }}
            >
              Free-form questions about Indonesian stocks and market
            </Typography>
          </Box>
        </Box>
        <MarketChat placeholder="Ask anything about the Indonesian stock market..." />
      </Box>
    </Stack>
  );
}
