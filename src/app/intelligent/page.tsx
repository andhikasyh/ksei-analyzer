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
import Button from "@mui/material/Button";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockIcon from "@mui/icons-material/Lock";
import { SentimentChip } from "@/components/ReportDashboard";
import { MarketChat } from "@/components/MarketChat";
import { ProPaywallModal } from "@/components/ProPaywallModal";
import { useProContext, FREE_INSIGHT_KEY, MAX_FREE_TRIES } from "@/lib/pro-context";
import type { MarketIntelligenceListItem } from "@/lib/types";

function ReportCard({
  item,
  onLocked,
}: {
  item: MarketIntelligenceListItem;
  onLocked: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const { isPro, user, consumeInsightTry, insightTries } = useProContext();

  const dateLabel = new Date(item.report_date + "T00:00:00").toLocaleDateString(
    "en-GB",
    { weekday: "short", day: "2-digit", month: "short", year: "numeric" }
  );

  const handleClick = useCallback(() => {
    if (isPro) {
      router.push(`/intelligent/${item.report_date}`);
      return;
    }
    if (!user && insightTries < MAX_FREE_TRIES) {
      const ok = consumeInsightTry();
      if (ok) {
        router.push(`/intelligent/${item.report_date}`);
        return;
      }
    }
    if (user && !isPro) {
      onLocked();
      return;
    }
    onLocked();
  }, [isPro, user, insightTries, consumeInsightTry, item.report_date, router, onLocked]);

  const isLocked = !isPro && (user !== null || insightTries >= MAX_FREE_TRIES);

  return (
    <Paper
      onClick={handleClick}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
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
              filter: isLocked ? "blur(3px) brightness(0.7)" : "none",
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

        {isLocked && (
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: "8px",
              bgcolor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LockIcon sx={{ fontSize: 14, color: isDark ? "#d4a843" : "#c49a3a" }} />
          </Box>
        )}
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
            filter: isLocked ? "blur(3px)" : "none",
            userSelect: isLocked ? "none" : "auto",
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
            filter: isLocked ? "blur(4px)" : "none",
            userSelect: isLocked ? "none" : "auto",
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
          {isLocked ? (
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.65rem",
                fontWeight: 600,
                color: isDark ? "#d4a843" : "#a17c2f",
              }}
            >
              Pro members only — Aktifkan untuk baca
            </Typography>
          ) : (
            <>
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
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

export default function IntelligentPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { user, isPro, loading: proLoading, insightTries, chatTries, consumeChatTry } = useProContext();
  const [reports, setReports] = useState<MarketIntelligenceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallMode, setPaywallMode] = useState<"login" | "pro">("login");

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

  const handleLockedClick = useCallback(() => {
    if (!user) {
      setPaywallMode("login");
    } else {
      setPaywallMode("pro");
    }
    setPaywallOpen(true);
  }, [user]);

  const chatLocked = !isPro && (user !== null || chatTries >= 1);
  const handleChatAttempt = useCallback(() => {
    if (isPro) return false;
    if (!user && chatTries < 1) {
      const ok = consumeChatTry();
      return !ok;
    }
    setPaywallMode(user ? "pro" : "login");
    setPaywallOpen(true);
    return true;
  }, [isPro, user, chatTries, consumeChatTry]);

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
            component="h1"
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
            Simple to read, full insight. Daily reports that explain what moved
            and why—in plain language, updated every trading day.
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.6rem",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              opacity: 0.85,
              display: "block",
              mt: 0.25,
            }}
          >
            Untuk investor Indonesia: analisis harian yang simpel dan mendalam,
            bahasa mudah dipahami.
          </Typography>
        </Box>
      </Box>

      {!proLoading && !isPro && (
        <Box
          className="animate-in"
          sx={{
            p: 2,
            borderRadius: 2.5,
            background: isDark
              ? "linear-gradient(135deg, rgba(212,168,67,0.06) 0%, rgba(129,140,248,0.05) 100%)"
              : "linear-gradient(135deg, rgba(161,124,47,0.05) 0%, rgba(129,140,248,0.04) 100%)",
            border: `1px solid ${isDark ? "rgba(212,168,67,0.15)" : "rgba(161,124,47,0.12)"}`,
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography
              sx={{
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 700,
                fontSize: "0.88rem",
                letterSpacing: "-0.01em",
                mb: 0.25,
              }}
            >
              {user ? "Aktifkan Pro untuk akses penuh" : "Coba gratis 1 laporan"}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.72rem",
                color: "text.secondary",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                lineHeight: 1.4,
              }}
            >
              {user
                ? "Dapatkan semua laporan harian + AI Chat tanpa batas + newsletter"
                : `${MAX_FREE_TRIES - insightTries} dari ${MAX_FREE_TRIES} laporan gratis tersisa. Daftar Pro untuk akses penuh.`}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setPaywallMode(user ? "pro" : "login");
              setPaywallOpen(true);
            }}
            sx={{
              background: isDark
                ? "linear-gradient(135deg, #d4a843, #e8c468)"
                : "linear-gradient(135deg, #a17c2f, #c49a3a)",
              color: "#060a14",
              fontWeight: 700,
              fontSize: "0.75rem",
              borderRadius: "10px",
              px: 2,
              py: 0.75,
              boxShadow: "none",
              fontFamily: '"Outfit", sans-serif',
              "&:hover": {
                boxShadow: isDark
                  ? "0 4px 16px rgba(212,168,67,0.25)"
                  : "0 4px 16px rgba(161,124,47,0.2)",
              },
            }}
          >
            {user ? "Pro — Rp99.000/bln" : "Mulai Gratis"}
          </Button>
        </Box>
      )}

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
              mb: 0.5,
            }}
          >
            Reports are updated every trading day after the
            market closes. Check back after 5 PM WIB.
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: isDark ? "rgba(220,225,235,0.55)" : "rgba(12,18,34,0.5)",
              fontSize: "0.7rem",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              display: "block",
            }}
          >
            Laporan diperbarui tiap hari bursa setelah pasar tutup. Cek lagi
            setelah jam 17:00 WIB.
          </Typography>
        </Paper>
      ) : (
        <>
          <Typography
            component="p"
            variant="body2"
            sx={{
              color: isDark ? "rgba(220,225,235,0.7)" : "rgba(12,18,34,0.6)",
              fontSize: "0.8rem",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              mb: 0.5,
              maxWidth: 520,
            }}
            className="animate-in animate-in-delay-1"
          >
            Full analysis in plain language: what moved, why it moved, and what
            to watch next. Pick a date to read the full report.
          </Typography>
          <Typography
            component="p"
            variant="caption"
            sx={{
              color: isDark ? "rgba(220,225,235,0.55)" : "rgba(12,18,34,0.5)",
              fontSize: "0.7rem",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              mb: 1.5,
              maxWidth: 520,
            }}
            className="animate-in animate-in-delay-1"
          >
            Analisis lengkap bahasa sederhana: apa yang bergerak, mengapa, dan
            yang perlu diperhatikan. Pilih tanggal untuk baca laporan penuh.
          </Typography>
          <Grid container spacing={2} className="animate-in animate-in-delay-1">
          {reports.map((item) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={item.id}>
              <ReportCard item={item} onLocked={handleLockedClick} />
            </Grid>
          ))}
          </Grid>
        </>
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
              Get detailed answers about Indonesian stocks and the market
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.6rem",
                opacity: 0.6,
                display: "block",
                mt: 0.25,
              }}
            >
              Tanya apa saja tentang saham dan pasar Indonesia—dapat jawaban
              mendalam.
            </Typography>
          </Box>
        </Box>
        <MarketChat
          placeholder="Ask about Indonesian stocks or tanya dalam Bahasa Indonesia..."
          locked={chatLocked}
          onLockedAttempt={handleChatAttempt}
        />
      </Box>

      <ProPaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        initialMode={paywallMode}
        reason="insight"
      />
    </Stack>
  );
}
