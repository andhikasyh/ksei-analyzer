"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import Fab from "@mui/material/Fab";
import Zoom from "@mui/material/Zoom";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const SCROLL_THRESHOLD = 400;

export function BackToTop() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setVisible(typeof window !== "undefined" && window.scrollY > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <Zoom in={visible}>
      <Fab
        onClick={scrollToTop}
        aria-label="Back to top"
        size="small"
        sx={{
          position: "fixed",
          bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
          right: { xs: 16, sm: 20 },
          zIndex: 1298,
          width: 40,
          height: 40,
          bgcolor: isDark
            ? "rgba(212,168,67,0.15)"
            : "rgba(161,124,47,0.12)",
          color: isDark ? "#c9a227" : "#c9a227",
          border: 1,
          borderColor: isDark
            ? "rgba(212,168,67,0.25)"
            : "rgba(161,124,47,0.2)",
          boxShadow: isDark
            ? "0 4px 20px rgba(212,168,67,0.2)"
            : "0 4px 20px rgba(161,124,47,0.15)",
          backdropFilter: "blur(12px)",
          transition: "all 0.25s ease",
          "&:hover": {
            bgcolor: isDark
              ? "rgba(212,168,67,0.25)"
              : "rgba(161,124,47,0.2)",
            boxShadow: isDark
              ? "0 6px 28px rgba(212,168,67,0.3)"
              : "0 6px 28px rgba(161,124,47,0.25)",
            transform: "translateY(-2px)",
          },
        }}
      >
        <KeyboardArrowUpIcon sx={{ fontSize: 22 }} />
      </Fab>
    </Zoom>
  );
}
