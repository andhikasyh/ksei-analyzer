"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import NewspaperIcon from "@mui/icons-material/Newspaper";

interface StockNewsItem {
  id: number;
  stock_code: string;
  headline: string;
  source: string;
  url: string;
  published_at: string | null;
  scraped_at: string;
}

interface StockNewsPanelProps {
  stockCode?: string;
  stockCodes?: string[];
  title?: string;
}

export function StockNewsPanel({ stockCode, stockCodes, title }: StockNewsPanelProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [items, setItems] = useState<StockNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        let url: string;
        if (stockCodes && stockCodes.length > 0) {
          url = `/api/stock-news?codes=${stockCodes.join(",")}`;
        } else if (stockCode) {
          url = `/api/stock-news?code=${stockCode}`;
        } else {
          setLoading(false);
          return;
        }

        const res = await fetch(url);
        const data = await res.json();
        if (data.items) {
          setItems(data.items);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, [stockCode, stockCodes]);

  const bodyColor = isDark ? "rgba(225,230,240,0.88)" : "rgba(12,18,34,0.78)";
  const mutedColor = isDark ? "rgba(200,210,225,0.65)" : "rgba(12,18,34,0.55)";

  if (loading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Box key={i}>
              <Skeleton width="80%" height={20} />
              <Skeleton width="40%" height={14} sx={{ mt: 0.5 }} />
            </Box>
          ))}
        </Stack>
      </Paper>
    );
  }

  if (items.length === 0) {
    return (
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          textAlign: "center",
          border: `1px dashed ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        <NewspaperIcon sx={{ fontSize: 36, color: isDark ? "rgba(129,140,248,0.2)" : "rgba(99,102,241,0.15)", mb: 1 }} />
        <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "0.95rem", mb: 0.5 }}>
          No recent news
        </Typography>
        <Typography sx={{ color: mutedColor, fontSize: "0.85rem", fontFamily: '"Plus Jakarta Sans", sans-serif', maxWidth: 360, mx: "auto" }}>
          No news articles found for {stockCode || "these stocks"} in recent weeks.
          News is scraped daily after market close.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
      {title && (
        <Box sx={{ px: 3, pt: 2.5, pb: 0.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 3, height: 20, borderRadius: 2,
              background: `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.primary.light}55)`,
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.01em" }}>
            {title}
          </Typography>
        </Box>
      )}
      <Stack>
        {items.map((item, i) => {
          const dateLabel = item.published_at
            ? new Date(item.published_at + "T00:00:00").toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : null;

          return (
            <Box
              key={item.id}
              component={item.url ? "a" : "div"}
              {...(item.url ? { href: item.url, target: "_blank", rel: "noopener noreferrer" } : {})}
              sx={{
                display: "block",
                px: 3,
                py: 2,
                textDecoration: "none",
                color: "inherit",
                borderBottom: i < items.length - 1 ? 1 : 0,
                borderColor: isDark ? "rgba(107,127,163,0.06)" : "rgba(12,18,34,0.04)",
                transition: "background-color 0.15s ease",
                "&:hover": {
                  bgcolor: isDark ? "rgba(212,168,67,0.04)" : "rgba(161,124,47,0.02)",
                  "& .news-headline": { color: theme.palette.primary.main },
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    className="news-headline"
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      lineHeight: 1.5,
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      mb: 0.5,
                      color: "text.primary",
                      transition: "color 0.15s ease",
                    }}
                  >
                    {item.headline}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    {item.source && (
                      <Typography sx={{ color: mutedColor, fontSize: "0.75rem", fontStyle: "italic" }}>
                        {item.source}
                      </Typography>
                    )}
                    {dateLabel && (
                      <Typography sx={{ color: mutedColor, fontSize: "0.72rem", fontFamily: '"JetBrains Mono", monospace' }}>
                        {dateLabel}
                      </Typography>
                    )}
                    {stockCodes && stockCodes.length > 1 && (
                      <Chip
                        label={item.stock_code}
                        size="small"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          fontSize: "0.62rem",
                          height: 20,
                          bgcolor: isDark ? "rgba(212,168,67,0.08)" : "rgba(161,124,47,0.06)",
                          color: "primary.main",
                        }}
                      />
                    )}
                  </Box>
                </Box>
                {item.url && (
                  <OpenInNewIcon sx={{ fontSize: 14, color: mutedColor, mt: 0.5, flexShrink: 0, opacity: 0.5 }} />
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
