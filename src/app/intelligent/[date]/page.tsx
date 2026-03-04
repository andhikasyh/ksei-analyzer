"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { ReportDashboard, SentimentChip } from "@/components/ReportDashboard";
import { MarketChat } from "@/components/MarketChat";
import type { MarketIntelligenceReport } from "@/lib/types";

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const [report, setReport] = useState<MarketIntelligenceReport | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/market-intelligence?date=${encodeURIComponent(date)}`
      );
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setTitle(data.title || data.report.title || null);
        setImageUrl(data.imageUrl || null);
      } else {
        setError("Report not found for this date.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <Stack spacing={2.5}>
        <Skeleton
          variant="rounded"
          height={240}
          sx={{ borderRadius: 3 }}
        />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={180 + i * 30}
            sx={{ borderRadius: 2.5 }}
          />
        ))}
      </Stack>
    );
  }

  if (error || !report) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "40vh",
        }}
      >
        <Paper
          sx={{ p: 4, textAlign: "center", maxWidth: 420, borderRadius: 3 }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700 }}
            gutterBottom
          >
            {error || "Report not found"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            No market intelligence report exists for {dateLabel}.
          </Typography>
          <IconButton onClick={() => router.push("/intelligent")}>
            <ArrowBackIcon />
          </IconButton>
        </Paper>
      </Box>
    );
  }

  const chatContext = {
    reportDate: date,
    reportSummary: `${report.marketOverview.summary} Outlook: ${report.marketOutlook.summary} Sentiment: ${report.marketOutlook.sentiment}.`,
  };

  return (
    <Stack spacing={1.5}>
      <Box className="animate-in">
        <Box
          sx={{
            borderRadius: 2.5,
            overflow: "hidden",
            position: "relative",
            mb: 1.25,
          }}
        >
          {imageUrl ? (
            <Box
              component="img"
              src={imageUrl}
              alt={title || "Market report"}
              loading="eager"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.parentElement?.querySelector(".hero-fallback") as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
              sx={{
                width: "100%",
                height: { xs: 140, md: 200 },
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : null}
          <Box
            className="hero-fallback"
            sx={{
              width: "100%",
              height: { xs: 140, md: 200 },
              background: isDark
                ? "linear-gradient(135deg, rgba(129,140,248,0.1) 0%, rgba(212,168,67,0.06) 100%)"
                : "linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(161,124,47,0.04) 100%)",
              display: imageUrl ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AutoAwesomeIcon
              sx={{
                fontSize: 56,
                color: isDark
                  ? "rgba(129,140,248,0.15)"
                  : "rgba(99,102,241,0.1)",
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
                "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 50%)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
            }}
          >
            <IconButton
              onClick={() => router.push("/intelligent")}
              size="small"
              sx={{
                bgcolor: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(8px)",
                color: "#fff",
                "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <Box
            sx={{
              position: "absolute",
              bottom: 10,
              left: 16,
              right: 16,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                mb: 0.5,
              }}
            >
              <CalendarTodayIcon
                sx={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "0.6rem",
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {dateLabel}
              </Typography>
              <SentimentChip
                sentiment={report.marketOutlook.sentiment}
                size="small"
              />
            </Box>
            <Typography
              sx={{
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 800,
                fontSize: { xs: "1rem", md: "1.25rem" },
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                color: "#fff",
                textShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {title || report.title || `Market Report -- ${dateLabel}`}
            </Typography>
          </Box>
        </Box>
      </Box>

      <ReportDashboard report={report} compact />

      <Box className="animate-in animate-in-delay-8">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            mb: 1,
          }}
        >
          <Box
            sx={{
              width: 3,
              height: 16,
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
                fontSize: "0.88rem",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              Ask About This Report
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.62rem",
                opacity: 0.7,
              }}
            >
              Questions about the {date} market report
            </Typography>
          </Box>
        </Box>
        <MarketChat
          context={chatContext}
          placeholder={`Ask about the ${dateLabel} market report...`}
        />
      </Box>
    </Stack>
  );
}
