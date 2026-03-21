"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import { useProContext, MAX_FREE_TRIES } from "@/lib/pro-context";
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Slide from "@mui/material/Slide";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import { MarketChat } from "@/components/MarketChat";
import { ProPaywallModal } from "@/components/ProPaywallModal";

export function FloatingChat() {
  const theme = useTheme();
  const { t } = useLocale();
  const isDark = theme.palette.mode === "dark";
  const pathname = usePathname();
  const { isPro, user, chatTries, consumeChatTry } = useProContext();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  // Locked when: logged-in non-Pro, or guest who has used their free try
  const isLocked = !isPro && (!!user || chatTries >= MAX_FREE_TRIES);

  const handleLockedAttempt = useCallback((): boolean => {
    if (isPro) return false;
    if (user) {
      setPaywallOpen(true);
      return true;
    }
    // guest: try to consume free try
    const allowed = consumeChatTry();
    if (allowed) return false;
    setPaywallOpen(true);
    return true;
  }, [isPro, user, consumeChatTry]);

  const isIntelligentPage = pathname.startsWith("/intelligent");
  if (isIntelligentPage) return null;

  if (!mounted) return null;

  return (
    <>
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
            right: { xs: 12, sm: 16 },
            left: { xs: 12, sm: "auto" },
            width: { xs: "calc(100vw - 24px)", sm: 400 },
            maxHeight: "min(560px, calc(100vh - 140px))",
            zIndex: 1300,
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: isDark
              ? "0 16px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(129,140,248,0.15)"
              : "0 16px 64px rgba(0,0,0,0.15), 0 0 0 1px rgba(99,102,241,0.1)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1,
            }}
          >
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{
                color: "text.secondary",
                bgcolor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.06)",
                "&:hover": { color: "text.primary", bgcolor: isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.1)" },
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
              sharp
              placeholder={t("chat.placeholderStocks")}
              locked={isLocked}
              onLockedAttempt={handleLockedAttempt}
            />
          </Box>
        </Box>
      </Slide>

      <Fab
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          position: "fixed",
          bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          right: { xs: 16, sm: 20 },
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

      <ProPaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        initialMode={user ? "pro" : "login"}
        reason="chat"
      />
    </>
  );
}
