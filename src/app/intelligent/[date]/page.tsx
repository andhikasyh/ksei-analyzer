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
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LockIcon from "@mui/icons-material/Lock";
import TranslateIcon from "@mui/icons-material/Translate";
import DownloadIcon from "@mui/icons-material/Download";
import { ReportDashboard, SentimentChip } from "@/components/ReportDashboard";
import { MarketChat } from "@/components/MarketChat";
import { ProPaywallModal } from "@/components/ProPaywallModal";
import { useProContext } from "@/lib/pro-context";
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
  const { user, isPro, loading: proLoading, chatTries, consumeChatTry } = useProContext();
  const [report, setReport] = useState<MarketIntelligenceReport | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oldestDate, setOldestDate] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "id">("en");

  const chatLocked = !isPro && (user !== null || chatTries >= 1);
  const handleChatAttempt = useCallback(() => {
    if (isPro) return false;
    if (!user && chatTries < 1) {
      const ok = consumeChatTry();
      return !ok;
    }
    setPaywallOpen(true);
    return true;
  }, [isPro, user, chatTries, consumeChatTry]);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [reportRes, oldestRes] = await Promise.all([
        fetch(`/api/market-intelligence?date=${encodeURIComponent(date)}`),
        fetch("/api/market-intelligence?oldest=true"),
      ]);
      const data = await reportRes.json();
      if (data.report) {
        setReport(data.report);
        setTitle(data.title || data.report.title || null);
        setImageUrl(data.imageUrl || null);
      } else {
        setError("Report not found for this date.");
      }
      const oldestData = await oldestRes.json();
      if (oldestData.oldest) setOldestDate(oldestData.oldest);
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

  if (loading || proLoading) {
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

  const isFreeReport = oldestDate !== null && date === oldestDate;

  if (!isPro && !isFreeReport) {
    const accent = isDark ? "#d4a843" : "#a17c2f";
    return (
      <Stack spacing={2.5}>
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
                sx={{
                  width: "100%",
                  height: { xs: 140, md: 200 },
                  objectFit: "cover",
                  display: "block",
                  filter: "blur(6px) brightness(0.5)",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: { xs: 140, md: 200 },
                  background: isDark
                    ? "linear-gradient(135deg, rgba(129,140,248,0.1) 0%, rgba(212,168,67,0.06) 100%)"
                    : "linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(161,124,47,0.04) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AutoAwesomeIcon
                  sx={{
                    fontSize: 56,
                    color: isDark ? "rgba(129,140,248,0.15)" : "rgba(99,102,241,0.1)",
                  }}
                />
              </Box>
            )}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <LockIcon sx={{ fontSize: 32, color: accent }} />
              <Typography
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: "#fff",
                  letterSpacing: "-0.02em",
                  textAlign: "center",
                }}
              >
                Konten Pro
              </Typography>
            </Box>
            <Box sx={{ position: "absolute", top: 12, left: 12 }}>
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
          </Box>
        </Box>

        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            textAlign: "center",
            background: isDark
              ? "linear-gradient(135deg, rgba(212,168,67,0.06) 0%, rgba(129,140,248,0.05) 100%)"
              : "linear-gradient(135deg, rgba(161,124,47,0.05) 0%, rgba(129,140,248,0.04) 100%)",
            border: `1px solid ${isDark ? "rgba(212,168,67,0.18)" : "rgba(161,124,47,0.14)"}`,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 36, color: accent, mb: 1.5 }} />
          <Typography
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 800,
              fontSize: "1.05rem",
              letterSpacing: "-0.02em",
              mb: 0.75,
            }}
          >
            {title || `Market Report — ${dateLabel}`}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.78rem",
              color: "text.secondary",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              lineHeight: 1.6,
              mb: 2,
              maxWidth: 400,
              mx: "auto",
            }}
          >
            Laporan ini hanya tersedia untuk Pro member. Aktifkan Pro untuk membaca analisis lengkap pasar harian, foreign flow, prediksi harga, dan lebih banyak lagi.
          </Typography>

          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={() => setPaywallOpen(true)}
              sx={{
                background: isDark
                  ? "linear-gradient(135deg, #d4a843, #e8c468)"
                  : "linear-gradient(135deg, #a17c2f, #c49a3a)",
                color: "#060a14",
                fontWeight: 800,
                fontSize: "0.82rem",
                borderRadius: "12px",
                px: 2.5,
                py: 0.9,
                boxShadow: isDark ? "0 4px 16px rgba(212,168,67,0.2)" : "0 4px 16px rgba(161,124,47,0.15)",
                fontFamily: '"Outfit", sans-serif',
                "&:hover": {
                  boxShadow: isDark ? "0 6px 24px rgba(212,168,67,0.3)" : "0 6px 24px rgba(161,124,47,0.25)",
                },
              }}
            >
              {user ? "Aktifkan Pro — Rp99.000/bln" : "Masuk & Aktifkan Pro"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => router.push("/intelligent")}
              sx={{
                borderColor: isDark ? "rgba(107,127,163,0.2)" : "rgba(12,18,34,0.12)",
                color: "text.secondary",
                fontSize: "0.78rem",
                borderRadius: "12px",
                px: 2,
                "&:hover": { borderColor: accent, color: "text.primary" },
              }}
            >
              Kembali
            </Button>
          </Box>
        </Paper>

        <ProPaywallModal
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          initialMode={user ? "pro" : "login"}
          reason="insight"
        />
      </Stack>
    );
  }

  const hasIndonesian = Boolean(report._indonesian);
  const activeReport = lang === "id" && report._indonesian
    ? (report._indonesian as MarketIntelligenceReport)
    : report;

  const chatContext = {
    reportDate: date,
    reportSummary: `${activeReport.marketOverview.summary} Outlook: ${activeReport.marketOutlook.summary} Sentiment: ${activeReport.marketOutlook.sentiment}.`,
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
              {(lang === "id" && activeReport.title) || title || report.title || `Market Report -- ${dateLabel}`}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        className="animate-in animate-in-delay-2"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 0.5,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        {hasIndonesian ? (
          <ToggleButtonGroup
            value={lang}
            exclusive
            onChange={(_, v) => { if (v) setLang(v); }}
            size="small"
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              borderRadius: "10px",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              overflow: "hidden",
              "& .MuiToggleButton-root": {
                border: "none",
                borderRadius: "8px !important",
                px: 1.5,
                py: 0.4,
                fontSize: "0.7rem",
                fontWeight: 700,
                fontFamily: '"Outfit", sans-serif',
                letterSpacing: "0.02em",
                textTransform: "none",
                color: "text.secondary",
                transition: "all 0.2s ease",
                "&.Mui-selected": {
                  bgcolor: isDark ? "rgba(129,140,248,0.15)" : "rgba(99,102,241,0.1)",
                  color: isDark ? "#a5b4fc" : "#6366f1",
                  "&:hover": {
                    bgcolor: isDark ? "rgba(129,140,248,0.2)" : "rgba(99,102,241,0.15)",
                  },
                },
              },
            }}
          >
            <ToggleButton value="en" disableRipple>
              <TranslateIcon sx={{ fontSize: 14, mr: 0.5 }} />
              English
            </ToggleButton>
            <ToggleButton value="id" disableRipple>
              <TranslateIcon sx={{ fontSize: 14, mr: 0.5 }} />
              Bahasa
            </ToggleButton>
          </ToggleButtonGroup>
        ) : <Box />}

        <Box sx={{ display: "flex", gap: 0.75 }}>
          <Button
            size="small"
            variant="outlined"
            href={`/api/market-intelligence/pdf?date=${encodeURIComponent(date)}&lang=en`}
            target="_blank"
            startIcon={<DownloadIcon sx={{ fontSize: "14px !important" }} />}
            sx={{
              fontSize: "0.68rem",
              fontWeight: 700,
              fontFamily: '"Outfit", sans-serif',
              textTransform: "none",
              borderRadius: "10px",
              px: 1.5,
              py: 0.3,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              color: "text.secondary",
              "&:hover": {
                borderColor: isDark ? "#a5b4fc" : "#6366f1",
                color: isDark ? "#a5b4fc" : "#6366f1",
                bgcolor: isDark ? "rgba(129,140,248,0.08)" : "rgba(99,102,241,0.05)",
              },
            }}
          >
            PDF (EN)
          </Button>
          {hasIndonesian && (
            <Button
              size="small"
              variant="outlined"
              href={`/api/market-intelligence/pdf?date=${encodeURIComponent(date)}&lang=id`}
              target="_blank"
              startIcon={<DownloadIcon sx={{ fontSize: "14px !important" }} />}
              sx={{
                fontSize: "0.68rem",
                fontWeight: 700,
                fontFamily: '"Outfit", sans-serif',
                textTransform: "none",
                borderRadius: "10px",
                px: 1.5,
                py: 0.3,
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                color: "text.secondary",
                "&:hover": {
                  borderColor: isDark ? "#a5b4fc" : "#6366f1",
                  color: isDark ? "#a5b4fc" : "#6366f1",
                  bgcolor: isDark ? "rgba(129,140,248,0.08)" : "rgba(99,102,241,0.05)",
                },
              }}
            >
              PDF (ID)
            </Button>
          )}
        </Box>
      </Box>

      <ReportDashboard report={activeReport} compact />

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
          locked={chatLocked}
          onLockedAttempt={handleChatAttempt}
        />
      </Box>
    </Stack>
  );
}
