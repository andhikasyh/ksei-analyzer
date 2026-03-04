"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Slide from "@mui/material/Slide";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import { MarketChat } from "@/components/MarketChat";

export function FloatingChat() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isIntelligentPage = pathname.startsWith("/intelligent");
  if (isIntelligentPage) return null;

  if (!mounted) return null;

  return (
    <>
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            bottom: 80,
            right: 16,
            width: { xs: "calc(100vw - 32px)", sm: 400 },
            maxHeight: "min(560px, calc(100vh - 120px))",
            zIndex: 1300,
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: isDark
              ? "0 16px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(129,140,248,0.15)"
              : "0 16px 64px rgba(0,0,0,0.15), 0 0 0 1px rgba(99,102,241,0.1)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1,
              bgcolor: isDark
                ? "rgba(129,140,248,0.1)"
                : "rgba(99,102,241,0.06)",
              borderBottom: 1,
              borderColor: isDark
                ? "rgba(129,140,248,0.12)"
                : "rgba(99,102,241,0.08)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AutoAwesomeIcon
                sx={{ fontSize: 16, color: "#818cf8" }}
              />
              <Typography
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 700,
                  fontSize: "0.82rem",
                }}
              >
                Market Assistant
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <Box
            sx={{
              bgcolor: isDark
                ? theme.palette.background.paper
                : theme.palette.background.paper,
            }}
          >
            <MarketChat
              compact
              placeholder="Ask about Indonesian stocks..."
            />
          </Box>
        </Box>
      </Slide>

      <Fab
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 1300,
          width: 48,
          height: 48,
          bgcolor: isDark
            ? "rgba(129,140,248,0.2)"
            : "rgba(99,102,241,0.15)",
          color: "#818cf8",
          border: 1,
          borderColor: isDark
            ? "rgba(129,140,248,0.25)"
            : "rgba(99,102,241,0.2)",
          boxShadow: isDark
            ? "0 4px 24px rgba(129,140,248,0.2)"
            : "0 4px 24px rgba(99,102,241,0.15)",
          backdropFilter: "blur(12px)",
          transition: "all 0.25s ease",
          "&:hover": {
            bgcolor: isDark
              ? "rgba(129,140,248,0.3)"
              : "rgba(99,102,241,0.22)",
            boxShadow: isDark
              ? "0 6px 32px rgba(129,140,248,0.3)"
              : "0 6px 32px rgba(99,102,241,0.2)",
            transform: "scale(1.05)",
          },
        }}
      >
        {open ? (
          <CloseIcon sx={{ fontSize: 20 }} />
        ) : (
          <AutoAwesomeIcon sx={{ fontSize: 20 }} />
        )}
      </Fab>
    </>
  );
}
